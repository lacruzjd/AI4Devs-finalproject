# Índice de Deuda Técnica

> **Navegación:** [Índice de tickets](12_tickets/tickets_index.md) | [Matriz de trazabilidad](13_traceability_matrix.md) | [Auditorías](../audits/)

Índice único de la deuda conocida de RestoStock (`TK-148`, generado con `SK-31`). Antes de este fichero la deuda estaba repartida en 19 tickets con sección "Deuda Registrada" y en 26 informes de `docs/audits/`, y ninguna revisión podía priorizarla ni ver si crecía.

**Cómo se mantiene.** Cada elemento enlaza su fuente. Quien cree deuda nueva (un ticket que registra algo fuera de alcance, una auditoría con un hallazgo sin corregir) la añade aquí en el mismo commit. Quien la cierre la mueve a "Resuelta" con el ticket que la cerró. Cada elemento se comprobó contra el código el **2026-09-30**; las fuentes que la describen como abierta pero ya no lo está aparecen en "Resuelta".

**Severidad:** Crítica · Alta · Media · Baja · Info. **Esfuerzo:** días de trabajo estimados.

---

## 1. Deuda abierta

| ID | Componente | Deuda | Sev. | Esfuerzo | Fuente |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `TD-001` | Despliegue / `sessionCookies.ts` | Con `NODE_ENV=production` la cookie de sesión lleva `Secure`. Una tablet que abra el stack por `http://<IP-LAN>` inicia sesión (`200`), pero el navegador descarta la cookie y la siguiente petición vuelve al login. `localhost` funciona. Para uso en LAN hace falta HTTPS delante de nginx. Consecuencia aceptada en ADR-005, verificada el 2026-09-30. | Media | 1 | [TK-140](12_tickets/auth/frontend/TK-140.md), [ADR-005](../02_architecture_design/adr/ADR-005-session-token-storage.md) |
| `TD-003` | `authenticateJWT.ts` | `jwt.verify(token, jwtSecret)` sin fijar `algorithms: ['HS256']`. | Baja | 0.25 | [AUDIT-SEC-004](../audits/AUDIT-SEC-004-hardcoded-credentials-and-auth.md) O-1 |
| `TD-004` | `AuthenticateByPinUseCase.ts` | La vida de la sesión (12 h) es una constante de código (`SESSION_TTL_SECONDS`, compartida con la cookie desde TK-140), no configuración. | Baja | 0.5 | AUDIT-SEC-004 O-1 |
| `TD-005` | `Pin.ts` | `scryptSync` con el coste `N` por defecto de Node; sin parámetros explícitos ni migración de hashes si se sube. | Baja | 1 | AUDIT-SEC-004 O-1 |
| `TD-006` | `src/infrastructure/seeds/seed.ts` | `seedEssentialUsers` usa `SEED_ADMIN_PIN ?? '1234'` sin guard de producción propio. Hoy es inalcanzable en producción (el entrypoint usa `prisma/seed.ts`). | Info | 0.25 | AUDIT-SEC-004 O-2, [TK-143](12_tickets/shared/backend/TK-143.md) |
| `TD-007` | `openapi.yaml` | `PUT /api/v1/auth/users/{id}` existe en el código y no figura en el contrato. | Baja | 0.5 | [TK-174](12_tickets/security/backend/TK-174.md) |
| `TD-008` | `GetRecipeAvailabilityUseCase`, `ConsumeRecipeUseCase` | N+1: dos consultas por ingrediente (`insumoRepository.findById` + remanentes activos), en paralelo pero sin método batch. | Baja | 1.5 | [TK-127](12_tickets/recipes/backend/TK-127.md), [AUDIT-DEV-007](../audits/AUDIT-DEV-007-recipes-module-quality-report.md) F-7 |
| `TD-009` | `GET /api/v1/recipes` | Sin paginación. Cambia el contrato: necesita decisión de producto. | Baja | 1 | TK-127 |
| `TD-010` | `SuggestRescueRecipesUseCase.ts`, `rescueProposalJsonParser.ts` | Porciones estimadas fijas en 4 (`DEFAULT_CATALOG_PORTIONS`, `DEFAULT_PORTIONS`): `Recipe` no tiene rendimiento (`yieldPortions`). Necesita cascada de especificación. | Baja | 3 | AUDIT-DEV-007 F-9, [AUDIT-DEV-011](../audits/AUDIT-DEV-011-TK-128-quality-report.md) O-1 |
| `TD-011` | `TestAiConnectionUseCase.ts` | Timeout de 5000 ms literal. Los adapters de generación ya usan la constante compartida `AI_GENERATION_TIMEOUT_MS` (TK-126); este caso quedó fuera. | Info | 0.25 | AUDIT-DEV-007 F-14, [AUDIT-DEV-009](../audits/AUDIT-DEV-009-TK-126-quality-report.md) O-2 |
| `TD-012` | `WarehouseExtractionModal.tsx` → `KitchenService.addLocalRemanente` | Side-channel: la extracción inyecta el remanente en el estado local de cocina en vez de que cocina lo relea del backend. | Baja | 1 | [TK-069-FE](12_tickets/recipes/frontend/TK-069-FE.md) |
| `TD-013` | `shared/components/Modal.tsx` | Sin `createPortal`: un modal abierto dentro de otro queda anidado en su `.modal-card`. Hoy no se nota (la animación de montaje no persiste), pero se rompería con un `transform` permanente. Afecta a unos 10 modales. | Baja | 1 | [TK-119-FE](12_tickets/stock/frontend/TK-119-FE.md) |
| `TD-014` | `PrismaUserRepository.resolveRoleId` | Una consulta extra por intento de login. Aceptado por coste marginal. | Info | 0.25 | [AUDIT-DEV-005](../audits/AUDIT-DEV-005-TK-092-quality-report.md) D-2 |
| `TD-015` | Frontend administrativo | El dashboard administrativo no tiene dirección visual propia. Pendiente de decisión explícita del humano. | Baja | — | [TK-067](12_tickets/shared/frontend/TK-067.md) |
| `TD-016` | momoy (`.agents/`) | Convención de nombres que el upstream no adoptó (F-1, F-3, F-5, F-6) y mezcla de comandos y procedimientos en `skills/` (F-7). Se decide y ejecuta en el repositorio de momoy, no aquí. | Baja | 3 | [AUDIT-DEV-016](../audits/AUDIT-DEV-016-momoy-naming-consistency.md), [TK-152](12_tickets/shared/backend/TK-152.md) |
| `TD-017` | `RecipeSelectorModal.test.tsx` | Test intermitente: falló una vez bajo `pnpm run test` en paralelo ("confirma la preparación llamando a KitchenService.consumeRecipe") y pasó en 3 ejecuciones aisladas y 3 completas posteriores. Mismo patrón que los tests RTL endurecidos en TK-134. | Info | 0.25 | Observado el 2026-09-30 durante TK-176 |

