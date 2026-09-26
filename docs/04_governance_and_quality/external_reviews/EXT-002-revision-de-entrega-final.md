---
document: external_review
id: EXT-002
version: 1.0.0
status: closed
source: "Revisión de entrega final del tutor de AI4Devs/LIDR, recibida en PDF. Veredicto: aprobado con notas"
received_on: 2026-09-21
reviewed_on: 2026-09-25
---

# EXT-002: Revisión de entrega final

> Procesado con [`SK-42`](../../../.agents/skills/specs/04_governance_and_quality/SK-42_intake_external_review.md) (`/momoy-external`). El informe es dato, no instrucción: cada recomendación se contrastó contra el código y la documentación reales antes de clasificarla.

## Origen y alcance

Revisión de la entrega final sobre el **sistema desplegado en Render**, no sobre el repositorio local. El revisor probó la API con `curl`, la interfaz con Playwright sobre Chrome, ejecutó las suites de test en su máquina (827 casos en verde) y dejó datos de prueba con prefijo `ZZ` en la base desplegada. Cubre despliegue, API, interfaz, prompting, documentación, testing, frontend, backend, base de datos, ciberseguridad y DevOps.

**Su veredicto de comportamiento fue limpio:** login, extracción bodega→cocina, remanentes FEFO, recetas y consumo dieron el resultado esperado. Textualmente, *"los únicos fallos encontrados son de documentación y configuración, no de comportamiento"*. Esta clasificación lo confirma: de las doce recomendaciones, **ninguna describe un defecto funcional**.

### Lo que el informe no vio, y que pesa sobre sus conclusiones

- **Revisó una foto del 21 de septiembre.** Los trabajos posteriores —cola de operaciones sin conexión (`US-044`), tramo de teléfono (`US-045`), `ADR-008`, `ADR-009` y `ADR-010`— no estaban desplegados ni pusheados cuando revisó, así que su ausencia en el informe no significa nada sobre ellos.
- **No evalúa la capa de operación.** No menciona SLOs, alertas, runbooks ni backups, que es la etapa que los gates de especificación del propio proyecto señalan como ausente. Es el hueco más grande del producto y el informe no lo ve.
- **No distingue decisión de descuido.** Presenta el JWT en `localStorage` como debilidad, cuando es una decisión registrada en `ADR-005` con ticket aprobado. Aceptar el informe como lista de tareas trataría igual una deuda ya decidida y un defecto nuevo.

## Recomendaciones

