import React from 'react';

/**
 * Puntos de progreso del teclado de PIN, compartidos por el login y la recuperación (TK-180-FE).
 * El vacío es hueco y el lleno relleno (`styles/components/pin.css`), para no depender solo del
 * color; el progreso se anuncia a lectores de pantalla.
 */
export const PinDots: React.FC<{ length: number }> = ({ length }) => (
  <div className="pin-dots-bar" role="img" aria-label={`${length} ${length === 1 ? 'dígito introducido' : 'dígitos introducidos'}`}>
    {Array.from({ length: Math.max(4, length) }).map((_, idx) => (
      <div key={idx} className={`pin-dot-indicator ${idx < length ? 'active' : ''}`} />
    ))}
  </div>
);
