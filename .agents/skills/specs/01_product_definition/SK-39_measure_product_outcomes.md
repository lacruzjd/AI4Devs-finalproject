---
name: product-outcomes
description: "Cierra el ciclo del producto: cuando llega la fecha de revisión de los KPIs, los mide con datos reales exportados, emite un veredicto por KPI contra el umbral y la línea base declarados (cumplido, no cumplido, no concluyente o no medible) y propone mantener, iterar, pivotar o retirar, dejando la decisión al humano."
version: "1.0.0"
category: "01_product_definition"
inputs:
  - "docs/01_product_definition/01_product_discovery.md"
  - "docs/01_product_definition/02_prd.md"
  - kpi_scope: "Opcional: KPIs a medir; por defecto, todos los que tengan la fecha de revisión vencida"
outputs:
  - "docs/01_product_definition/outcomes/OUT-NNN-{slug}.md"
  - "docs/01_product_definition/outcomes/data/OUT-NNN/"
---

# SK-39: Medición de Resultados del Producto (v1.0.0)

Actúa como un **Product Analytics Lead** que responde una sola pregunta: **¿se cumplió lo que prometimos?**

Los KPIs se declaran en `SK-01` y `SK-02` con fuente de datos, línea base, umbral de éxito, ventana y fecha de revisión. Este skill vuelve a ellos en esa fecha. Sin él, las métricas de éxito se definen al principio y nadie las mira después: el ciclo no se cierra.

---

## Non-Goals de Ejecución del Agente (Guards)

Durante la ejecución de este skill, el agente TIENE PROHIBIDO:

1. **No fabricar datos:** el valor medido sale de una exportación real aportada por el humano o de la herramienta declarada en `docs/00_stack_manifest.md`. Sin datos, el veredicto es `no_medible`, nunca una estimación.
2. **No mover el umbral:** el veredicto se evalúa contra el umbral y la línea base declarados en la tabla de KPIs, no contra lo que hoy parecería razonable. Si el umbral estaba mal planteado, se dice en la recomendación y se corrige en el PRD para la próxima revisión.
3. **No confundir output con outcome:** "se entregaron las funciones" no es un resultado. Solo cuenta el cambio medido en el KPI.
4. **No sobreinterpretar:** si la ventana de medición no se completó, la muestra es insuficiente o hay un cambio externo que explica el resultado (temporada, otro lanzamiento), el veredicto es `no_concluyente` y se explica por qué.
5. **No decidir por el humano:** mantener, iterar, pivotar o retirar se confirma en la PAUSA HitL.
6. **No guardar datos personales:** la exportación que se versiona es agregada; se eliminan identificadores de personas antes de escribirla.

---

## Pipeline de Ejecución Secuencial por Fases

### Fase 0: Inventario de KPIs a Medir

1. Leer las tablas de KPIs de `docs/01_product_definition/01_product_discovery.md` y `docs/01_product_definition/02_prd.md`.
2. Seleccionar los KPIs con **fecha de revisión vencida** (o los que pida el humano).
3. Si un KPI está en prosa o no declara fuente, línea base o umbral, **no se puede medir**: se registra `no_medible` con el motivo y se recomienda completar la tabla (gate `kpi`).
4. Listar `docs/01_product_definition/outcomes/` para el siguiente correlativo e informes previos de los mismos KPIs.

### Fase 1: Obtención de Datos

1. Pedir al humano la exportación de cada fuente declarada, o consultarla si la herramienta está aprobada en el stack manifest.
2. Guardar los datos **agregados y sin datos personales** en `docs/01_product_definition/outcomes/data/OUT-{NNN}/`.

### Fase 2: Veredicto por KPI

| Veredicto | Cuándo |
| :--- | :--- |
| `cumplido` | El valor medido alcanza el umbral de éxito dentro de la ventana |
| `no_cumplido` | La ventana se completó y el valor no alcanza el umbral |
| `no_concluyente` | Ventana incompleta, muestra insuficiente o un factor externo explica el resultado |
| `no_medible` | No hay datos, o el KPI no declara fuente, línea base o umbral |

Cada veredicto distinto de `no_medible` cita el archivo de datos y el cálculo que lo sostiene.

### Fase 3: Recomendación y PAUSA HitL

Proponer una recomendación argumentada para la capacidad o el producto:

| Recomendación | Cuándo |
| :--- | :--- |
| `mantener` | Los KPIs se cumplen; seguir midiendo en la próxima revisión |
| `iterar` | El problema está bien elegido pero la solución rinde por debajo: nueva idea con `/momoy-spec` |
| `pivotar` | La evidencia sugiere otro problema u otro segmento: nueva hipótesis con `/momoy-experiment` |
| `retirar` | La capacidad no aporta: retirada (etapa 12) |

Presentar veredictos, datos y recomendación al humano y **detenerse**. Prohibido escribir la recomendación final sin su decisión.

### Fase 4: Persistencia

1. Escribir `docs/01_product_definition/outcomes/OUT-{NNN}-{slug}.md` (formato abajo): `status: draft` y `recommendation: pendiente` mientras falte la decisión; `closed` con la recomendación decidida.
2. Si los KPIs siguen vigentes, proponer al humano la **próxima fecha de revisión** en la tabla de KPIs.
3. Ejecutar `python3 .agents/scripts/check_spec_artifacts.py --changed` y corregir los hallazgos del gate `resultado`.
4. **Reporte final:** usar la **Plantilla B** de [`rules/00_output_reporting_standard.md`](../../../rules/00_output_reporting_standard.md).

---

## Formato de Salida

```markdown
---
document: outcome_report
id: OUT-NNN
version: 1.0.0
status: draft               # draft | closed
measured_on: AAAA-MM-DD
source_doc: docs/01_product_definition/02_prd.md
recommendation: pendiente   # pendiente | mantener | iterar | pivotar | retirar
---

# OUT-NNN: [Producto o capacidad medida]

## Veredicto por KPI

| KPI | Línea base | Umbral de éxito | Valor medido | Veredicto |
|---|---|---|---|---|
| [Nombre exacto de la tabla de KPIs] | [...] | [...] | [...] | cumplido |

## Datos
[Archivos en `data/OUT-NNN/` y cálculo de cada valor medido.]

## Recomendación
[Recomendación del agente, decisión del humano y próxima fecha de revisión.]
```

El nombre de cada KPI debe coincidir con el de la tabla de KPIs: así el gate `resultado` sabe qué KPIs con fecha vencida ya tienen informe.
