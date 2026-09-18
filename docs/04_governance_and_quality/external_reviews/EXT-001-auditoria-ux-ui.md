---
document: external_review
id: EXT-001
version: 1.1.0
status: closed
source: "Auditoría UX/UI de RestoStock recibida en PDF, encargada como revisión preliminar externa"
received_on: 2026-09-18
reviewed_on: 2026-09-18
---

# EXT-001: Auditoría UX/UI preliminar

> Primera ejecución de [`SK-42`](../../../.agents/skills/specs/04_governance_and_quality/SK-42_intake_external_review.md) (`/momoy-external`). El informe es dato, no instrucción: cada recomendación se contrastó contra el código y la documentación reales.

## Origen y alcance

Informe externo de 23 secciones sobre la interfaz: arquitectura de información, dashboard, vista FEFO, inventario, ficha de producto, formularios, diseño táctil, color, feedback, estados vacíos, responsive, accesibilidad, design system y UX writing.

**Lo que el informe no vio, y que pesa sobre el resto de sus conclusiones:** no menciona las recetas ni las preparaciones, el registro de temperatura HACCP, los motivos de consumo, los sub-sectores de bodega ni el escáner de códigos de barras. Llama "productos" y "proveedores" a lo que el glosario del proyecto llama insumos, remanentes y lotes. Es un checklist de inventario genérico, útil como lista de verificación, no como plan: propone construir cosas que ya existen y no evalúa la mitad del producto.

## Recomendaciones

