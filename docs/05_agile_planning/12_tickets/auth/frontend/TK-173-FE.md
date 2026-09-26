---
document: technical_ticket
id: TK-173-FE
related_story: US-051 · AUDIT-DEV-017
points: 5
type: frontend
status: done
inputs:
  - docs/05_agile_planning/11_user_stories/auth/US-051.md
  - docs/05_agile_planning/12_tickets/auth/backend/TK-173.md
---

# 🎟️ TK-173-FE: Hacer Visible el Código de Operario en el Alta, la Lista y el Login (US-051, AUDIT-DEV-017 F-2/F-4)

> [⬅️ US-051](../../../11_user_stories/auth/US-051.md) | [📖 Índice](../../indice_tickets.md)

## 📝 Descripción

Las tres superficies que hoy ocultan la identidad de acceso: el alta no la pide ni la muestra, la lista de personal no la pinta pese a tenerla en el DTO, y el login la llama «ID de Operario» pidiendo un UUID.

*   **US:** `US-051` · **Slice:** `auth` frontend · **SP:** 5 · **Prioridad:** 🟠 P1
*   **Prerrequisitos:** `TK-173` (backend)

## 🔀 Alcance

*   `CreateUserForm.tsx` — campo «Código de Operario» obligatorio; la confirmación muestra el código de forma destacada (`US-051` Escenario 1).
*   `UserStatusForm.tsx` — cada fila muestra el código junto al nombre (Escenario 2), en modo lectura.
*   `PinLoginModal.tsx` — etiqueta «Código de Operario», `placeholder` real, y retirada del comentario obsoleto de `F-4`.
*   `users.service.ts` / `auth.service.ts` — tipos y payload alineados con el contrato nuevo.
*   **Fuera de alcance:** los chips de operario reciente siguen guardando lo tecleado (ahora el código en vez del UUID) — mismo mecanismo, sin cambios.

## ✅ Criterios de Aceptación & DoD

1. **TDD (Red primero):** el alta envía el código tecleado y lo muestra en la confirmación; la lista pinta el código de cada operario; el login envía `operatorCode`.
2. **Guard 38:** los errores siguen llegando por `ErrorBanner` + `mapToUserFriendlyError`; el `409` de código duplicado se traduce a un mensaje accionable, no a `Error HTTP 409`.
3. **Guard 29:** sin estilos inline nuevos.
4. `pnpm build` / `test` / `lint` verdes.
5. **Commit:** `feat(auth): surface the operator code across staff and login screens (TK-173-FE)`.

## 📌 Notas de implementación

*   **El comentario de `F-4` se retira, no se corrige:** justificaba el campo libre con «el backend no expone ningún endpoint para listar operarios» — cierto hasta `TK-056`, falso desde entonces. Mantenerlo actualizado no aporta: la razón por la que hoy se teclea un código en vez de elegir un perfil es el NFR de no divulgación de `US-051`, que es donde queda documentada.
