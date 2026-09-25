import { useEffect, useState } from 'react';
import { kitchenQueue } from './kitchenQueue.js';
import type { QueuedOperation } from './types.js';

/**
 * TK-160-FE / US-044: estado actual de la cola para pintarlo.
 *
 * Relee al montar, al recuperar la red y al volver la pestaña al primer plano, que es
 * cuando el operario mira. No sondea en bucle: la cola sólo cambia por una acción suya
 * o por una reconexión, y un intervalo despertaría el dispositivo sin necesidad.
 */
export function useQueuedOperations(): QueuedOperation[] {
  const [operations, setOperations] = useState<QueuedOperation[]>([]);

  useEffect(() => {
    let vivo = true;
    const releer = (): void => {
      void kitchenQueue.list().then((list) => {
        if (vivo) setOperations(list);
      });
    };

    releer();
    window.addEventListener('online', releer);
    window.addEventListener('focus', releer);
    return () => {
      vivo = false;
      window.removeEventListener('online', releer);
      window.removeEventListener('focus', releer);
    };
  }, []);

  return operations;
}
