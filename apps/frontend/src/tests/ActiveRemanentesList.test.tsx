import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActiveRemanentesList } from '../features/kitchen/components/ActiveRemanentesList';
import type { RemanenteFEFOItem } from '../features/kitchen/services/kitchen.service';

function remanente(overrides: Partial<RemanenteFEFOItem> = {}): RemanenteFEFOItem {
  return {
    id: 'rem-1',
    insumoId: 'ins-1',
    insumoName: 'Salsa de tomate',
    unitOfMeasure: 'KG',
    currentQuantity: '1.000',
    initialQuantity: '2.000',
    location: 'KITCHEN_FRIDGE',
    expirationDate: new Date().toISOString(),
    hoursRemaining: 10,
    ...overrides,
  } as RemanenteFEFOItem;
}

describe('US-040/TK-155-FE: acciones según el vencimiento', () => {
  it('un remanente vencido solo ofrece descartar', () => {
    render(
      <ActiveRemanentesList
        items={[remanente({ id: 'rem-vencido', hoursRemaining: -3 })]}
        onRequestConsume={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByText('Vencido')).toBeInTheDocument();
    expect(screen.getByTitle('Registrar Descarte de Merma')).toBeInTheDocument();
    expect(document.getElementById('btn-consume-025-rem-vencido')).toBeNull();
    expect(document.getElementById('btn-consume-100-rem-vencido')).toBeNull();
  });

  it('un remanente que caduca hoy mantiene consumir y descartar', () => {
    render(
      <ActiveRemanentesList
        items={[remanente({ id: 'rem-hoy', hoursRemaining: 5 })]}
        onRequestConsume={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByText('Hoy')).toBeInTheDocument();
    expect(document.getElementById('btn-consume-100-rem-hoy')).not.toBeNull();
    expect(screen.getByTitle('Registrar Descarte de Merma')).toBeInTheDocument();
  });
});
