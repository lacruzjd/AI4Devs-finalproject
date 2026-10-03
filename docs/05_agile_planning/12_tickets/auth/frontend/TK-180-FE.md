---
document: technical_ticket
id: TK-180-FE
related_story: N/A (Técnico — usabilidad de US-018 detectada en la verificación real de TK-179)
points: 2
type: frontend
status: done
inputs:
  - apps/frontend/src/features/auth/components/ResetPinModal.tsx
  - apps/frontend/src/features/auth/components/PinLoginModal.tsx
  - apps/frontend/src/styles/components/pin.css
  - docs/02_architecture_design/05_ui_ux_design_system.md
  - docs/04_governance_and_quality/rules/frontend_rules.md
---

# TK-180-FE: Dejar Claro que el PIN de Recuperación se Repite, y Distinguir Puntos Vacíos de Llenos

> **Navegación del Framework SDD:**
> [Índice de Tickets](../../tickets_index.md) | [Historia de origen (US-018)](../../../11_user_stories/auth/US-018.md) | [Ticket de origen (TK-077-FE)](TK-077-FE.md)

---

## Descripción

**Remediación técnica** (Guard 26, carve-out C-DEV-006-4) detectada al verificar `TK-179` con Gmail real (2026-10-02): el humano abrió el enlace del correo, escribió el PIN nuevo, pulsó «Continuar» y luego «Confirmar y Guardar PIN» sin que pasara nada. No era un fallo de red: la petición nunca salió porque el botón seguía desactivado.

Tres defectos de la pantalla de recuperación lo provocaron:

1. **El paso de confirmación no dice que hay que repetir el PIN.** Solo cambia un subtítulo pequeño («Confirme su nuevo PIN de seguridad») y el contador vuelve a cero.
2. **Los puntos vacíos son los más llamativos.** `.pin-dot-indicator` rellena el punto vacío con `--border-card`, el color de tinta (casi negro en tema claro, crema en oscuro), y el lleno con `--color-primary`, menos contrastado. Al volver a cero se siguen viendo cuatro puntos que parecen completos. El estado se distingue solo por el color (WCAG 1.4.1).
3. **El botón desactivado no explica por qué no responde.**

El estilo de los puntos se comparte con el login (`PinLoginModal`). `ForceChangePinModal` no tiene el defecto: usa tres campos etiquetados, no un paso que se reinicia.

No cambia ninguna regla de negocio: el PIN sigue siendo de 4 a 6 dígitos, se confirma dos veces y el contrato con el backend no varía.

*   **ID US Relacionada:** N/A (Técnico; comportamiento especificado en `US-018`)
*   **Módulo / Vertical Slice:** `auth`
*   **Estimación (Story Points):** 2 SP
*   **Prioridad MoSCoW:** Should Have
*   **Prerrequisitos:** `TK-077-FE`

---

## Alcance

*   **`ResetPinModal.tsx`:** indicador de paso «Paso 1 de 2: elija su nuevo PIN de 4 a 6 dígitos» / «Paso 2 de 2: repita el mismo PIN para confirmarlo» en una región `aria-live="polite"`, y pista «Introduzca al menos 4 dígitos para continuar» bajo el botón mientras esté desactivado por longitud, enlazada con `aria-describedby`.
*   **`PinDots.tsx` (nuevo):** componente compartido de los puntos, que hoy está duplicado en `PinLoginModal` y `ResetPinModal`. Expone el progreso a lectores de pantalla (`role="img"` + `aria-label` «N dígitos introducidos»).
*   **`styles/components/pin.css`:** punto vacío **hueco** (contorno `2px var(--rule)`, sin relleno) y punto lleno **relleno** de `--color-primary`. La diferencia pasa a ser de forma, no solo de color, en los dos temas.
*   **`05_ui_ux_design_system.md`:** actualizar la fila de `--border-card` (ya no rellena los puntos) y registrar la versión.

---

## Criterios de Aceptación & DoD

### Escenario 1 (Paso de confirmación explícito)
*   **Given** la pantalla de recuperación abierta desde el enlace del correo
*   **When** el administrador escribe 4 dígitos y pulsa «Continuar»
*   **Then** la pantalla anuncia «Paso 2 de 2: repita el mismo PIN para confirmarlo» en una región `aria-live`

### Escenario 2 (Botón desactivado con explicación)
*   **Given** el paso de confirmación con menos de 4 dígitos
*   **Then** «Confirmar y Guardar PIN» está desactivado y describe, vía `aria-describedby`, que faltan dígitos
*   **And** con 4 dígitos la pista desaparece y el botón se activa

### Escenario 3 (Puntos vacíos distinguibles de los llenos)
*   **Given** cualquier pantalla de PIN (login o recuperación)
*   **Then** los puntos vacíos son huecos y los llenos están rellenos, y el progreso se anuncia como «N dígitos introducidos»

### Escenario 4 (Sin regresión del envío)
*   **Given** los dos pasos completados con el mismo PIN
*   **When** se pulsa «Confirmar y Guardar PIN»
*   **Then** se llama a `AuthService.resetAdminPin` con el token y el PIN; con PIN distintos se muestra el error de que no coinciden

### DoD Estricto:
1. **TDD Compliance:** tests RTL co-locados (`ResetPinModal.test.tsx`, `PinDots.test.tsx`) vistos en rojo antes del cambio.
2. **Verificación Total:** test, build y lint declarados en `AGENTS.md` sin errores; gates de estilos inline, alertas nativas, duplicación, calidad y código muerto en verde.
3. **Verificación real:** capturas de la pantalla de recuperación en tema claro y oscuro, con 0 y 4 dígitos, contra el stack desplegado en local.

---

## Resolución (2026-10-02)

- `PinDots.tsx` sustituye a las dos copias de los puntos (`PinLoginModal` y `ResetPinModal`) y anuncia «N dígitos introducidos».
- `ResetPinModal.tsx`: indicador «Paso 1 de 2 / Paso 2 de 2» en `role="status"` + `aria-live="polite"`, y pista enlazada con `aria-describedby` mientras falten dígitos, en los dos pasos.
- `pin.css`: punto vacío hueco (`2px var(--rule)`), lleno relleno de `--color-primary`; sistema de diseño 5.10.0 → 5.11.0.
- **Auditoría independiente [`AUDIT-DEV-019`](../../../../audits/AUDIT-DEV-019-TK-180-FE-quality-report.md): APROBADA** con tres defectos BAJA, corregidos antes del commit: la confirmación exige repetir los N dígitos elegidos y lo dice («Repita los N dígitos de su nuevo PIN»), la región de estado anuncia el éxito, y el id de la pista sale de `useId()`. Añadido el test de que el login usa `PinDots`.
- **Verificación:** 12 tests nuevos (frontend 320/320), `tsc` + `eslint` sin errores (3 avisos preexistentes en ficheros no tocados), build verde; gates de estilos inline, alertas nativas, duplicación, calidad, código muerto, contraste FEFO y lint de `DESIGN.md` en verde. Capturas contra el frontend reconstruido en local, tema claro y oscuro, con 0 y 2 dígitos en el paso de confirmación.
