---
document: technical_ticket
id: TK-149-FE
related_story: N/A (Técnico) — remediación de `TK-007`, detectada en la revisión externa `EXT-001`
points: 2
type: frontend
status: approved
inputs:
  - docs/04_governance_and_quality/external_reviews/EXT-001-auditoria-ux-ui.md
  - docs/02_architecture_design/04_technical_design.md
---

# TK-149-FE: Montar el Feed de Alertas FEFO en la Interfaz (Frontend)

> **Navegación del Framework SDD:**
> [Revisión externa EXT-001](../../../../04_governance_and_quality/external_reviews/EXT-001-auditoria-ux-ui.md) | [Índice de Tickets](../../indice_tickets.md) | [Matriz de Trazabilidad](../../../13_matriz_trazabilidad.md)

---

## Descripción

El componente `AlertFeed` se construyó en `TK-007` con sus cuatro estados (carga, vacío, error con reintento y listado de alertas semafóricas) y **ninguna ruta lo monta**: su única referencia en todo el repositorio es su propio test. La funcionalidad existe, está probada y el usuario no la ve.

Este ticket la pone en pantalla. No introduce reglas de negocio nuevas: el comportamiento ya está especificado en la historia de `TK-007` y el componente ya lo implementa.

*   **ID US Relacionada:** `N/A (Técnico)` — remediación de un ticket ya `done`
*   **Módulo / Vertical Slice:** `kitchen`
*   **Estimación (Story Points):** 2 SP
*   **Prioridad MoSCoW:** Should Have
*   **Prerrequisitos:** ninguno

---

## Alcance de Modificación (Hexagonal Layers)

*   **Domain:** sin cambios.
*   **Application:** sin cambios.
*   **Infrastructure (UI):** montar `AlertFeed` en la superficie que corresponda (`InventarioRoute` es la candidata: ya carga los remanentes FEFO y calcula sus urgencias), conectándolo al servicio existente `KitchenService`. Reutilizar los datos ya cargados en la ruta antes de añadir una petición nueva.

---

## Mitigación de Riesgos Técnicos

1. **Duplicar información con `FEFOInventoryHealthBar`:** ambos muestran el estado FEFO. Definir en la implementación qué aporta cada uno (barra: visión de un segundo; feed: lista accionable) y, si se solapan, proponer al humano cuál se queda antes de montar los dos.
2. **Petición duplicada al backend:** la ruta ya consulta los remanentes; pasar esos datos como props en vez de disparar una carga paralela.
3. **Volver a quedar huérfano:** el test de montaje debe cubrir la ruta, no solo el componente aislado, para que un futuro cambio de layout lo detecte.

---

## Criterios de Aceptación & DoD (Definition of Done)

### Escenario 1 (Happy Path)
*   **Given** una cocina con remanentes próximos a vencer
*   **When** el usuario abre la pantalla donde se monta el feed
*   **Then** ve las alertas FEFO ordenadas por urgencia, sin abrir ningún menú adicional

### Escenario 2 (Vacío)
*   **Given** una cocina sin remanentes en riesgo
*   **When** el usuario abre esa pantalla
*   **Then** ve el estado vacío que ya implementa el componente ("No hay remanentes en riesgo de vencimiento")

### Escenario 3 (Error)
*   **Given** que la consulta de alertas falla
*   **When** el usuario abre esa pantalla
*   **Then** ve el mensaje de error con su acción de reintento, y al pulsarla se reintenta la carga

### DoD Estricto:
1. **TDD Compliance:** el test de la ruta que renderiza el feed se escribe y se ve fallar antes de montar el componente.
2. **Verificación Total:** cero errores en los comandos de test, build y lint declarados en `AGENTS.md`.
3. **Sin regresiones visuales:** la pantalla mantiene los objetivos táctiles de 48 px de `DESIGN.md`.

---

## Instrucciones de Ejecución Autónoma para Agente IA

1. **Fichas a crear/modificar:**
   - `apps/frontend/src/app/routes/InventarioRoute.tsx` (o la superficie que se apruebe)
   - `apps/frontend/src/tests/` — test de la ruta con el feed montado
2. **Ejecutar TDD Suite:** comando de test declarado en `AGENTS.md`, acotado al módulo `kitchen`.
3. **Comando de Verificación Total:** comandos de build y lint declarados en `AGENTS.md`.
