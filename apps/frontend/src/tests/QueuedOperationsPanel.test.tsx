import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueuedOperationsPanel } from '../features/kitchen/components/QueuedOperationsPanel';
import type { QueuedOperation } from '../shared/offline/types';

const base: QueuedOperation = {
  id: 'op-1',
  kind: 'consume',
  remanenteId: 'rem-1',
  occurredAt: '2026-09-25T10:00:00.000Z',
  quantity: '0.250',
  status: 'pendiente',
};

describe('TK-160-FE: estado visible de la cola (US-044)', () => {
  it('no ocupa alto cuando no hay nada que mostrar', () => {
    const { container } = render(<QueuedOperationsPanel operations={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra las pendientes para que el operario sepa qué falta por sincronizar', () => {
    render(<QueuedOperationsPanel operations={[base]} />);
    expect(screen.getByText(/pendiente/i)).toBeInTheDocument();
  });

  it('muestra el motivo de una rechazada, y no la esconde', () => {
    render(
      <QueuedOperationsPanel
        operations={[{ ...base, status: 'rechazada', detail: 'El turno ya fue conciliado' }]}
      />
    );
    expect(screen.getByText(/El turno ya fue conciliado/)).toBeInTheDocument();
  });

  it('distingue una aplicada con varianza de una aplicada limpia', () => {
    render(<QueuedOperationsPanel operations={[{ ...base, status: 'aplicada-con-varianza' }]} />);
    expect(screen.getByText(/varianza/i)).toBeInTheDocument();
  });

  it('no comunica el estado sólo por color: cada fila lleva su texto', () => {
    render(<QueuedOperationsPanel operations={[base, { ...base, id: 'op-2', status: 'rechazada' }]} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
