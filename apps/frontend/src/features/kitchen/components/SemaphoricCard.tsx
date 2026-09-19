import React from 'react';
import { urgencyFromHours } from '../../../shared/components/urgency.js';
import styles from './SemaphoricCard.module.css';

export interface AlertItem {
  id: string;
  ingredientName: string;
  lotNumber: string;
  hoursRemaining: number;
  quantity: string;
  unit: string;
}

interface SemaphoricCardProps {
  alert: AlertItem;
  onAction?: (id: string, action: 'consume' | 'discard') => void;
}

/**
 * TK-149-FE: la severidad sale de `urgency.ts`, la única fuente de verdad FEFO que ya
 * usan la barra de salud, el panel Estado y los chips de fila. Antes esta tarjeta tenía
 * su propia escala (`<6h` crítico, `<24h` advertencia), que contradecía al resto y no
 * distinguía un remanente vencido.
 */

interface AlertActionButtonsProps {
  alert: AlertItem;
  onAction: (id: string, action: 'consume' | 'discard') => void;
}

const AlertActionButtons: React.FC<AlertActionButtonsProps & { isExpired: boolean }> = ({ alert, isExpired, onAction }) => (
  <div className={styles['semaphoric-actions']}>
    {/* US-040 / INV-5: un remanente vencido solo se descarta; el backend rechaza su consumo (TK-155). */}
    {isExpired ? null : (
    <button
      onClick={() => onAction(alert.id, 'consume')}
      aria-label={`Consumir ${alert.ingredientName}`}
      className={`${styles['semaphoric-action-btn']} ${styles['semaphoric-action-btn--consume']}`}
    >
      Consumir
    </button>
    )}
    <button
      onClick={() => onAction(alert.id, 'discard')}
      aria-label={`Descartar ${alert.ingredientName}`}
      className={`${styles['semaphoric-action-btn']} ${styles['semaphoric-action-btn--discard']}`}
    >
      Descartar
    </button>
  </div>
);

export const SemaphoricCard: React.FC<SemaphoricCardProps> = ({ alert, onAction }) => {
  const severity = urgencyFromHours(alert.hoursRemaining);
  const isExpired = severity.level === 'expired';

  return (
    <article
      data-testid={`semaphoric-card-${alert.id}`}
      className={`${styles['semaphoric-card']} ${styles[`severity-${severity.level}`]}`}
    >
      <div className={styles['semaphoric-header']}>
        <h4 className={styles['semaphoric-title']}>
          {alert.ingredientName}
        </h4>
        <span className={styles['severity-badge']}>
          {severity.label}
        </span>
      </div>

      <div className={styles['semaphoric-meta']}>
        <span>Lote: <strong>{alert.lotNumber}</strong></span> •
        <span> Cantidad: <strong>{alert.quantity} {alert.unit}</strong></span>
      </div>

      <div className={styles['semaphoric-footer']}>
        {/* Texto siempre en --text-primary (no en el tono del tier): a este tamaño/peso ningún tono de acento
            alcanza el 7:1 exigido para "números principales" por el Design System v2.0.0; la urgencia ya la
            comunican el borde izquierdo y el badge (uso no-textual, ≥3:1). */}
        <span className={styles['semaphoric-time']}>
          {isExpired ? `Venció hace ${Math.abs(alert.hoursRemaining)}h` : `⏳ Vence en ${alert.hoursRemaining}h`}
        </span>

        {onAction && <AlertActionButtons alert={alert} isExpired={isExpired} onAction={onAction} />}
      </div>
    </article>
  );
};
