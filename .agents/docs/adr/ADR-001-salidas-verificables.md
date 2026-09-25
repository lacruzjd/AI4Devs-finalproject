---
document: architecture_decision_record
adr: 001
version: 1.0.0
status: proposed
date: 2026-09-25
---

# ADR-001: Cómo hacer verificable lo que una skill dice que produce

- **ID:** ADR-001
- **Estado:** `Proposed` — a la espera de decisión humana
- **Fecha:** 2026-09-25
- **Ámbito:** el propio momoy, no un proyecto consumidor
- **Implementado por:** pendiente de decisión

---

## 1. Contexto

Cada skill declara en su frontmatter un campo `outputs:` con lo que produce. Medido sobre el árbol real del framework, esas salidas se reparten en tres clases muy distintas:

| Clase | Nº | Ejemplo |
|:---|--:|:---|
| El campo **es** una ruta de archivo | 41 | `docs/01_product_definition/02_prd.md` |
| La ruta está **dentro de la prosa** | 12 | "Scripts de carga en `e2e/performance/` o `tests/load/`" |
| **Ninguna ruta** | 39 | "Suite TDD en verde", "Dictamen de aprobación de la dependencia" |

Los gates de `check_spec_artifacts.py` comprueban propiedades de archivos que existen. Por construcción sólo alcanzan la primera clase: las otras 51 salidas dependen de que el agente informe con veracidad, sin nada que lo contraste.

El reparto no es casual. Las skills de especificación producen casi todo lo verificable; las de desarrollo y calidad, casi todo lo opaco. Es decir: **momoy verifica con rigor la etapa donde se decide y confía en la palabra del agente justo en la etapa donde se ejecuta.**

La causa no es que el desarrollo no deje rastro. Instanciando el framework sobre un stack concreto, casi todas las salidas opacas resultan ser archivos con nombre —un esquema, una migración, un fichero de configuración—. Lo que falta no es la huella: es la **declaración** de dónde está.

### Test decisivo

Una salida es verificable si un script, leyendo sólo el repositorio y sin creer al agente, puede decidir si existe.

### Qué no se decide aquí

No se decide cambiar ningún gate existente, ni añadir salidas nuevas a ninguna skill, ni tocar el contenido de ningún procedimiento. Sólo cómo se declara y se comprueba lo que ya se produce.

---

## 2. Opciones consideradas

### Opción A — Resolver la ruta en el propio `outputs:`

El campo pasa a admitir patrones que se resuelven contra `docs/00_stack_manifest.md` del proyecto consumidor (el directorio de pruebas, el de migraciones, el mecanismo de tokens). Una skill declararía su salida como un patrón y el gate lo expandiría antes de comprobarlo.

- Rompe el contrato de las 42 skills a la vez: cambio MAYOR del framework.
- Acerca el frontmatter al stack, que es justo lo que `check_agnosticism.py` vigila.
- No cubre lo que nunca será un archivo ("cobertura de mutación por encima del umbral").

### Opción B — Declarar las rutas reales al cerrar el ticket

El frontmatter no cambia. Cada skill, al terminar, deja en el ticket la lista de rutas que efectivamente tocó, ya resueltas contra el manifiesto.

- Barato y sin ruptura de contrato.
- Pero es otra vez la palabra del agente: nada compara esa lista con lo que de verdad cambió.

### Opción C — Declarar y contrastar contra el diff

La Opción B más un gate que compara la lista declarada en el ticket con los archivos que realmente aparecen en el commit de ese ticket.

- El control de versiones es universal: no acopla el framework a ningún stack, lenguaje ni gestor de paquetes.
- Detecta las dos mentiras posibles: declarar un archivo que no se tocó, y tocar archivos que el ticket no declara.
- Coste: un gate nuevo con sus tests, y una sección obligatoria en el ticket.

---

## 3. Matriz comparativa

| Criterio | A — frontmatter | B — declarar al cerrar | C — declarar y contrastar |
|:---|:---|:---|:---|
| Rompe contrato | Sí, MAYOR en 42 skills | No | No |
| Acopla a un stack | Riesgo alto | No | No |
| Lo verifica un script | Sí | No | Sí |
| Detecta una salida no producida | Sí | No | Sí |
| Detecta trabajo no declarado | No | No | Sí |
| Coste de implantación | Alto | Bajo | Medio |

---

## 4. Recomendación

**Opción C.** Es la única que supera el test decisivo sin acoplar el framework a ninguna tecnología: el diff de un commit es comprobable en cualquier proyecto que use control de versiones, que es la única herramienta que momoy ya da por supuesta.

La Opción A resuelve menos y cuesta más: rompería 42 contratos para acabar necesitando igualmente una comprobación de ejecución, porque hay resultados que ningún patrón de ruta describe.

---

## 5. Consecuencias

**Si se acepta:**
- Aparece una sección obligatoria de rutas producidas en la plantilla de ticket, y el gate que la contrasta.
- Las skills de desarrollo ganan un paso de cierre: declarar qué tocaron.
- La cobertura verificable del framework deja de depender de la etapa: lo que se ejecuta pasa a comprobarse igual que lo que se especifica.

**Lo que seguirá fuera de alcance:** los resultados que no son archivos (umbrales de cobertura, veredictos de auditoría). Para esos, la evidencia tendría que venir del informe de la propia herramienta, y eso es otra decisión.

**Si se rechaza:** queda documentado que la opacidad de las etapas de ejecución es deliberada y no un descuido, y el mapa de sistema debe decirlo así en lugar de presentarlo como un hallazgo abierto.

---

## 6. Alternativas descartadas sin desarrollar

- **Obligar a que toda salida sea un archivo.** Convertiría veredictos en documentos ceremoniales escritos para satisfacer un gate, que es exactamente el gate hueco que las reglas de reporte prohíben.
- **Comprobar la ejecución leyendo la sesión del agente.** No es reproducible ni auditable por un tercero: el repositorio sería la única fuente de verdad legítima y ahí no queda rastro.