**Resumen:** 16 elementos abiertos — 0 Crítica, 0 Alta, 1 Media, 11 Baja, 4 Info. Esfuerzo total estimado: ~15 días.

---

## 2. Deuda resuelta (fuentes que aún la describen como abierta)

| Deuda | Fuente | Cerrada por | Comprobación (2026-09-30) |
| :-- | :-- | :-- | :-- |
| Token de sesión en `localStorage`, exfiltrable por XSS | [AUDIT-SEC-001](../audits/AUDIT-SEC-001-security-posture-report.md) F-4, AUDIT-SEC-004 O-1 | [TK-140](12_tickets/auth/frontend/TK-140.md) | Cookie `httpOnly` verificada en Chromium contra el stack Docker. |
| Rama del frontend que leía el token heredado de `localStorage` (antes `TD-002`) | [TK-140](12_tickets/auth/frontend/TK-140.md) | [TK-176](12_tickets/auth/frontend/TK-176.md) | 0 peticiones con `Authorization` en Chromium; el token antiguo se borra al arrancar. |
| Campo `role` como `z.string()` libre | AUDIT-SEC-001 F-2, AUDIT-DEV-005 D-4 | [TK-174](12_tickets/security/backend/TK-174.md) | `assertRoleInCatalog` en los casos de uso; gate con marcador verificado. |
| API key de Gemini en la query string | AUDIT-DEV-007 F-3, [AUDIT-DEV-012](../audits/AUDIT-DEV-012-ai-config-leakage-and-crud-coverage.md) L-5 | [TK-126](12_tickets/recipes/backend/TK-126.md), [TK-129](12_tickets/settings/backend/TK-129.md) | 0 apariciones de `?key=` en `apps/backend/src`. |
| Timeout de 5 s literal por adapter | AUDIT-DEV-007 F-14 | TK-126 | `AI_GENERATION_TIMEOUT_MS` compartido (excepción: `TD-011`). |
| Rescate sugerido para insumos sin riesgo (`slice(0, 5)`) | AUDIT-DEV-007 F-15 | [TK-125](12_tickets/recipes/backend/TK-125.md) | 0 apariciones. |
| `RecipeSelectorModal` con `DEFAULT_RECIPES` hardcodeado | [TK-057](12_tickets/catalog/backend/TK-057.md) | [TK-061](12_tickets/shared/frontend/TK-061.md) | Consume el catálogo real; las 3 recetas quedan solo como fallback offline (`FALLBACK_RECIPES`). |
| Paleta hex hardcodeada en `RestockInsumoModal.tsx` | [TK-067](12_tickets/shared/frontend/TK-067.md) | [TK-068](12_tickets/shared/frontend/TK-068.md) | 0 literales hex en el fichero. |
| `CreateInsumoModal.tsx` sin el `Modal.tsx` compartido | TK-068 | Posterior a TK-068 | Importa y usa `Modal`. |
| Emojis sueltos en pantallas de cocina | [TK-071](12_tickets/shared/frontend/TK-071.md) | TK-071 (commit `30dbbc0`) | 0 emojis en los 4 ficheros citados. |
| Sin editar/borrar receta | [TK-070-FE](12_tickets/recipes/frontend/TK-070-FE.md) | [TK-131](12_tickets/recipes/backend/TK-131.md) | `PUT`/`DELETE /recipes/{id}` implementados. |
| Hallazgos F-1 a F-9 de extracción de bodega | [AUDIT-DEV-006](../audits/AUDIT-DEV-006-warehouse-extraction-quality-report.md) | TK-098, TK-099, TK-100-FE, TK-101 | Auditoría cerrada por completo. |
| Workflows sin sufijo `_workflow` | AUDIT-DEV-016 F-4 | momoy 3.0.0 (upstream) | `check_naming.py` en verde. |

