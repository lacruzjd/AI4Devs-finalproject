import styles from './QueuedOperationsPanel.module.css';
import type { QueuedOperation, QueuedStatus } from '../../../shared/offline/types.js';

/**
 * TK-160-FE / US-044: qué operaciones quedaron pendientes, cuáles se aplicaron con
 * varianza y cuáles rechazó el servidor.
 *
 * Existe porque una cola silenciosa traslada el problema del sistema a la memoria del
 * operario: si nadie le dice que su registro no llegó, lo da por hecho.
 */
const ETIQUETA: Record<QueuedStatus, string> = {
  pendiente: 'Pendiente de enviar',
  aplicada: 'Aplicada',
  'aplicada-con-varianza': 'Aplicada con varianza',
  rechazada: 'Rechazada',
};

export interface QueuedOperationsPanelProps {
  operations: QueuedOperation[];
}

export function QueuedOperationsPanel({ operations }: QueuedOperationsPanelProps): JSX.Element | null {
  // Lo ya aplicado sin incidencia no necesita atención: ocuparía alto sin decir nada.
  const visibles = operations.filter((o) => o.status !== 'aplicada');
  if (visibles.length === 0) return null;

  return (
    <section className={styles.panel} aria-label="Operaciones sin sincronizar">
      <p className={styles.title}>Registros de este turno</p>
      <ul className={styles.list}>
        {visibles.map((operation) => (
          <li key={operation.id} className={styles.item}>
            <span className={styles.state}>{ETIQUETA[operation.status]}</span>
            <span className={styles.detail}>
              {operation.kind === 'consume' ? `consumo de ${operation.quantity ?? ''}` : 'descarte'}
            </span>
            {operation.detail && <span className={styles.detail}>{operation.detail}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
