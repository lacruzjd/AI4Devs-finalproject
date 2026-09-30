import React from 'react';
import { RecipeCatalogPanel } from '../../features/recipes/components/RecipeCatalogPanel.js';
import { usePermissions } from '../../shared/hooks/usePermissions.js';

/**
 * Ruta Recetas (`/recetas`, US-023). Monta el Recetario bajo una ruta de operario;
 * las acciones de alta (ADMIN, `POST /recipes`) sólo se muestran a ADMIN (D-1, AUDIT-DEV-003).
 */
export const RecetasRoute: React.FC = () => {
  const { isAdmin } = usePermissions();
  return <RecipeCatalogPanel canManage={isAdmin} />;
};
