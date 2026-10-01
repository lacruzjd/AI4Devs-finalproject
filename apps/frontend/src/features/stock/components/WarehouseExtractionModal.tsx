import React from 'react';
import { PackageCheck } from 'lucide-react';
import { Modal } from '../../../shared/components/Modal.js';
import { ModalHeader } from '../../../shared/components/ModalHeader.js';
import { ErrorBanner } from '../../../shared/components/ErrorBanner.js';
import { BarcodeScannerButton } from '../../../shared/components/BarcodeScannerButton.js';
import { ExtractionForm } from './warehouseExtraction/ExtractionForm.js';
import { useExtractionForm } from './warehouseExtraction/useExtractionForm.js';
import { useAvailableInsumos, useBarcodeScan } from './warehouseExtraction/useAvailableInsumos.js';
import styles from './WarehouseExtractionModal.module.css';

/*
 * Extracción de bodega a cocina. TK-177-FE (EXT-002 R-06): las piezas viven en
 * `warehouseExtraction/`, agrupadas por responsabilidad — campos del formulario,
 * formulario completo, estado/validación/envío y carga de insumos con escaneo.
 * Este fichero solo compone el modal.
 */

interface WarehouseExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const InsumosLoadError: React.FC<{ message: string; onRetry: () => void; onClose: () => void }> = ({ message, onRetry, onClose }) => (
  <div className="flex-column flex-gap-md">
    <ErrorBanner message={message} />
    <div className="flex-gap-md">
      <button type="button" className="btn-touch btn-secondary" onClick={onClose}>
        Cerrar
      </button>
      <button type="button" className="btn-touch btn-primary" onClick={onRetry} id="btn-retry-load-insumos">
        Reintentar
      </button>
    </div>
  </div>
);

export const WarehouseExtractionModal: React.FC<WarehouseExtractionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const insumosState = useAvailableInsumos(isOpen);
  const form = useExtractionForm(insumosState.insumos, onSuccess, onClose);
  const { scanError, handleScan } = useBarcodeScan(insumosState.insumos, form.bind.onInsumoChange);

  if (!isOpen) return null;

  return (
    <Modal size="md">
      <ModalHeader
        icon={<PackageCheck className="text-primary-color" />}
        title="Extracción de Bodega (Alta TRR)"
        size="lg"
        onClose={onClose}
      />

      {insumosState.error ? (
        <InsumosLoadError message={insumosState.error} onRetry={insumosState.reload} onClose={onClose} />
      ) : insumosState.loading && insumosState.insumos.length === 0 ? (
        <p role="status" className={styles['extraction-note-banner']}>Cargando insumos de bodega…</p>
      ) : insumosState.insumos.length === 0 ? (
        <ErrorBanner message="No hay insumos de bodega disponibles para extraer." />
      ) : (
        <>
          <BarcodeScannerButton onScan={handleScan} />
          {scanError && <ErrorBanner message={scanError} />}
          {form.error && <ErrorBanner message={form.error} />}
          <ExtractionForm insumos={insumosState.insumos} onCancel={onClose} {...form.bind} />
        </>
      )}
    </Modal>
  );
};