---

## 3. Decisiones deliberadas (no son deuda)

Registradas aquí para que ninguna revisión futura las liste como deuda.

| Decisión | Fuente |
| :-- | :-- |
| Alta/edición de insumos, ubicaciones y recetas ligadas al rol `ADMIN` (`requireRole('ADMIN')`), sin permiso fino en el catálogo. Decidido por el humano el 2026-09-30. | AUDIT-DEV-007 F-12, [TK-073-FE](12_tickets/security/frontend/TK-073-FE.md) |
| `GET /stock/movements` y reabastecimiento restringidos a `ADMIN` por decisión de producto, aunque el seed da `stock:restock` a `KITCHEN_STAFF`. | [US-015](11_user_stories/security/US-015.md), [AUDIT-DEV-003](../audits/AUDIT-DEV-003-TK-085-FE-quality-report.md) |
| El modo CREATIVE de IA envía nombres de insumo y cantidades; `endpointUrl` sin allowlist. Riesgo residual aceptado el 2026-09-07. | AUDIT-DEV-012 L-1, L-2 |
| Sin estado "Vencido" en la escala de urgencia FEFO. | [AUDIT-DEV-004](../audits/AUDIT-DEV-004-TK-086-FE-quality-report.md) D-2 a D-4 |
| Umbral de temperatura fijo (estándar de industria), no configurable por restaurante. | [TK-120](12_tickets/kitchen/backend/TK-120.md) |
| Sin cola de "insumo pendiente de alta" cuando cocina escanea un código desconocido. | [TK-119](12_tickets/stock/backend/TK-119.md) |
| La lista de permisos del JWT es informativa; la autorización se resuelve en vivo en cada petición. | [TK-121](12_tickets/security/backend/TK-121.md) |
| `Authorization: Bearer` aceptado en el backend para clientes que no son navegador. | TK-140 |
