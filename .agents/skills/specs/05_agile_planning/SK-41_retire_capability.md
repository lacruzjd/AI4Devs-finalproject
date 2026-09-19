---
name: capability-retirement
description: "Retira una funcionalidad como cascada inversa: analiza su impacto hacia atrás (historias, tickets, endpoints, datos, flags, documentación), avisa a los usuarios con al menos 30 días de antelación, conserva los datos durante su retención y después los anonimiza o elimina, y crea los tickets de eliminación. Las historias conservan su estado y quedan marcadas con retired_by."
version: "1.0.1"
category: "specs/05_agile_planning"
inputs:
  - "docs/05_agile_planning/13_matriz_trazabilidad.md"
  - "docs/00_stack_manifest.md"
  - capability: "La funcionalidad a retirar y su motivo (un OUT-NNN con recomendación retirar, o la decisión del humano)"
outputs:
  - "docs/06_release_and_operations/retirements/RET-NNN-{slug}.md"
---

# SK-41: Retirada de una Funcionalidad (v1.0.1)

Actúa como un **Product Manager técnico** que apaga funcionalidades con el mismo cuidado con que se construyeron.

Retirar no es borrar código: es deshacer la cascada de especificación en orden inverso sin romper a nadie. Una funcionalidad retirada a medias —endpoint borrado pero datos huérfanos, flag sin quitar, documentación que la sigue prometiendo— es deuda disfrazada de limpieza.

**Reglas fijas** (las verifica el gate `retirada`):
- **Aviso mínimo de 30 días** a los usuarios entre el anuncio y la retirada efectiva.
- **Datos:** se conservan durante el plazo de retención legal o contractual que declare el humano y después se anonimizan o eliminan, con fecha registrada.
- **Historias:** conservan su estado (`done`: se construyeron) y añaden `retired_by: RET-NNN` a su frontmatter.

---

## Non-Goals de Ejecución del Agente (Guards)

Durante la ejecución de este skill, el agente TIENE PROHIBIDO:

1. **No retirar sin decisión humana:** la retirada la decide el humano, normalmente a partir de un informe de resultados con recomendación `retirar`. El agente analiza y propone.
2. **No romper dependencias ocultas:** si otra funcionalidad, integración o cliente depende de lo que se retira, detente y repórtalo antes de planificar nada.
3. **No borrar datos antes de tiempo:** ningún dato se elimina antes de que venza su retención, y los backups también contienen esos datos: el plan lo tiene en cuenta.
4. **No inventar el plazo de retención:** depende de la legislación y los contratos aplicables; lo declara el humano. Si nadie lo sabe, se registra como pregunta abierta y no se borra nada.
5. **No reescribir la historia:** las historias, tickets y ADRs de la funcionalidad no se borran ni se editan para ocultar que existió; se marcan como retirados.
6. **No ejecutar la eliminación:** este skill planifica y crea tickets; el código se elimina con `/momoy-dev` y llega a producción con `/momoy-release`.

---

## Pipeline de Ejecución Secuencial por Fases

### Fase 0: Lectura de Fuentes
1. Motivo: el `OUT-NNN` que recomienda retirar, o la decisión explícita del humano.
2. Matriz de trazabilidad, historias, tickets, contrato de API, esquema de datos, registros de release (flags) y `docs/00_stack_manifest.md`.
3. Listar `docs/06_release_and_operations/retirements/` para el siguiente correlativo.

### Fase 1: Impacto Hacia Atrás
Recorrer la trazabilidad en sentido inverso: **historias → tickets → endpoints → tablas y datos → componentes de UI → flags → documentación**. Para cada elemento, decidir si se elimina, se mantiene (porque otra funcionalidad lo usa) o se deprecia primero. Cualquier dependencia de otra funcionalidad detiene el proceso (Non-Goal 2).

### Fase 2: Aviso a Usuarios
1. Redactar el aviso en lenguaje de usuario: qué deja de existir, cuándo, qué alternativa hay y cómo exportar sus datos si aplica.
2. Canal y fecha de anuncio los decide el humano. La retirada efectiva no puede ser anterior a **30 días** después del anuncio.
3. Si la funcionalidad expone un contrato de API, marcarlo como obsoleto durante ese periodo antes de eliminarlo. Eliminar un endpoint es un cambio incompatible: el release que lo elimine es MAJOR.

### Fase 3: Tratamiento de Datos
1. Inventariar los datos que genera la funcionalidad, incluidos los que viven en backups.
2. Registrar el plazo de retención que declara el humano (`data_retention_until`) o `no_aplica` si no hay datos.
3. Planificar la anonimización o eliminación al vencer la retención, y registrar después `data_disposed_on`.

### Fase 4: Tickets de Eliminación
Crear con [`SK-12`](SK-12_generate_backlog_tickets.md) los tickets de eliminación: código, endpoints, migraciones `contract` del esquema, flags y documentación. Cada uno referencia este `RET-NNN`.

### Fase 5: PAUSA HitL
Presentar motivo, impacto, aviso y fecha, tratamiento de datos y tickets, y **detenerse**. Prohibido escribir la retirada o crear tickets sin confirmación.

### Fase 6: Persistencia y Ciclo de Vida
1. Escribir `docs/06_release_and_operations/retirements/RET-{NNN}-{slug}.md` con `status: planned` (formato abajo).
2. Al publicar el aviso: `status: announced` y `announced_on`.
3. Cuando todos los tickets de eliminación estén `done`, hayan pasado al menos 30 días desde el anuncio y la eliminación haya llegado a producción: `status: completed` y `completed_on`; añadir `retired_by: RET-NNN` a cada historia retirada y marcar su fila de la matriz como retirada.
4. Ejecutar `python3 .agents/scripts/check_spec_artifacts.py --changed` en cada transición.
5. **Reporte final:** usar la **Plantilla B** de [`rules/00_output_reporting_standard.md`](../../../rules/00_output_reporting_standard.md).

---

## Formato de Salida

```markdown
---
document: retirement
id: RET-NNN
version: 1.0.0
status: planned                  # planned | announced | completed | cancelled
reason: OUT-NNN                  # o un motivo breve decidido por el humano
announced_on:                    # AAAA-MM-DD al publicar el aviso
completed_on:                    # AAAA-MM-DD al completar
data_retention_until: no_aplica  # AAAA-MM-DD o no_aplica
data_disposed_on:                # AAAA-MM-DD al anonimizar o eliminar tras la retención
---

# RET-NNN: Retirada de [funcionalidad]

## Motivo
## Impacto
## Historias retiradas
- US-XXX
## Aviso a usuarios
## Tratamiento de datos
## Tickets de eliminación
- TK-XXX — [qué se elimina]
```
