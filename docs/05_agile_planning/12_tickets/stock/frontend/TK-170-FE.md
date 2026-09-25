---
document: technical_ticket
id: TK-170-FE
related_story: US-049
points: 1
type: frontend
status: done
inputs:
  - docs/05_agile_planning/11_user_stories/stock/US-049.md
---

# TK-170-FE: Eliminar el Respaldo de Unidad por Identificador de Semilla

> **Navegación del Framework SDD:**
> [Historia US-049](../../../11_user_stories/stock/US-049.md) | [Índice de tickets](../../indice_tickets.md) | [Matriz de trazabilidad](../../../13_matriz_trazabilidad.md)

---

## Descripción
La pantalla de extracción resuelve la unidad de medida con una tabla escrita a mano que asocia identificadores de insumo de demostración a unidades, y cae a kilogramos para todo lo demás. La unidad está garantizada por construcción —columna no nula, alta que la exige de un conjunto cerrado—, así que esa tabla es código muerto. Lo que no es inocuo es el respaldo: taparía en silencio un fallo de mapeo de la API en lugar de mostrarlo.

Se elimina la tabla y el respaldo silencioso. Si la unidad falta, se hace visible.

*   **ID US Relacionada:** `US-049`
*   **Módulo / Vertical Slice:** `stock`
*   **Estimación (Story Points):** 1 SP
*   **Prioridad MoSCoW:** Should Have
*   **Prerrequisitos:** ninguno

---

## Alcance de Modificación (Hexagonal Layers)
**Infrastructure (UI):** la resolución de unidad de la pantalla de extracción. Ningún cambio de contrato ni de backend.

---

## Mitigación de Riesgos Técnicos
1. **Romper el camino normal:** con datos reales la unidad siempre llega; los tests existentes de esa pantalla son el oráculo de que nada cambia.
2. **Sustituir un respaldo silencioso por una pantalla rota:** la ausencia se comunica como tal, sin dejar la interfaz en un estado ilegible ni lanzar un error al operario.

---

## Criterios de Aceptación & DoD (Definition of Done)
### Escenario 1 (Happy Path)
*   **Given** un insumo con unidad declarada
*   **When** se abre la extracción
*   **Then** se muestra esa unidad, igual que hoy

### Escenario 2 (Ausencia visible)
*   **Given** un insumo sin unidad en la respuesta
*   **When** se abre la extracción
*   **Then** la ausencia se muestra, y no aparece "KG"

### Escenario 3 (Sin identificadores escritos a mano)
*   **Given** el archivo de la pantalla
*   **When** se busca una tabla de identificadores a unidades
*   **Then** no existe

### DoD Estricto:
1. **TDD Compliance:** el test del escenario 2 se escribe y se ve fallar antes del cambio.
2. **Precisión Aritmética:** no aplica; no se tocan cantidades, sólo su unidad mostrada.
3. **Verificación Total:** cero errores en los comandos de test, build y lint declarados en `AGENTS.md`.

---

## Resultado (2026-09-25)

La resolución de la unidad sale del componente a su propio módulo y queda **pura**: la unidad la da el dato, y si no llega se muestra la ausencia en vez de kilogramos. Cuatro tests nuevos, escritos en rojo primero; uno de ellos comprueba explícitamente que los antiguos identificadores de la tabla (`ins-2`, `ins-3`) **ya no deciden nada**.

**Ningún test existente se modificó** —verificado contra el diff—: los 15 casos de la pantalla de extracción siguen siendo la red de que el camino normal no cambia, y pasan sin tocarse.

Suite completa: 608 backend y 290 frontend. Lint y build sin errores.

---

## Instrucciones de Ejecución Autónoma para Agente IA
1. **No modificar los tests existentes** de esa pantalla: son la red de que el camino normal no cambia.