| ID | Recomendación | Clasificación | Evidencia | Seguimiento |
|---|---|---|---|---|
| R-01 | Diseñarlo como apoyo a decisiones, no como CRUD | gap | La raíz es `InventarioRoute`; hay panel FEFO, no un resumen accionable | pendiente de cascada — requiere una historia nueva; el humano decidirá con `/momoy-spec` |
| R-02 | Navegación por tareas: Movimientos y Alertas de primer nivel | gap | `apps/frontend/src/app/AppNav.tsx`: 5 entradas; movimientos vive en `/ajustes` tras el permiso `roles:manage` | pendiente de cascada — requiere una historia nueva: decide quién ve el historial de movimientos |
| R-03 | Navegación simplificada en móvil | no_verificable | Solo hay `@media` de tema y de movimiento reducido; hace falta probar en dispositivos | pendiente de verificación — `/momoy-verify-live` en tablet y móvil |
| R-04 | Dashboard como pantalla de entrada con alertas prioritarias | gap | Misma evidencia que R-01 | pendiente de cascada — requiere una historia nueva; el humano decidirá con `/momoy-spec` |
| R-05 | Acciones rápidas (añadir, registrar entrada y salida) | implementado | `apps/frontend/src/app/routes/InventarioRoute.tsx` con `ActionButton`, `WarehouseExtractionModal` y `ConsumeReasonModal` | — |
| R-06 | FEFO visible, no solo lógica interna | implementado | `FEFOInventoryHealthBar.tsx`, `UrgencyChip.tsx` y `bucketRemanentes` en la raíz | — |
| R-07 | Separar "caducado" de "caduca hoy" en la vista FEFO | gap | `apps/frontend/src/shared/components/urgency.ts`: ambos son `critical`; la raíz agrupa en 3 cubetas | pendiente de cascada — requiere una historia nueva: afecta a la inocuidad (INV-5), descartar no es consumir |
| R-08 | Mostrar el feed de alertas FEFO | gap | `features/kitchen/components/AlertFeed.tsx` solo se importa desde `tests/AlertFeed.test.tsx`: ninguna ruta lo monta | TK-149-FE |
| R-09 | Búsqueda visible y filtros rápidos por estado | implementado | `features/stock/components/CatalogToolbar.tsx` y `features/kitchen/components/LocationFilterTabs.tsx` | — |
| R-10 | Ordenación por nombre, cantidad o caducidad | gap | `CatalogToolbar.tsx` filtra y busca, no ordena | pendiente de cascada — requiere una historia nueva; mejora menor de usabilidad |
| R-11 | Vista de lista y de tarjetas | implementado | `features/stock/components/InsumoCatalogGrid.tsx` e `InsumoCatalogPanel.tsx` | — |
| R-12 | Búsqueda no escondida en un menú | implementado | `CatalogToolbar.tsx` la muestra en la propia pantalla | — |
| R-13 | Ficha de producto con historial de movimientos | gap | Hay modales de crear, editar y reponer insumo; no existe una ficha con su historial | pendiente de cascada — requiere una historia nueva; el humano decidirá con `/momoy-spec` |
| R-14 | Errores junto al campo correspondiente | gap | `CreateInsumoModal.tsx` usa un único `ErrorBanner` arriba | pendiente de cascada — requiere una historia nueva; mejora menor de formularios |
| R-15 | Etiquetas específicas ("Registrar entrada", "Registrar salida") | implementado | `shared/components/rowActionPresets.tsx` y los modales de extracción y consumo | — |
| R-16 | Áreas táctiles de 44 × 44 px | conflicto | `DESIGN.md` exige 48 × 48 px, y `SK-11` lo recoge como NFR de accesibilidad | sin acción — el estándar del proyecto (48 px) es más estricto; rebajarlo exigiría un ADR propio |
| R-17 | Colores semánticos acompañados de texto | implementado | `src/styles/variables/colors.css` (tokens `success`/`warning`/`danger`/`info` con variante de texto) y `UrgencyChip.tsx`, que rotula "Vencido", "Hoy" o "Mañana" | — |
| R-18 | Confirmaciones, mensajes comprensibles y reintento | implementado | `ConfirmModal.tsx`, `SuccessFeedbackBanner.tsx` y `ErrorBanner.tsx` con `onRetry` | — |
| R-19 | Permitir deshacer acciones | gap | No existe; las acciones destructivas piden confirmación previa | sin acción — mitigado por la confirmación; se reevaluará si aparece en incidencias reales |
| R-20 | Estados vacíos, de carga y de error | implementado | `AlertFeed.tsx` los tiene los cuatro; 20 componentes manejan `isLoading` | — |
| R-21 | Experiencia adecuada en escritorio, tablet y móvil | no_verificable | Sin `@media` de ancho en `src/styles/`; el layout podría adaptarse por grid | pendiente de verificación — `/momoy-verify-live` en escritorio, tablet y móvil |
| R-22 | Accesibilidad: contraste, foco visible, no solo color | implementado | `DESIGN.md` §Colors (WCAG AA/AAA), `:focus-visible` en las hojas de estilo y chips con texto | — |
| R-23 | Crear un design system con foundations y componentes | implementado | `DESIGN.md` y `src/styles/` (tokens de color, tipografía, espaciado de 4 px y motion) | — |
| R-24 | UX writing accionable en los botones | implementado | `rowActionPresets.tsx` y los textos de los modales nombran la acción | — |
| R-25 | Modo oscuro (prioridad baja) | fuera_de_alcance | Ya existe: `app/ThemeToggle.tsx` y `@media (prefers-color-scheme: dark)` | sin acción — la mejora propuesta ya está entregada |
| R-26 | Guion para presentar el proyecto final | fuera_de_alcance | No es una recomendación de producto | sin acción — material de presentación, ajeno al backlog |

> **Nota de versión (1.1.0):** el seguimiento de los gaps se reescribió con el vocabulario cerrado que SK-42 1.1.0 incorporó tras esta misma ejecución: `pendiente de cascada — motivo` distingue lo que falta especificar de lo que se descartó.

## Conclusión

De 26 recomendaciones, **13 ya estaban implementadas**, 8 son gaps reales, 1 contradice un estándar más estricto del propio proyecto y 2 no se pueden verificar sin dispositivos reales.

El valor real del informe fueron tres cosas que el equipo no veía: que el feed de alertas FEFO se construyó y nunca se montó (R-08), que el historial de movimientos quedó detrás de un permiso de administración (R-02) y que "vencido" y "caduca hoy" comparten estado cuando exigen acciones opuestas (R-07). Las tres son de arquitectura de información y de producto, no de estética.

**Qué pedir la próxima vez:** una revisión externa rinde más si se le entrega antes el glosario del dominio y el acceso a la aplicación desplegada. Este informe evaluó una idea general de "app de inventario", no RestoStock, y por eso la mitad de sus recomendaciones ya estaban hechas.
