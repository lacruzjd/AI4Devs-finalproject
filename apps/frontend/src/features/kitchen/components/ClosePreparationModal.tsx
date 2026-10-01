import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Modal } from '../../../shared/components/Modal.js';
import { ModalHeader } from '../../../shared/components/ModalHeader.js';
import { ErrorBanner } from '../../../shared/components/ErrorBanner.js';
import { ReconciliationForm } from './closePreparation/ReconciliationForm.js';
import { useClosePreparationDetail, useCloseForm, useSubmitClose } from './closePreparation/useClosePreparation.js';

/*
 * Cierre de una preparación de receta. TK-178-FE (EXT-002 R-06): las reglas de cuadre y
 * validación, el estado y el envío, la fila por insumo y el formulario viven en
 * `closePreparation/`. Este fichero solo compone el modal.
 */

interface ClosePreparationModalProps {
  preparationId: string | null;
  recipeName: string;
  onClose: () => void;
  /** Se dispara tras un cierre o abandono exitoso (recarga tablero + preparaciones). */
  onReconciled: () => void;
}

export const ClosePreparationModal: React.FC<ClosePreparationModalProps> = ({
  preparationId,
  recipeName,
  onClose,
  onReconciled,
}) => {
  const { detail, kitchenAreas, warehouseAreas, loading, loadError } = useClosePreparationDetail(preparationId);
  const form = useCloseForm(detail);
  const warehouseIds = new Set(warehouseAreas.map((a) => a.id));
  const submit = useSubmitClose(preparationId, detail, form, warehouseIds, onReconciled, onClose);

  if (!preparationId) return null;

  return (
    <Modal size="xl">
      <ModalHeader icon={<ClipboardCheck className="text-primary-color" />} title={`Cerrar Preparación — ${recipeName}`} size="lg" onClose={onClose} />
      {loadError ? (
        <ErrorBanner message={loadError} />
      ) : loading || !detail ? (
        <p role="status" className="fs-sm text-secondary-color">Cargando preparación…</p>
      ) : (
        <ReconciliationForm
          detail={detail}
          form={form}
          kitchenAreas={kitchenAreas}
          warehouseAreas={warehouseAreas}
          submitError={submit.submitError}
          isSubmitting={submit.isSubmitting}
          onSubmit={submit.handleSubmit}
          onCancel={onClose}
        />
      )}
    </Modal>
  );
};
