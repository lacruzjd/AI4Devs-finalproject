---
document: technical_ticket
id: TK-160-FE
related_story: US-044
points: 5
type: frontend
status: approved
inputs:
  - docs/05_agile_planning/11_user_stories/shared/US-044.md
  - docs/02_architecture_design/adr/ADR-009-conflictos-de-la-cola-sin-conexion.md
---

# TK-160-FE: Cola Local de Consumo y Descarte

> **Navegación del Framework SDD:**
> [Historia US-044](../../../11_user_stories/shared/US-044.md) | [Índice de tickets](../../indice_tickets.md) | [Matriz de trazabilidad](../../../13_matriz_trazabilidad.md)

---

## Descripción
Encolar localmente las operaciones de consumo y descarte cuando no hay red, sincronizarlas una a una al recuperar la conexión, y mostrar al operario el estado de cada una: pendiente, aplicada, aplicada con varianza o rechazada. Cada operación se encola con su clave de idempotencia y el momento real en que se registró.

*   **ID US Relacionada:** `US-044`
*   **Módulo / Vertical Slice:** `shared`
*   **Estimación (Story Points):** 5 SP
*   **Prioridad MoSCoW:** Must Have
*   **Prerrequisitos:** `TK-159`, `TK-159-FE`

---

## Alcance de Modificación (Hexagonal Layers)
**Infrastructure (UI):** almacenamiento local de la cola con el mecanismo declarado en `docs/00_stack_manifest.md`, adaptador de sincronización, y la vista de estado de la cola.
**Application (cliente):** el caso de uso de consumo y el de descarte pasan por la cola en lugar de llamar directamente a la API; con red, la cola se vacía de inmediato y el comportamiento percibido no cambia.

---

## Mitigación de Riesgos Técnicos
1. **Cola silenciosa:** una operación rechazada que nadie ve traslada el problema a la memoria del operario. El estado por operación es parte del alcance, no un extra.
2. **Sincronización concurrente:** dos pestañas o una reapertura pueden intentar vaciar la cola a la vez. La clave de idempotencia protege el servidor, pero el cliente no debe duplicar el envío de forma sistemática.
3. **Pérdida de la cola:** debe sobrevivir al cierre de la aplicación y al reinicio del dispositivo; un almacenamiento volátil no cumple la historia.
4. **Un único camino de código:** con red y sin red se usa la misma ruta, para que el modo sin conexión no sea una rama que solo se ejercita cuando falla algo.

---

## Criterios de Aceptación & DoD (Definition of Done)
### Escenario 1 (Happy Path)
*   **Given** el dispositivo sin conexión
*   **When** el operario registra un consumo y la red vuelve
*   **Then** la operación se envía una sola vez y aparece como aplicada

### Escenario 2 (Aplicada con varianza)
*   **Given** una operación encolada que el servidor acepta generando varianza
*   **When** se sincroniza
*   **Then** el operario la ve marcada como aplicada con varianza, con la diferencia registrada

### Escenario 3 (Rechazo por turno conciliado)
*   **Given** una operación cuyo turno ya se concilió
*   **When** se sincroniza
*   **Then** el operario la ve rechazada, con el motivo y sin desaparecer de la lista

### DoD Estricto:
1. **TDD Compliance:** los tests se escriben y se ven fallar antes de la implementación, cubriendo el vaciado de la cola y el reintento.
2. **Precisión Aritmética:** las cantidades encoladas conservan el tipo decimal declarado; prohibido redondear al serializar.
3. **Verificación Total:** cero errores en los comandos de test, build y lint declarados en `AGENTS.md`.

---

## Instrucciones de Ejecución Autónoma para Agente IA
1. **Leer `docs/00_stack_manifest.md`** para el mecanismo de almacenamiento local declarado antes de añadir dependencias.
2. **Auditoría de reuso previa:** revisar la capa compartida declarada en `frontend_rules.md` antes de crear cliente HTTP o adaptadores nuevos.
3. **Ejecutar TDD Suite:** comando de test declarado en `AGENTS.md`, acotado al módulo afectado.
