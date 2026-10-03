import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResetPinModal } from './ResetPinModal.js';
import { AuthService } from '../services/auth.service.js';

const TOKEN = 'a'.repeat(64);

function renderModal() {
  const onSuccess = vi.fn();
  render(<ResetPinModal token={TOKEN} isOpen onSuccess={onSuccess} onCancel={vi.fn()} />);
  return { onSuccess };
}

function pressDigits(pin: string) {
  for (const digit of pin) fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${digit}$`) }));
}

/**
 * TK-180-FE: en la verificación real de TK-179 el administrador pulsó «Confirmar» sin haber
 * repetido el PIN. Nada le indicaba que debía hacerlo ni por qué el botón no respondía.
 */
describe('TK-180-FE: ResetPinModal deja claro el paso de confirmación', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Escenario 1: anuncia el paso 1 y, tras «Continuar», que hay que repetir el PIN', () => {
    renderModal();
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Paso 1 de 2: elija su nuevo PIN');

    pressDigits('2468');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.getByRole('status')).toHaveTextContent('Paso 2 de 2: repita el mismo PIN para confirmarlo');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('Escenario 2: el botón desactivado explica que faltan dígitos y la pista desaparece al completarlos', () => {
    renderModal();
    pressDigits('2468');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    const confirm = screen.getByRole('button', { name: /Confirmar y Guardar PIN/ });
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAccessibleDescription('Repita los 4 dígitos de su nuevo PIN.');

    pressDigits('246');
    expect(confirm).toBeDisabled();

    pressDigits('8');
    expect(confirm).toBeEnabled();
    expect(screen.queryByText('Repita los 4 dígitos de su nuevo PIN.')).not.toBeInTheDocument();
  });

  it('AUDIT-DEV-019 D-1: con un PIN de 6 dígitos, la confirmación exige repetir los 6', () => {
    renderModal();
    pressDigits('246813');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    pressDigits('2468');

    const confirm = screen.getByRole('button', { name: /Confirmar y Guardar PIN/ });
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAccessibleDescription('Repita los 6 dígitos de su nuevo PIN.');

    pressDigits('13');
    expect(confirm).toBeEnabled();
  });

  it('Escenario 2: el paso 1 también explica por qué «Continuar» no responde', () => {
    renderModal();
    expect(screen.getByRole('button', { name: 'Continuar' })).toHaveAccessibleDescription('Introduzca al menos 4 dígitos para continuar.');
  });

  it('Escenario 3: el contador de puntos se reinicia al pasar a la confirmación', () => {
    renderModal();
    pressDigits('2468');
    expect(screen.getByRole('img', { name: '4 dígitos introducidos' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByRole('img', { name: '0 dígitos introducidos' })).toBeInTheDocument();
  });

  it('Escenario 4: con el mismo PIN dos veces envía token y PIN, y avisa del éxito', async () => {
    const reset = vi.spyOn(AuthService, 'resetAdminPin').mockResolvedValue({ message: 'ok' });
    renderModal();
    pressDigits('2468');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    pressDigits('2468');
    fireEvent.click(screen.getByRole('button', { name: /Confirmar y Guardar PIN/ }));

    await waitFor(() => expect(reset).toHaveBeenCalledWith(TOKEN, '2468'));
    expect(await screen.findByText('¡PIN restablecido con éxito!')).toBeInTheDocument();
    // AUDIT-DEV-019 D-2: la región de estado anuncia el final, no se queda en «Paso 2 de 2»
    expect(screen.getByRole('status')).toHaveTextContent('PIN restablecido. Redirigiendo al inicio de sesión…');
  });

  it('Escenario 4: con PIN distintos no envía nada y avisa de que no coinciden', () => {
    const reset = vi.spyOn(AuthService, 'resetAdminPin');
    renderModal();
    pressDigits('2468');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    pressDigits('1357');
    fireEvent.click(screen.getByRole('button', { name: /Confirmar y Guardar PIN/ }));

    expect(screen.getByText('Los números de PIN ingresados no coinciden.')).toBeInTheDocument();
    expect(reset).not.toHaveBeenCalled();
  });
});
