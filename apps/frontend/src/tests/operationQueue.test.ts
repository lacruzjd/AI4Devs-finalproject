import { describe, it, expect, vi } from 'vitest';
import { OperationQueue } from '../shared/offline/operationQueue.js';
import { InMemoryQueueStorage } from '../shared/offline/InMemoryQueueStorage.js';
import type { QueuedOperation } from '../shared/offline/types.js';

function nuevaCola(enviar = vi.fn()) {
  const storage = new InMemoryQueueStorage();
  return { storage, enviar, cola: new OperationQueue(storage, enviar) };
}

const consumo = { kind: 'consume' as const, remanenteId: 'rem-1', quantity: '0.250', reasonId: 'motivo-1' };

describe('TK-160-FE: cola local de consumo y descarte (US-044 / ADR-009)', () => {
  it('encola con clave de idempotencia y momento real, y la deja pendiente', async () => {
    const { cola, storage } = nuevaCola();

    const encolada = await cola.enqueue(consumo);

    const guardadas = await storage.list();
    expect(guardadas).toHaveLength(1);
    expect(guardadas[0].status).toBe('pendiente');
    expect(guardadas[0].id).toBe(encolada.id);
    expect(guardadas[0].id.length).toBeGreaterThan(8);
    expect(Date.parse(guardadas[0].occurredAt)).not.toBeNaN();
  });

  it('al sincronizar con éxito la marca aplicada y envía la clave y el momento', async () => {
    const enviar = vi.fn().mockResolvedValue({ ok: true, consumedQuantity: '0.250' });
    const { cola, storage } = nuevaCola(enviar);
    await cola.enqueue(consumo);

    await cola.sync();

    expect(enviar).toHaveBeenCalledTimes(1);
    const enviada = enviar.mock.calls[0][0] as QueuedOperation;
    expect(enviada.id).toBeDefined();
    expect(enviada.occurredAt).toBeDefined();
    const segundaPasada = await cola.sync(); // ya no queda nada pendiente
    expect(segundaPasada).toHaveLength(0);
    expect(await storage.list()).toHaveLength(0);
  });

  it('si el servidor aplicó menos de lo pedido, queda aplicada con varianza', async () => {
    const enviar = vi.fn().mockResolvedValue({ ok: true, consumedQuantity: '0.100' });
    const { cola, storage } = nuevaCola(enviar);
    await cola.enqueue(consumo);

    await cola.sync();

    expect((await storage.list())[0].status).toBe('aplicada-con-varianza');
  });

  it('un rechazo del servidor la marca rechazada con su motivo y no se reintenta', async () => {
    const enviar = vi.fn().mockResolvedValue({ ok: false, rejected: true, detail: 'El turno ya fue conciliado' });
    const { cola, storage } = nuevaCola(enviar);
    await cola.enqueue(consumo);

    await cola.sync();
    await cola.sync();

    expect(enviar).toHaveBeenCalledTimes(1);
    const guardada = (await storage.list())[0];
    expect(guardada.status).toBe('rechazada');
    expect(guardada.detail).toBe('El turno ya fue conciliado');
  });

  it('un fallo de red la deja pendiente para el siguiente intento', async () => {
    const enviar = vi.fn().mockRejectedValue(new Error('sin red'));
    const { cola, storage } = nuevaCola(enviar);
    await cola.enqueue(consumo);

    await cola.sync();

    expect((await storage.list())[0].status).toBe('pendiente');
  });

  it('sincroniza operación a operación y no se detiene porque una quede pendiente', async () => {
    const enviar = vi
      .fn()
      .mockRejectedValueOnce(new Error('sin red'))
      .mockResolvedValueOnce({ ok: true, consumedQuantity: '0.250' });
    const { cola, storage } = nuevaCola(enviar);
    await cola.enqueue(consumo);
    await cola.enqueue({ kind: 'discard', remanenteId: 'rem-2', reason: 'EXPIRATION' });

    await cola.sync();

    // La aplicada se purga; la que quedó sin red sigue en el almacén esperando reintento.
    const estados = (await storage.list()).map((o) => o.status);
    expect(estados).toEqual(['pendiente']);
  });
  it('una operación aplicada limpiamente no se queda en el almacén: el servidor ya la tiene', async () => {
    const enviar = vi.fn().mockResolvedValue({ ok: true, consumedQuantity: '0.250' });
    const { cola, storage } = nuevaCola(enviar);
    await cola.enqueue(consumo);

    await cola.sync();

    expect(await storage.list()).toHaveLength(0);
  });

  it('una aplicada con varianza y una rechazada sí se conservan: exigen atención del operario', async () => {
    const enviar = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, consumedQuantity: '0.100' })
      .mockResolvedValueOnce({ ok: false, rejected: true, detail: 'turno conciliado' });
    const { cola, storage } = nuevaCola(enviar);
    await cola.enqueue(consumo);
    await cola.enqueue({ ...consumo, remanenteId: 'rem-2' });

    await cola.sync();

    const estados = (await storage.list()).map((o) => o.status).sort();
    expect(estados).toEqual(['aplicada-con-varianza', 'rechazada']);
  });
});
