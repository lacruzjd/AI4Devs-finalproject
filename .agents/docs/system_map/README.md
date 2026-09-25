# Mapa de sistema de momoy

`momoy_system_map.html` es una lectura de momoy como **sistema**, no como índice de archivos: frontera, entradas, cadena de transformación, lazos de realimentación y las cuatro capas del arnés. Existe para poder razonar sobre el conjunto sin leerlo entero.

Ábrelo directamente en un navegador (doble clic o `file://`). No necesita servidor, build ni dependencias; es un único archivo autocontenido. Sin conexión funciona igual, con tipografías del sistema en lugar de las declaradas.

## Qué contiene

| Sección | Qué responde |
|:---|:---|
| 1. Mapa de sistema | Por dónde entra el trabajo, qué lo transforma y qué devuelve al entorno |
| 2. Capas | Qué depende de qué, y qué parte es portátil |
| 3. Ciclo | Las doce etapas del ciclo de vida y qué comando cubre cada una |
| 4. Lazos | Qué corrige cada realimentación y en cuánto tiempo |
| 5. Frontera | Qué vive en `.agents/`, qué vive en el proyecto y qué cruza entre ambos |
| 6. Catálogo | Los comandos, workflows y skills con su ruta y versión reales, filtrables |
| 7. Artefactos | Qué deja en disco cada etapa, y qué salidas no dejan rastro verificable |
| 8. Paradas | Simulación de cinco cascadas reales: dónde se detiene el sistema a pedir una decisión |
| 9. Crecer | Dónde va cada cosa nueva y qué filtro debe pasar antes de existir |
| 10. Diseño | Cómo leer los diagramas: qué codifica cada recurso visual |

## Mantenerlo honesto

El catálogo y el árbol de artefactos se generaron leyendo el árbol real de `.agents/` —ruta, versión del frontmatter, procedimiento al que delega cada comando y campo `outputs:` de cada skill—, pero el archivo **no se regenera solo**: es documentación, no un guardia. Al añadir o renombrar una skill, un workflow o un comando, actualiza las constantes `NODOS` y `ARTEFACTOS` al final del HTML, y las cifras de la portada si cambian.

La sección 8 simula el recorrido de los workflows `00_greenfield`, `01`, `02` y `10` y de la rama de diseño (`SK-05`), con sus paradas humanas. No ejecuta nada: si esos workflows cambian sus fases, hay que actualizar la constante `FLUJOS`.

Las secciones 7 y 8 comparten un mismo caso de ejemplo —una idea concreta, las decisiones humanas que la moldearon y los archivos que dejó— tras un único interruptor y etiquetado como ilustración. No es parte de momoy ni de su contrato: sirve para mostrar qué salidas dependen del stack y cuáles no. Vive en las constantes `EJEMPLO`, `EJ_RESP` y `NODE_EJ`.

La fuente de verdad sigue siendo [`README.md`](../../README.md) y lo que verifica [`validate_agents.sh`](../../scripts/validate_agents.sh). Si este mapa y el repositorio discrepan, el equivocado es el mapa.