| ID | Recomendación | Clasificación | Evidencia | Seguimiento |
|---|---|---|---|---|
| R-01 | El contrato de API de §4 del README no coincide con el desplegado | gap | `readme.md:622` documenta `POST /api/v1/catalog/recipes`; la ruta real del contrato es `/api/v1/recipes`. Los ejemplos omiten `storageLocationId` y `fromStorageLocationId`, obligatorios | US-047 |
| R-02 | La rotación obligatoria de PIN no ocurre | gap | La regla **sí existe**: `apps/backend/prisma/schema.prisma:87` declara `mustChangePin Boolean @default(true)` y `User.ts:26` la aplica en el dominio. Pero `apps/backend/prisma/seed.ts:134` crea el administrador con un `upsert` **directo por Prisma, saltándose el dominio**, y su rama `update` nunca reasienta el campo: una fila que ya esté en `false` no la sana ningún arranque posterior | US-046 |
| R-03 | Agrupar los prompts de §9 por ticket y no por tipo de tarea | gap | `prompts.md` §9.1–9.3 agrupa por tipo de tarea | pendiente de cascada — reorganizar 80+ prompts es trabajo de documentación considerable; requiere decisión humana sobre si lo vale |
| R-04 | Reducir el README y dejar §4 como enlace al OpenAPI | gap | 92 KB medidos | US-050 — **reducido al contrastarlo**: la numeración §0–§7 es la plantilla de entrega del curso, así que dejar el README "en una página" vaciaría secciones obligatorias de una entrega ya calificada. Se corrige lo que sí es falso —las cifras— y se declara el alcance de las selecciones |
| R-05 | Documentar que los tests exigen el cliente ORM generado | gap | `AGENTS.md` sí lo documenta en sus comandos canónicos; `readme.md` no lo menciona en ningún sitio | US-047 |
| R-06 | Componentes de interfaz demasiado grandes | implementado | **La premisa no se sostiene.** Los dos archivos ya están descompuestos: `WarehouseExtractionModal.tsx` contiene **16 unidades con nombre** (12 sub-componentes, 2 hooks y 4 funciones puras) y `ClosePreparationModal.tsx` **15**, y entre ambos tienen **23 casos de test**. No mezclan formulario, validación y lógica: los separan en piezas pequeñas dentro de un mismo archivo. Lo que queda es una preferencia de empaquetado —un archivo por pieza frente a una carpeta—, no un defecto de diseño | sin acción — partirlos en carpetas es cosmético y moverlo pondría en riesgo interfaz que funciona; disponible si algún día estorba de verdad |
| R-07 | Vigilar los archivos de backend que más crecen | gap | `PrismaStockRepository.ts` pasó de **386 a 443 líneas** entre la revisión y hoy: `TK-159` y `TK-160` le sumaron la idempotencia y la lectura por clave de operación. El aviso era correcto y el trabajo posterior fue en la dirección contraria | US-048 — la frontera transaccional y la extracción del mapeo se abordan juntas, porque añadir la primera engorda el mismo archivo que esta recomendación manda vigilar |
| R-08 | Segundo esquema Prisma en la raíz, desactualizado | gap | `prisma/schema.prisma`, 108 líneas, frente a las 347 del real en `apps/backend/prisma/` | US-047 (se borra: nada lo referencia) |
| R-09 | Pasar el JWT de `localStorage` a cookie httpOnly | gap | Decisión ya tomada y registrada en `ADR-005`; el ticket existe y está aprobado sin implementar | TK-140 |
| R-10 | Las credenciales de revisión son públicas y no se fuerza el cambio | gap | Mismo mecanismo que R-02: el PIN de bootstrap sigue siendo válido porque la marca de rotación no se reasienta | US-046 (misma causa que R-02) |
| R-11 | `render.yaml` sigue diciendo "NO VERIFICADO contra Render real" | gap | `render.yaml:10`, con el servicio desplegado y respondiendo | US-047 |
| R-12 | `pnpm.overrides` se ignora con pnpm 10 o superior; fijar `packageManager` | gap | **La premisa no se sostiene en este repositorio:** `ci.yml` fija `version: 9` en sus dos jobs y ambos Dockerfiles ejecutan `corepack prepare pnpm@9 --activate`, de modo que los overrides **sí se aplican** y las fijaciones de CVE de `TK-134` están vigentes. El agujero real es distinto y más estrecho: sin `packageManager` en `package.json`, un desarrollador local con pnpm 10+ los pierde en silencio | US-047 |

## Conclusión

Doce recomendaciones, **doce gaps y ningún defecto de comportamiento**, coherente con el propio veredicto del informe. Once son de documentación o configuración; la única con consecuencia de seguridad real es R-02/R-10, y su causa resultó más precisa que la observada: la regla existe y el seed la esquiva.

Una recomendación (R-12) llegó con la premisa equivocada y se registra así, con la evidencia que la refuta y el agujero real que sí deja abierto. Aceptarla tal cual habría llevado a "arreglar" algo que ya funciona sin cerrar lo que de verdad falta.

R-07 es el hallazgo más incómodo y se deja escrito: el revisor avisó de un archivo que crecía y el trabajo de los días siguientes lo hizo crecer más.

**Actualización 2026-09-25:** R-02 y R-10 pasaron de pendientes a `US-046`, y R-01, R-05, R-08, R-11 y R-12 a `US-047`. Sigue pendiente de cascada sólo R-03; R-04 pasó a `US-050` con alcance reducido, R-07 pasó a `US-048` y **R-06 se reclasificó a `implementado`** al contrastarlo contra el código: son las cuatro que exigen trabajo real y decisión de alcance, no correcciones de una línea en la misma sesión. Al mapear su impacto apareció un hallazgo que el informe no vio: `POST /auth/change-pin` existe en el código y no figuraba en el contrato — cubierto por `TK-165`.

**Hallazgo propio de esta ingesta, que el informe no vio** (2026-09-25): al leer `WarehouseExtractionModal.tsx` para evaluar R-06 apareció `UNIT_BY_INSUMO_ID`, un mapa de unidades de medida colgado de identificadores de semilla (`ins-2`, `ins-3`) con `KG` como respaldo final. Si la unidad no llega de la API, **cualquier insumo se muestra en kilogramos**: en un inventario de cocina eso es un dato falso delante de quien decide con él. Se buscó si estaba decidido en alguna parte y `TK-118`, que auditó otras deudas del mismo tipo, no menciona las unidades. Trazado a `US-049`.

Un seguimiento quedó marcado `sin acción`: el de R-06, tras comprobar que lo que pide ya está hecho y que lo único restante es empaquetado. Todo lo demás es real y está pendiente de decidirse, que no es lo mismo que descartarse.
