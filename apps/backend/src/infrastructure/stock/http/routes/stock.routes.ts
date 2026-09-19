import { Router } from 'express';
import { StockController } from '../controllers/stock.controller.js';
import {
  RecordExtractionUseCase,
  GetStockMovementHistoryUseCase,
  CreateInsumoUseCase,
  ListInsumosUseCase,
  RestockInsumoUseCase,
  FindInsumoByBarcodeUseCase,
  UpdateInsumoUseCase,
} from '../../../../application/stock/use-cases/index.js';
import { IInsumoRepository } from '../../../../domain/stock/repositories/IInsumoRepository.js';
import { IRemanenteRepository } from '../../../../domain/stock/repositories/IRemanenteRepository.js';
import { IStockUnitOfWork } from '../../../../domain/stock/repositories/IStockUnitOfWork.js';
import { systemClock } from '../../../shared/systemClock.js';
import { cryptoIdGenerator } from '../../../shared/cryptoIdGenerator.js';
import { IStockMovementQueryRepository } from '../../../../domain/stock/repositories/IStockMovementQueryRepository.js';
import { IStorageLocationRepository } from '../../../../domain/stock/repositories/IStorageLocationRepository.js';
import { IRecipePreparationRepository } from '../../../../domain/kitchen/repositories/IRecipePreparationRepository.js';
import { IRoleRepository } from '../../../../domain/security/repositories/IRoleRepository.js';
import { requireRole } from '../../../http/middlewares/requireRole.js';
import { authorizePermissions } from '../../../security/http/middleware/authorizePermissions.middleware.js';

// TK-117 (US-015 Escenario 3) migró `/extraction` a permiso fino (`stock:extract`).
// US-038 / TK-153 (ADR-007) hace lo mismo con `/movements` y `stock:read`: el historial
// deja de ser dato solo de administración para que un operario resuelva un descuadre en
// su turno. Esto **supersede** el criterio de `TK-050` ("dato administrativo — solo ADMIN"),
// que el ADR conserva como decisión anterior. `/insumos/:id/restock` sigue en ADMIN: ese
// acceso no se discutió aquí. Sin `roleRepository` inyectado se cae al guard grueso
// anterior — nunca a "sin guard".
function buildPermissionGuard(
  isAuthRequired: boolean,
  roleRepository: IRoleRepository | undefined,
  permission: string,
  ...fallbackRoles: string[]
): ReturnType<typeof authorizePermissions | typeof requireRole>[] {
  if (!isAuthRequired) return [];
  return roleRepository ? [authorizePermissions(roleRepository, permission)] : [requireRole(...fallbackRoles)];
}

/** Guards de las rutas de stock que ya migraron a permisos finos (TK-117, TK-153). */
function buildStockGuards(isAuthRequired: boolean, roleRepository?: IRoleRepository) {
  return {
    extractPermission: buildPermissionGuard(isAuthRequired, roleRepository, 'stock:extract', 'ADMIN', 'KITCHEN_STAFF'),
    readPermission: buildPermissionGuard(isAuthRequired, roleRepository, 'stock:read', 'ADMIN', 'KITCHEN_STAFF'),
  };
}

export function createStockRouter(
  stockRepository: IInsumoRepository & IRemanenteRepository & IStockUnitOfWork,
  stockMovementQueryRepository?: IStockMovementQueryRepository,
  isAuthRequired = true,
  locationRepository?: IStorageLocationRepository,
  recipePreparationRepository?: IRecipePreparationRepository,
  roleRepository?: IRoleRepository
): Router {
  const router = Router();

  // TK-093 (AUDIT-SEC-001 F-3): rol explícito por ruta. Cuando la auth está desactivada
  // (tests de negocio, requireAuth:false) el guard de rol se omite — mismo criterio que
  // el authMiddleware a nivel de mount en app.ts.
  const role = (...roles: string[]): ReturnType<typeof requireRole>[] =>
    isAuthRequired ? [requireRole(...roles)] : [];
  const { extractPermission, readPermission } = buildStockGuards(isAuthRequired, roleRepository);
  // args: (insumoRepository, unitOfWork, clock, idGenerator, locationRepository)
  // — el repo concreto satisface las 2 primeras interfaces.
  const useCase = new RecordExtractionUseCase(
    stockRepository,
    stockRepository,
    systemClock,
    cryptoIdGenerator,
    locationRepository,
    recipePreparationRepository
  );
  const getMovementHistoryUseCase = stockMovementQueryRepository
    ? new GetStockMovementHistoryUseCase(stockMovementQueryRepository)
    : undefined;
  const createInsumoUseCase = new CreateInsumoUseCase(stockRepository, locationRepository);
  const listInsumosUseCase = new ListInsumosUseCase(stockRepository, locationRepository);
  const restockInsumoUseCase = new RestockInsumoUseCase(stockRepository, stockRepository, cryptoIdGenerator, locationRepository);
  const findInsumoByBarcodeUseCase = new FindInsumoByBarcodeUseCase(stockRepository, locationRepository);
  const updateInsumoUseCase = new UpdateInsumoUseCase(stockRepository, locationRepository);
  const controller = new StockController(
    useCase,
    getMovementHistoryUseCase,
    createInsumoUseCase,
    listInsumosUseCase,
    restockInsumoUseCase,
    findInsumoByBarcodeUseCase,
    updateInsumoUseCase
  );

  // Extracción de bodega (US-014/TK-072): la ejecutan operarios de cocina y admins.
  router.post('/extraction', ...extractPermission, controller.recordExtraction);
  // Trazabilidad de movimientos: visible para quien ya consulta el stock (ADR-007, TK-153).
  router.get('/movements', ...readPermission, controller.getMovementHistory);
  // Catálogo de insumos (TK-057): alta administrativa, listado para cualquier autenticado.
  router.post('/insumos', ...role('ADMIN'), controller.createInsumo);
  router.get('/insumos', controller.listInsumos);
  // Escaneo de código de barras (US-032/TK-119): cualquier rol autenticado, solo lectura.
  router.get('/insumos/by-barcode/:barcode', controller.findInsumoByBarcode);
  // Reabastecimiento de bodega (US-013/TK-060): incrementa warehouseStock, solo ADMIN.
  router.patch('/insumos/:id/restock', ...role('ADMIN'), controller.restockInsumo);
  // Edición de insumo (US-036/TK-130): name / unitCost / barcode — solo ADMIN.
  router.put('/insumos/:id', ...role('ADMIN'), controller.updateInsumo);

  return router;
}
