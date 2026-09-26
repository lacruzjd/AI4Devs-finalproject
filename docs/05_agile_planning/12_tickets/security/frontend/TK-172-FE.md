---
document: technical_ticket
id: TK-172-FE
related_story: US-015 · AUDIT-DEV-017
points: 3
type: frontend
status: done
inputs:
  - docs/audits/AUDIT-DEV-017-rbac-matrix-and-operator-identity.md
  - docs/05_agile_planning/12_tickets/security/frontend/TK-121-FE.md
---

# 🎟️ TK-172-FE: Corregir la Matriz de Permisos que Descarta la Concesión Anterior en Cada Clic (AUDIT-DEV-017 F-1, F-3)

> [⬅️ US-015](../../../11_user_stories/security/US-015.md) | [📖 Índice](../../indice_tickets.md)

## 📝 Descripción

**Remediación técnica** de un defecto reportado por el humano operando la aplicación desplegada: «no se pueden seleccionar los permisos para los roles». No cambia ninguna regla de negocio ni reabre `TK-073`/`TK-117` — el backend está verificado sano contra el stack Docker real.

`useRolesManagement.loadData` conserva el objeto `selectedRole` anterior en vez de re-leerlo de la lista recién traída. Como `togglePermission` deriva el estado siguiente de `selectedRole.permissions` y `PUT /:id/permissions` **reemplaza** la matriz completa, cada clic envía un array construido sobre un estado obsoleto: el check nunca se marca y la concesión anterior se pierde sin error visible.

*   **US:** `US-015` · **Slice:** `security` frontend · **SP:** 3 · **Prioridad:** 🟠 P1
*   **Prerrequisitos:** `TK-073-FE` (panel de roles), `TK-117` (autorización de las rutas)

## 🔀 Alcance

*   `RolesManagementPanel.tsx` — `loadData` re-lee el rol seleccionado de `rList` por `id`, conservando la selección del usuario pero **no** sus datos obsoletos. Si el rol desapareció, cae al primero de la lista (comportamiento actual).
*   `RolesManagementPanel.tsx` — el `catch {}` vacío de `loadData` (Guard 6 §2, F-3) pasa a poblar el `ErrorBanner` ya existente vía `mapToUserFriendlyError`, igual que hacen `togglePermission` y `deleteRole`.
*   **Fuera de alcance:** la ausencia de media query en `.roles-permissions-grid` (`1fr 2fr` fijo en pantallas estrechas) — es estrechez visual, no impide operar; no se reportó y no se toca sin ticket.

## ✅ Criterios de Aceptación & DoD

1. **TDD (Red primero):** `RolesManagementPanel.test.tsx` co-localizado en `features/security/components/` (los tests nuevos van co-localizados, §Ubicación del manifiesto de stack). Cuatro casos, los dos primeros fallando antes del fix:
   - el permiso aparece marcado tras un guardado con éxito;
   - un segundo permiso **se acumula** sin borrar el primero;
   - desmarcar retira solo ese permiso;
   - un fallo de carga muestra el `ErrorBanner` en vez de una lista muda (F-3).
2. **Sin regresión:** `PermissionGating.test.tsx` y el resto de la suite de frontend siguen verdes.
3. `pnpm build` / `test` / `lint` verdes; sin clones nuevos de `jscpd` en el diff.
4. **Commit:** `fix(security): rebuild the selected role from the refreshed list (TK-172-FE)`.

## 📌 Notas de implementación

*   **La corrección es de una línea, el defecto no era trivial de ver:** `rList.some((r) => r.id === prev.id)` parece un refresco correcto porque comprueba el `id` — pero comprobar que el rol *sigue existiendo* no es lo mismo que *traerse su versión nueva*. Ese es exactamente el matiz que un test del componente habría atrapado en su día.
*   **Por qué el defecto era destructivo y no cosmético:** el endpoint reemplaza la matriz entera (`deleteMany` + `createMany` en `PrismaRoleRepository.updateRolePermissions`). Un estado de partida obsoleto no produce una vista desactualizada: produce una escritura que revierte lo anterior.
*   El `catch` de F-3 se corrige en el mismo ticket porque es la razón por la que el diagnóstico necesitó `curl` para descartar un fallo de red: la pantalla no podía distinguir «sin roles» de «no pude cargarlos».
