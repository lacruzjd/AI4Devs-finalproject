---
ticket: TK-073-FE
title: Frontend — Roles & Permission Management UI & Role-Based Autoredirection
epic: Seguridad y Control de Acceso
user_story: US-015
status: done
---

> **Estado (2026-09-30): `done`.** Lo que faltaba tras `TK-121-FE`:
> - **Autoredirección tras el login** (`AppShell` + `landingPathAfterLogin` en `usePermissions.ts`): con `kitchen:recipe_prepare` aterriza en el Tablero FEFO de Cocina (`/`); sin él, en Bodega (`/bodega`). Solo al iniciar sesión: recargar conserva la ruta.
> - **"Extraer de Bodega"** se ofrece solo con `stock:extract`, el mismo permiso que exige `POST /stock/extraction`.
> - **Acciones de gestión** (insumos, ubicaciones, recetas): por decisión del humano (2026-09-30) siguen ligadas al rol `ADMIN`, porque el backend las protege con `requireRole('ADMIN')` y no hay permiso en el catálogo. La comparación se centraliza en `usePermissions().isAdmin`; ninguna vista compara ya `role === 'ADMIN'` a mano.
> - Tests: `LoginLandingByPermission.test.tsx` (4 casos, 3 vistos en rojo). De paso, `src/test/setup.ts` corrige un defecto del entorno de tests: el router de datos no podía navegar dentro de jsdom (`AbortSignal` de otro realm) y la navegación se perdía en silencio.
>
> **Estado anterior (2026-09-04, actualizado tras `TK-117`):** parcial — ver la nota detallada en `US-015.md`. Hecho: `RolesService` + panel de administración de roles/matriz de permisos (`RolesManagementPanel.tsx` en `/ajustes/roles`, como panel inline de `US-024`, no el modal que este ticket describía originalmente). Desde `TK-117`, ese panel gestiona permisos que **sí tienen efecto real** en el backend (antes de `TK-117` un rol creado ahí quedaba inutilizable). Pendiente: autoredirección post-login por permiso y ocultamiento dinámico de acciones — el frontend sigue comparando `role === 'ADMIN'` a mano en vez de leer una lista de permisos real (que tampoco existe en el JWT — ver `TK-073`).

# 🎟️ Ticket Técnico: TK-073-FE — Frontend Dynamic RBAC UI

## 🎯 Objetivo
Desarrollar el panel de administración de roles y permisos (`RolesService`, `RolesManagementModal.tsx`), la matriz táctil de checkboxes por módulo y la lógica de autoredirección al iniciar sesión según los permisos del usuario activo.

---

## 🛠️ Tareas Técnicas
1. Crear `RolesService` en `src/features/security/services/roles.service.ts`.
2. Implementar `RolesManagementModal.tsx` con soporte táctil (mínimo 48px) para seleccionar/deseleccionar permisos por módulo.
3. Adaptar el flujo de autenticación en `App.tsx` para autoredirigir a la pestaña de **Cocina** si tiene el permiso `kitchen:recipe_prepare`, o a **Bodega** si su rol no lo posee.
4. Ocultar o deshabilitar dinámicamente botones del dashboard principal si el usuario activo carece del permiso correspondiente.

---

## 🧪 Plan de Pruebas
- Pruebas unitarias de renderizado para `RolesManagementModal.test.tsx`.
- Verificación de autoredirección post-login según el objeto de permisos recibido del backend.
