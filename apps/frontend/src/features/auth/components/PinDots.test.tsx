import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PinDots } from './PinDots.js';

/**
 * TK-180-FE Escenario 3: el punto vacío era el más llamativo (relleno de tinta) y el estado se
 * distinguía solo por color. Ahora el progreso también se anuncia a lectores de pantalla.
 */
describe('TK-180-FE: PinDots', () => {
  it('dibuja al menos 4 puntos y marca como llenos solo los dígitos introducidos', () => {
    const { container } = render(<PinDots length={2} />);

    const dots = container.querySelectorAll('.pin-dot-indicator');
    expect(dots).toHaveLength(4);
    expect(container.querySelectorAll('.pin-dot-indicator.active')).toHaveLength(2);
  });

  it('crece hasta 6 puntos con PIN más largos', () => {
    const { container } = render(<PinDots length={6} />);

    expect(container.querySelectorAll('.pin-dot-indicator.active')).toHaveLength(6);
  });

  it('anuncia el progreso a lectores de pantalla', () => {
    render(<PinDots length={0} />);
    expect(screen.getByRole('img', { name: '0 dígitos introducidos' })).toBeInTheDocument();
  });

  it('usa el singular con un solo dígito', () => {
    render(<PinDots length={1} />);
    expect(screen.getByRole('img', { name: '1 dígito introducido' })).toBeInTheDocument();
  });
});
