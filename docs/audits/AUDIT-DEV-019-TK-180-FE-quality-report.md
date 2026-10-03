# Informe de Auditoría de Código VSDD - Ticket TK-180-FE

* **ID Auditoría:** AUDIT-DEV-019
* **Fecha de Auditoría:** 2026-10-02
* **Reviewer:** Subagente Independiente (fases de juicio) + gates deterministas ejecutados por el orquestador
* **Ticket Evaluado:** TK-180-FE — Dejar Claro que el PIN de Recuperación se Repite, y Distinguir Puntos Vacíos de Llenos

> Diff auditado en el índice, sin commitear. Ticket de frontend: el gate de mutation testing (Stryker) cubre solo el backend (dominio y aplicación), así que no aplica.

## Resumen por Fases:
- Fase 0 (Descubrimiento de Reglas): PASÓ — `TK-180-FE` creado antes del código, `REQ-079` en la matriz; sin regla de negocio nueva (4 a 6 dígitos, doble confirmación y `POST /reset-pin` intactos). Matiz del revisor: el texto del Guard 26 menciona «comportamiento de cara al usuario», y el usuario ve texto y puntos distintos; se clasifica como «comportamiento ya especificado pero mal construido».
- Fase 1 (Mutation Testing >= 70%): N/A — sin cambios en dominio ni aplicación.
- Fase 2 (Arquitectura Hexagonal / SOLID): PASÓ — `PinDots` sustituye a las dos copias (`PinDotsDisplay`, `ResetPinDotsDisplay`) sin restos; hooks sin cambio de semántica. Duplicación, calidad y código muerto en verde.
- Fase 3 (Anti-Drift Arquitectónico): PASÓ — sistema de diseño 5.11.0 y fila de `--border-card` exactos; cifras del ticket confirmadas.
- Fase 4 (Seguridad, Entornos y Sanitización): N/A — la etiqueta de los puntos revela solo el número de dígitos, igual que los puntos visibles. Gitleaks sin hallazgos.
- Fase 5 (UI / WCAG 2.2 Ergonomía Táctil): PASÓ con D-1, D-2, D-3 (BAJA). `role="img"` con `aria-label` válido; región `role="status"` presente desde el montaje y actualizada en el mismo nodo; contraste del contorno hueco `--rule`/`--bg-root` ≈15:1 (claro) y ≈14:1 (oscuro), del punto lleno `--color-primary` 5,7:1 y 6,8:1 (SC 1.4.11); el estado se distingue por forma (SC 1.4.1). Estilos inline y alertas nativas en verde.

## Defectos Detectados (Si los hay):
- **D-1 · BAJA — la pista de confirmación engañaba con PIN largos.** `ResetPinModal.tsx`: en el paso 2 el botón se activaba con 4 dígitos aunque el PIN elegido tuviera 6, y la pista decía «al menos 4». **Corregido:** la confirmación exige repetir los N dígitos y la pista dice «Repita los N dígitos de su nuevo PIN.»; test con un PIN de 6.
- **D-2 · BAJA — la región de estado no anunciaba el éxito.** Seguía en «Paso 2 de 2» encima del banner, que no es región viva. **Corregido:** el estado pasa a «PIN restablecido. Redirigiendo al inicio de sesión…»; aserción en el test de éxito.
- **D-3 · BAJA — id fijo de la pista.** **Corregido:** `useId()`.
- **Test que faltaba (BAJA):** nada comprobaba que el login usa `PinDots`. **Añadido** `PinLoginModal.test.tsx`.
- Observaciones aceptadas: la etiqueta de los puntos no es región viva (pulsar dígitos no se anuncia, igual que antes); el botón desactivado sale del orden de tabulación pero su descripción es alcanzable en modo exploración y la pista es visible; el foco queda sobre el botón que cambia de `Continuar` a `Confirmar` (preexistente).

## Candidatos a Regla Permanente (Filtro de Sistemicidad, FASE 6.1):
- **Ids de `aria-describedby`/`aria-labelledby` con `useId()`, no cadenas fijas.** Destino propuesto: `frontend_rules.md` §2. Script posible: grep de `id="` literales en `.tsx`. Pendiente de aprobación humana; no se escribe.
- **La región de estado de un flujo por pasos anuncia también el estado final (éxito o error).** Destino propuesto: `frontend_rules.md` §2. Sin script. Pendiente de aprobación humana.
- **Al extraer un componente compartido, cada consumidor tiene al menos un test que lo renderiza.** Destino propuesto: `testing_rules.md`. Sin script. Pendiente de aprobación humana.

## VEREDICTO FINAL:
APROBADO PARA COMMIT
