import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PinLoginModal } from './PinLoginModal.js';

/** AUDIT-DEV-019: el login comparte `PinDots` con la recuperación (TK-180-FE). */
describe('TK-180-FE: el login usa los puntos compartidos', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('anuncia el progreso del PIN al pulsar dígitos', () => {
    render(<PinLoginModal onSuccess={vi.fn()} />);
    expect(screen.getByRole('img', { name: '0 dígitos introducidos' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^7$/ }));

    expect(screen.getByRole('img', { name: '1 dígito introducido' })).toBeInTheDocument();
  });
});
