import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../infrastructure/http/app.js';
import { InMemoryStockRepository } from '../../../infrastructure/stock/repositories/InMemoryStockRepository.js';
import { InMemoryRemanenteQueryRepository } from '../../../infrastructure/kitchen/repositories/InMemoryRemanenteQueryRepository.js';
import { InMemoryConsumptionReasonRepository } from '../../../infrastructure/kitchen/repositories/InMemoryConsumptionReasonRepository.js';
import { InMemoryShiftReconciliationRepository } from '../../../infrastructure/kitchen/repositories/InMemoryShiftReconciliationRepository.js';
import { ShiftReconciliation } from '../../../domain/kitchen/entities/ShiftReconciliation.js';
import { Remanente } from '../../../domain/stock/entities/Remanente.js';
import { DecimalQuantity } from '../../../domain/stock/value-objects/DecimalQuantity.js';

describe('TK-005: Partial Remanente Consumption TDD Suite', () => {
  let stockRepo: InMemoryStockRepository;
  let queryRepo: InMemoryRemanenteQueryRepository;
  let activeRemanente: Remanente;

  beforeEach(() => {
    stockRepo = new InMemoryStockRepository();
    queryRepo = new InMemoryRemanenteQueryRepository();

    activeRemanente = new Remanente({
      id: 'rem-salsa-1',
      insumoId: 'ins-salsa',
      currentQuantity: new DecimalQuantity('1.750'),
      initialQuantity: new DecimalQuantity('1.750'),
      location: 'KITCHEN_FRIDGE',
      status: 'ACTIVE',
      expirationDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
    });

    stockRepo.seedRemanente(activeRemanente);
  });

  it('US-040/TK-155: debe rechazar con 422 el consumo de un remanente vencido, sin alterar su estado', async () => {
    // 1. ARRANGE: remanente vencido hace 2 horas (INV-5, inocuidad alimentaria)
    const expired = new Remanente({
      id: 'rem-vencido-1',
      insumoId: 'ins-salsa',
      currentQuantity: new DecimalQuantity('1.000'),
      initialQuantity: new DecimalQuantity('1.000'),
      location: 'KITCHEN_FRIDGE',
      status: 'ACTIVE',
      expirationDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
    });
    stockRepo.seedRemanente(expired);
    const connectedQueryRepo = new InMemoryRemanenteQueryRepository(stockRepo);
    const app = createApp({ stockRepository: stockRepo, remanenteQueryRepository: connectedQueryRepo, requireAuth: false });

    // 2. ACT
    const response = await request(app)
      .post('/api/v1/kitchen/remanentes/rem-vencido-1/consume')
      .send({ quantity: '0.250', reasonId: 'reason-seed-1' });

    // 3. ASSERT — ORACULO RED: 422 con el sobre RFC 7807 del proyecto
    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ title: 'RemanenteExpiredException', status: 422 });

    // ORACULO ESTADO: el remanente no se tocó
    const untouched = await stockRepo.findRemanenteById('rem-vencido-1');
    expect(untouched?.currentQuantity.toString()).toBe('1.000');
    expect(untouched?.status).toBe('ACTIVE');
  });

  it('US-040/TK-155: un remanente que vence dentro de unas horas sigue siendo consumible', async () => {
    // 1. ARRANGE: el remanente del beforeEach vence en 12 h — "caduca hoy" no es "vencido"
    const connectedQueryRepo = new InMemoryRemanenteQueryRepository(stockRepo);
    const app = createApp({ stockRepository: stockRepo, remanenteQueryRepository: connectedQueryRepo, requireAuth: false });

    // 2. ACT
    const response = await request(app)
      .post('/api/v1/kitchen/remanentes/rem-salsa-1/consume')
      .send({ quantity: '0.250', reasonId: 'reason-seed-1' });

    // 3. ASSERT
    expect(response.status).toBe(200);
  });

  it('debe registrar exitosamente un consumo parcial (1.750 -> 1.500) manteniendo el estado ACTIVE (200 OK)', async () => {
    // 1. ARRANGE
    const connectedQueryRepo = new InMemoryRemanenteQueryRepository(stockRepo);
    const app = createApp({ stockRepository: stockRepo, remanenteQueryRepository: connectedQueryRepo, requireAuth: false }); // test de negocio, no de auth (Guard 15 sigue activo por defecto en createApp)

    // 2. ACT
    const response = await request(app)
      .post('/api/v1/kitchen/remanentes/rem-salsa-1/consume')
      .send({ quantity: '0.250', reasonId: 'reason-seed-1' });

    // 3. ASSERT: Verificación con los 3 Oráculos (Guard 20)
    // ORACULO RED / RESPUESTA: Payload de respuesta HTTP 200 OK
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('consumedQuantity', '0.250');
    expect(response.body).toHaveProperty('remainingQuantity', '1.500');
    expect(response.body).toHaveProperty('status', 'ACTIVE');
    expect(response.body).toHaveProperty('isExhausted', false);

    // ORACULO ESTADO: Persistencia en Write Model (StockRepository)
    const updated = await stockRepo.findRemanenteById('rem-salsa-1');
    expect(updated?.currentQuantity.toString()).toBe('1.500');

    // ORACULO ESTADO & READ MODEL: Sincronización inmediata en el modelo de lectura (GET /remanentes-activos)
    const getResponse = await request(app).get('/api/v1/kitchen/remanentes-activos');
    expect(getResponse.status).toBe(200);
    const activeItem = getResponse.body.find((item: { id: string }) => item.id === 'rem-salsa-1');
    expect(activeItem).toBeDefined();
    expect(activeItem.currentQuantity).toBe('1.500');
  });

  it('debe cambiar automaticamente el estado a EXHAUSTED si la cantidad restante llega a 0 (200 OK)', async () => {
    // Sembrar remanente con 0.250 kg
    const lowRemanente = new Remanente({
      id: 'rem-low-1',
      insumoId: 'ins-salsa',
      currentQuantity: new DecimalQuantity('0.250'),
      initialQuantity: new DecimalQuantity('0.250'),
      location: 'KITCHEN_FRIDGE',
      status: 'ACTIVE',
      expirationDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
    });
    stockRepo.seedRemanente(lowRemanente);

    const app = createApp({ stockRepository: stockRepo, remanenteQueryRepository: queryRepo, requireAuth: false }); // test de negocio, no de auth (Guard 15 sigue activo por defecto en createApp)
    const response = await request(app)
      .post('/api/v1/kitchen/remanentes/rem-low-1/consume')
      .send({ quantity: '0.250', reasonId: 'reason-seed-1' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('consumedQuantity', '0.250');
    expect(response.body).toHaveProperty('remainingQuantity', '0.000');
    expect(response.body).toHaveProperty('status', 'EXHAUSTED');
    expect(response.body).toHaveProperty('isExhausted', true);

    const updated = await stockRepo.findRemanenteById('rem-low-1');
    expect(updated?.status).toBe('EXHAUSTED');
  });

  it('debe rechazar con 422 Unprocessable Entity si se intenta consumir una cantidad mayor a la disponible', async () => {
    const app = createApp({ stockRepository: stockRepo, remanenteQueryRepository: queryRepo, requireAuth: false }); // test de negocio, no de auth (Guard 15 sigue activo por defecto en createApp)
    const response = await request(app)
      .post('/api/v1/kitchen/remanentes/rem-salsa-1/consume')
      .send({ quantity: '5.000', reasonId: 'reason-seed-1' });

    expect(response.status).toBe(422);
    expect(response.body).toHaveProperty('error', 'ExcessConsumptionException');
    expect(response.body.message).toMatch(/No es posible consumir/);

    // Garantizar que la cantidad del remanente NO cambio
    const updated = await stockRepo.findRemanenteById('rem-salsa-1');
    expect(updated?.currentQuantity.toString()).toBe('1.750');
  });

  // ADR-004 / US-004 / TK-108: motivo estructurado obligatorio.
  describe('TK-108: motivo de consumo obligatorio (ADR-004)', () => {
    it('sin reasonId -> 400, sin mutar el remanente ni registrar movimiento', async () => {
      const app = createApp({ stockRepository: stockRepo, remanenteQueryRepository: queryRepo, requireAuth: false });
      const response = await request(app)
        .post('/api/v1/kitchen/remanentes/rem-salsa-1/consume')
        .send({ quantity: '0.250' });

      expect(response.status).toBe(400);
      const updated = await stockRepo.findRemanenteById('rem-salsa-1');
      expect(updated?.currentQuantity.toString()).toBe('1.750');
      expect(stockRepo.movements).toHaveLength(0);
    });

    it('reasonId inexistente -> 404, sin mutar el remanente', async () => {
      const app = createApp({ stockRepository: stockRepo, remanenteQueryRepository: queryRepo, requireAuth: false });
      const response = await request(app)
        .post('/api/v1/kitchen/remanentes/rem-salsa-1/consume')
        .send({ quantity: '0.250', reasonId: 'reason-does-not-exist' });

      expect(response.status).toBe(404);
      const updated = await stockRepo.findRemanenteById('rem-salsa-1');
      expect(updated?.currentQuantity.toString()).toBe('1.750');
      expect(stockRepo.movements).toHaveLength(0);
    });

    it('reasonId de un motivo desactivado -> 400, sin mutar el remanente', async () => {
      const reasonRepo = new InMemoryConsumptionReasonRepository();
      const inactiveReason = (await reasonRepo.findById('reason-seed-2'))!;
      inactiveReason.deactivate();
      await reasonRepo.save(inactiveReason);

      const app = createApp({
        stockRepository: stockRepo,
        remanenteQueryRepository: queryRepo,
        consumptionReasonRepository: reasonRepo,
        requireAuth: false,
      });
      const response = await request(app)
        .post('/api/v1/kitchen/remanentes/rem-salsa-1/consume')
        .send({ quantity: '0.250', reasonId: 'reason-seed-2' });

      expect(response.status).toBe(400);
      const updated = await stockRepo.findRemanenteById('rem-salsa-1');
      expect(updated?.currentQuantity.toString()).toBe('1.750');
      expect(stockRepo.movements).toHaveLength(0);
    });

    it('consumo exitoso deja reasonId + notes (texto libre opcional) en el movimiento registrado', async () => {
      const app = createApp({ stockRepository: stockRepo, remanenteQueryRepository: queryRepo, requireAuth: false });
      const response = await request(app)
        .post('/api/v1/kitchen/remanentes/rem-salsa-1/consume')
        .send({ quantity: '0.250', reasonId: 'reason-seed-1', notes: 'Se sirvió de más en la mesa 4' });

      expect(response.status).toBe(200);
      expect(stockRepo.movements).toHaveLength(1);
      expect(stockRepo.movements[0]).toMatchObject({
        type: 'CONSUMPTION',
        reasonId: 'reason-seed-1',
        reason: 'Se sirvió de más en la mesa 4',
      });
    });

    it('consumo exitoso SIN notes deja el movimiento con reasonId y reason (notes) undefined', async () => {
      const app = createApp({ stockRepository: stockRepo, remanenteQueryRepository: queryRepo, requireAuth: false });
      const response = await request(app)
        .post('/api/v1/kitchen/remanentes/rem-salsa-1/consume')
        .send({ quantity: '0.250', reasonId: 'reason-seed-1' });

      expect(response.status).toBe(200);
      expect(stockRepo.movements[0].reasonId).toBe('reason-seed-1');
      expect(stockRepo.movements[0].reason).toBeUndefined();
    });
  });
  // ---------------------------------------------------------------------------
  // TK-159 / US-044 / ADR-009: idempotencia y momento real de las operaciones
  // encoladas sin conexion. Reintentar una sincronizacion es comportamiento normal
  // de una cola, no un caso raro.
  // ---------------------------------------------------------------------------

  it('TK-159: reenviar la misma clave de idempotencia no vuelve a descontar', async () => {
    // 1. ARRANGE
    const connectedQueryRepo = new InMemoryRemanenteQueryRepository(stockRepo);
    const app = createApp({ stockRepository: stockRepo, remanenteQueryRepository: connectedQueryRepo, requireAuth: false });
    const body = { quantity: '0.250', reasonId: 'reason-seed-1', operationId: 'op-cola-1' };

    // 2. ACT: la cola sincroniza y el reintento reenvia la misma operacion
    const first = await request(app).post('/api/v1/kitchen/remanentes/rem-salsa-1/consume').send(body);
    const retry = await request(app).post('/api/v1/kitchen/remanentes/rem-salsa-1/consume').send(body);

    // 3. ASSERT — ORACULO ESTADO: se descuenta una sola vez
    expect(first.status).toBe(200);
    expect(retry.status).toBe(200);
    const remanente = await stockRepo.findRemanenteById('rem-salsa-1');
    expect(remanente?.currentQuantity.toString()).toBe('1.500');

    // ORACULO RESPUESTA: el reintento devuelve lo mismo que la primera vez
    expect(retry.body.remainingQuantity).toBe(first.body.remainingQuantity);

    // ORACULO LEDGER: un unico movimiento con esa clave
    expect(stockRepo.movements.filter((m) => m.operationId === 'op-cola-1')).toHaveLength(1);
  });

  it('TK-159: el movimiento conserva el momento real en que ocurrio en cocina', async () => {
    // 1. ARRANGE: la operacion ocurrio hace dos horas y se sincroniza ahora
    const connectedQueryRepo = new InMemoryRemanenteQueryRepository(stockRepo);
    const app = createApp({ stockRepository: stockRepo, remanenteQueryRepository: connectedQueryRepo, requireAuth: false });
    const occurredAt = new Date(Date.now() - 2 * 60 * 60 * 1000);

    // 2. ACT
    const response = await request(app)
      .post('/api/v1/kitchen/remanentes/rem-salsa-1/consume')
      .send({ quantity: '0.250', reasonId: 'reason-seed-1', operationId: 'op-cola-2', occurredAt: occurredAt.toISOString() });

    // 3. ASSERT: el ledger guarda el momento real, no el de recepcion
    expect(response.status).toBe(200);
    const movement = stockRepo.movements.find((m) => m.operationId === 'op-cola-2');
    expect(movement?.occurredAt?.toISOString()).toBe(occurredAt.toISOString());
    expect(movement?.occurredAtAdjusted).toBe(false);
  });

  it('TK-159: un momento imposible se acota y el movimiento queda marcado como corregido', async () => {
    // 1. ARRANGE: el reloj del dispositivo va adelantado un dia
    const connectedQueryRepo = new InMemoryRemanenteQueryRepository(stockRepo);
    const app = createApp({ stockRepository: stockRepo, remanenteQueryRepository: connectedQueryRepo, requireAuth: false });
    const enElFuturo = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 2. ACT
    const response = await request(app)
      .post('/api/v1/kitchen/remanentes/rem-salsa-1/consume')
      .send({ quantity: '0.250', reasonId: 'reason-seed-1', operationId: 'op-cola-3', occurredAt: enElFuturo.toISOString() });

    // 3. ASSERT: se aplica igual, con el momento acotado y constancia de la correccion
    expect(response.status).toBe(200);
    const movement = stockRepo.movements.find((m) => m.operationId === 'op-cola-3');
    expect(movement?.occurredAtAdjusted).toBe(true);
    expect(movement!.occurredAt!.getTime()).toBeLessThanOrEqual(Date.now());
  });
  // ---------------------------------------------------------------------------
  // TK-160 / US-044 / ADR-009: la operacion encolada se acepta siempre. Si bajaria
  // de cero, se acota y la diferencia se registra como varianza con motivo.
  // ---------------------------------------------------------------------------

  it('TK-160: un consumo diferido que excede lo disponible se acota a cero y registra la varianza', async () => {
    // 1. ARRANGE: el remanente tiene 1.750 y la cola trae un consumo de 2.000
    const connectedQueryRepo = new InMemoryRemanenteQueryRepository(stockRepo);
    const app = createApp({ stockRepository: stockRepo, remanenteQueryRepository: connectedQueryRepo, requireAuth: false });

    // 2. ACT
    const response = await request(app)
      .post('/api/v1/kitchen/remanentes/rem-salsa-1/consume')
      .send({ quantity: '2.000', reasonId: 'reason-seed-1', operationId: 'op-exceso-1' });

    // 3. ASSERT — ORACULO INV-1: nunca negativo, se acota a cero
    expect(response.status).toBe(200);
    const remanente = await stockRepo.findRemanenteById('rem-salsa-1');
    expect(remanente?.currentQuantity.toString()).toBe('0.000');
    expect(remanente?.status).toBe('EXHAUSTED');

    // ORACULO LEDGER: el consumo real y la varianza son dos movimientos distinguibles
    const consumo = stockRepo.movements.find((m) => m.operationId === 'op-exceso-1');
    expect(consumo?.quantity).toBe('1.750');
    const varianza = stockRepo.movements.find((m) => m.type === 'DEFERRED_SYNC_VARIANCE');
    expect(varianza?.quantity).toBe('0.250');
    expect(varianza?.reasonId).toBe('reason-seed-1');
  });

  it('TK-160: una operacion cuyo turno ya se concilio se rechaza sin tocar el remanente', async () => {
    // 1. ARRANGE: el turno de la fecha de la operacion ya tiene conciliacion cerrada
    const ocurrio = new Date(Date.now() - 26 * 60 * 60 * 1000); // ayer
    const reconRepo = new InMemoryShiftReconciliationRepository();
    await reconRepo.save(
      new ShiftReconciliation({ id: 'rec-ayer', shiftDate: ocurrio, operatorId: 'op-1', items: [] })
    );
    const connectedQueryRepo = new InMemoryRemanenteQueryRepository(stockRepo);
    const app = createApp({
      stockRepository: stockRepo,
      remanenteQueryRepository: connectedQueryRepo,
      reconciliationRepository: reconRepo,
      requireAuth: false,
    });

    // 2. ACT
    const response = await request(app)
      .post('/api/v1/kitchen/remanentes/rem-salsa-1/consume')
      .send({ quantity: '0.250', reasonId: 'reason-seed-1', operationId: 'op-tarde-1', occurredAt: ocurrio.toISOString() });

    // 3. ASSERT: un cierre firmado no se reabre en silencio
    expect(response.status).toBe(409);
    const untouched = await stockRepo.findRemanenteById('rem-salsa-1');
    expect(untouched?.currentQuantity.toString()).toBe('1.750');
    expect(stockRepo.movements.filter((m) => m.operationId === 'op-tarde-1')).toHaveLength(0);
  });

  it('TK-160: un consumo inmediato que excede sigue rechazandose con 422 (sin regresion)', async () => {
    // 1. ARRANGE: sin operationId no es una operacion diferida
    const connectedQueryRepo = new InMemoryRemanenteQueryRepository(stockRepo);
    const app = createApp({ stockRepository: stockRepo, remanenteQueryRepository: connectedQueryRepo, requireAuth: false });

    // 2. ACT
    const response = await request(app)
      .post('/api/v1/kitchen/remanentes/rem-salsa-1/consume')
      .send({ quantity: '2.000', reasonId: 'reason-seed-1' });

    // 3. ASSERT: la varianza es para lo que ya ocurrio sin red, no para un error en pantalla
    expect(response.status).toBe(422);
    const untouched = await stockRepo.findRemanenteById('rem-salsa-1');
    expect(untouched?.currentQuantity.toString()).toBe('1.750');
  });
});
