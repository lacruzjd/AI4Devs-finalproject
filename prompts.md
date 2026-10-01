> Este archivo documenta los prompts estratégicos estructurados bajo la metodología de Spec-Driven Development (SDD) y Verified Spec-Driven Development (VSDD) para guiar a los asistentes de código (Gemini con IDE Antigravity) de manera determinista y profesional.


## Índice

1. [Descripción general del producto](#1-descripción-general-del-producto)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Especificación de la API](#4-especificación-de-la-api)
5. [Historias de usuario](#5-historias-de-usuario)
6. [Tickets de trabajo](#6-tickets-de-trabajo)
7. [Pull requests](#7-pull-requests)
8. [Refactor de Complejidad y Mantenibilidad](#8-refactor-de-complejidad-y-mantenibilidad)
9. [Entrega Final — Desarrollo Iterativo VSDD](#9-entrega-final--desarrollo-iterativo-vsdd-tk-063--tk-176)

---

## 1. Descripción general del producto

**Prompt 1 Descubrimiento del Problema e Idea de Producto:**
```md
Usando el skill de Descubrimiento de Producto en `.agents/skills/specs/01_product_definition/SK-01_discover_product_vision.md`, analiza la siguiente idea de producto:

"Hay cierta incertidumbre en el uso de los insumos almacenados en el área de depósito de un restaurante, no se sabe a ciencia cierta quien accede a estos y cual es su finalidad.

Para resolver esta situación, se propone desarrollar una aplicación web que permita controlar el movimiento de los insumos del almacén, registrando que empleado realiza cada movimiento, la cantidad, fecha y el destino del producto.

En cada movimiento, se deberá registrar la fecha, el empleado, tipo de movimiento, almacén involucrado, detalle del movimiento.

Adicionalmente, en caso de ser usado un insumo se debe registrar la fecha, empleado operario, detalles del insumo, la cantidad usada, una descripción de su uso.

Poder rastrear el uso parcial de un producto y saber dónde queda almacenado.

La aplicación permitirá registrar empleados, tipos de movimientos, productos, marcas, áreas del restaurante, almacenes, tipos de almacenes, así como los detalles de cada movimiento y el stock de productos por almacén, uso y el destino del remanente."

---

Genera el documento con un tono directo, sumamente riguroso y en formato Markdown limpio. Comienza directamente en el análisis de la Fase 1 sin preámbulos conversacionales.

Guarda el archivo como "docs/01_product_definition/01_product_discovery.md"

```

### Respuesta del Agente de IA:
El documento completo con el análisis de la concepción del producto se encuentra en:
* [docs/01_product_definition/01_product_discovery.md](docs/01_product_definition/01_product_discovery.md)


### Nota de control humano: 
Se hicieron algunos cambios al archivo generado por el agente adoptando un rol de un operario autorizado para las traslaciones y descartes, ya que el agente sugirió que cualquier operario podría realizar traslaciones y descartes, lo cual no es correcto, solo el operario autorizado puede realizar traslaciones y descartes.

**Prompt 2 Generación del PRD (Product Requirements Document):**

```md
Usando el skill de Generación del PRD en `.agents/skills/specs/01_product_definition/SK-02_generate_prd.md`, analiza el documento de concepción de producto `docs/01_product_definition/01_product_discovery.md` para generar el PRD de RestoStock.

```

### Respuesta del Agente de IA:
El documento completo de requisitos de producto (PRD) se encuentra en:
* [docs/01_product_definition/02_prd.md](docs/01_product_definition/02_prd.md)

### Nota de control humano:
El PRD fue revisado y aprobado para comenzar con el desarrollo. Se unificó la meta de la Tasa de Rotación de Remanentes (TRR) a 24 horas para mantener consistencia con el documento de framing.


**Prompt 3 Especificación Técnica de Arquitectura y Persistencia:**

```md
Usando el skill de Modelo de Dominio en `.agents/skills/specs/02_architecture_design/SK-03_design_domain_model.md`, analiza el PRD `docs/01_product_definition/02_prd.md` para generar la especificación técnica en `docs/02_architecture_design/03_domain_model.md`.
```

### Respuesta del agente de IA:
El documento completo de diseño de arquitectura y persistencia se encuentra en:
* [docs/02_architecture_design/03_domain_model.md](docs/02_architecture_design/03_domain_model.md)

### Nota de control humano:
La revision del archivo docs/02_architecture_design/03_domain_model.md fue completada y aprobada para continuar con las especificaciones tecnicas, para continuar a mas detalla con la seccion de Arquitectura del Sistema a continuacion.

---

## 2. Arquitectura del Sistema

### **2.1. Diagrama de arquitectura:**

**Prompt 1:**
Generación de Diagramas Mermaid Integrados
``` md 
Usando el skill de Diseño Técnico en `.agents/skills/specs/02_architecture_design/SK-04_design_technical_architecture.md`, analiza los archivos `docs/01_product_definition/02_prd.md` y `docs/02_architecture_design/03_domain_model.md` para generar el diagrama C4 de la arquitectura física y lógica en Mermaid en `docs/02_architecture_design/04_technical_design.md`.
```

#### Respuesta del agente de IA:
El diagrama completo de arquitectura física y lógica se encuentra en:
* [docs/02_architecture_design/04_technical_design.md](docs/02_architecture_design/04_technical_design.md)

--- 

### **2.2. Descripción de componentes principales:**

**Prompt 1:**
Definición de Capas y UI/UX
```md 
Usando el skill de Asistente UI/UX y Capas en `.agents/skills/specs/02_architecture_design/SK-05_design_ui_ux_system.md`, analiza `docs/01_product_definition/02_prd.md` y `docs/02_architecture_design/03_domain_model.md` para estructurar la sección "2.2. Descripción de componentes principales" en `docs/02_architecture_design/05_ui_ux_design_system.md`.

```

#### Respuesta del agente de IA:
La especificación completa del sistema de diseño UI/UX, tokens HSL, ergonomía táctil y exportación al estándar [`DESIGN.md`](DESIGN.md) de Google Labs se encuentra en:
* [docs/02_architecture_design/05_ui_ux_design_system.md](docs/02_architecture_design/05_ui_ux_design_system.md)
* [DESIGN.md](DESIGN.md)

#### Nota de control humano:
Se auditó la generación de `DESIGN.md` utilizando el linter oficial de Google Labs (`npx @google/design.md lint DESIGN.md`), verificando 0 errores, 0 advertencias y pleno cumplimiento de WCAG 2.2 AA en contrastes de color y áreas táctiles de 48px.

---

### **2.3. Descripción de alto nivel del proyecto y estructura de ficheros**

**Prompt 1:**
```md
Usando el skill de Diseño Técnico en `.agents/skills/specs/02_architecture_design/SK-04_design_technical_architecture.md`, analiza los archivos de diseño y arquitectura en `./docs/` para generar la jerarquía exacta de ficheros combinando Vertical Slices y Arquitectura Hexagonal en `docs/02_architecture_design/04_technical_design.md`.

```

#### Respuesta del agente de IA:
La estructura completa del directorio del proyecto (monorepo con Frontend Next.js y Backend Express) se encuentra en:
* [docs/02_architecture_design/04_technical_design.md](docs/02_architecture_design/04_technical_design.md)


#### Nota de control humano:


### **2.4. Infraestructura y despliegue**

**Prompt 1:**

Pipeline de CI/CD Seguro y Despliegue

```md
Usando el skill de Pipeline CI/CD en `.agents/skills/specs/04_governance_and_quality/SK-10_configure_cicd_pipeline.md`, genera el pipeline de GitHub Actions en `.github/workflows/ci.yml`.
```

#### Respuesta del agente de IA:
La configuración detallada y limpia del pipeline de GitHub Actions se encuentra en:
* [.github/workflows/ci.yml](.github/workflows/ci.yml)

#### Nota de control humano:

---

### **2.5. Seguridad**

**Prompt 1:**
```md
Usando el skill de Ciberseguridad en `.agents/skills/specs/04_governance_and_quality/SK-08_define_security_strategy.md`, analiza el PRD y el modelo de datos para generar la estrategia de seguridad y mitigación de vulnerabilidades en `docs/04_governance_and_quality/08_security_strategy.md`.
```

### Respuesta del agente de IA:
La estrategia de seguridad detallada y alineada con OWASP se encuentra en:
* [docs/04_governance_and_quality/08_security_strategy.md](docs/04_governance_and_quality/08_security_strategy.md)

### Nota de control humano:

---   

### **2.6. Tests**

**Prompt 1:**
```md
Usando el skill de Estrategia de Pruebas en `.agents/skills/specs/04_governance_and_quality/SK-09_define_testing_strategy.md`, configura la directiva de pruebas y testing de TDD en `docs/04_governance_and_quality/09_testing_strategy.md`.
```

### Respuesta del agente de IA:
La directiva y estrategia de testing detallada (TDD y mocks mínimos) se encuentra en:
* [docs/04_governance_and_quality/09_testing_strategy.md](docs/04_governance_and_quality/09_testing_strategy.md)

### Nota de control humano:

---   

### 3. Modelo de Datos

**Prompt 1:**
```md
Usando el skill de Base de Datos en `.agents/skills/specs/03_persistence_and_api/SK-06_design_database_schema.md`, genera el esquema declarativo de base de datos para Prisma en `docs/03_persistence_and_api/06_database_schema.md` a partir de `docs/01_product_definition/02_prd.md` y `docs/02_architecture_design/03_domain_model.md`.
```

### Respuesta del agente de IA:
El esquema declarativo de base de datos para Prisma (`schema.prisma`) y su justificación técnica se encuentra en:
* [docs/03_persistence_and_api/06_database_schema.md](docs/03_persistence_and_api/06_database_schema.md)

### Nota de control humano:
Se validó que el archivo destinado a `schema.prisma` sea un archivo ejecutable con sintaxis pura de Prisma, sin bloques Markdown explicativos embebidos, y que cualquier justificación adicional de índices se mantenga en el artefacto de documentación separado.

---

### 4. Especificación de la API

**Prompt 1:**
```md
Usando el skill de Especificación API REST en `.agents/skills/specs/03_persistence_and_api/SK-07_design_api_specification.md`, diseña los contratos de endpoints REST en `docs/03_persistence_and_api/07_api_specification.md` basándote en el PRD y el esquema físico.
```

### Respuesta del agente de IA:
La especificación de la API detallada y alineada con OWASP se encuentra en:
* [docs/03_persistence_and_api/07_api_specification.md](docs/03_persistence_and_api/07_api_specification.md)

### Nota de control humano:
Se garantizó que todas las cantidades y representaciones de tipo Decimal en payloads JSON se serialicen de forma consistente y determinista exclusivamente como strings (cadenas de texto numéricas, ej: `"2.0000"`), indicando su precisión y escala.

---

### 5. Historias de Usuario

**Prompt 1:**
```md
Usando el skill de Historias de Usuario en `.agents/skills/specs/05_agile_planning/SK-11_generate_user_stories.md`, genera el backlog de Historias de Usuario bajo INVEST y BDD Gherkin en las subcarpetas del directorio `docs/05_agile_planning/11_user_stories/{modulo}/` y su respectivo `docs/05_agile_planning/11_user_stories/user_stories_index.md`.

```
### Respuesta del agente de IA:
Las historias de usuario detalladas (en formato INVEST y BDD Gherkin) y su correspondiente índice se encuentran en:
* [docs/05_agile_planning/11_user_stories/user_stories_index.md](docs/05_agile_planning/11_user_stories/user_stories_index.md)

### Nota de control humano:
Se revisó que los escenarios de negocio prohíban saldos negativos en remanentes, y que cualquier descarte sobre un remanente ya CONSUMED o DISCARDED sea explícitamente rechazado sin mutar la base de datos.

---

### 6. Tickets de Trabajo

**Prompt 1:**
```md
Usando el skill de Planificación de Tickets en `.agents/skills/specs/05_agile_planning/SK-12_generate_backlog_tickets.md`, desglosa las historias en tareas atómicas estimadas en las subcarpetas de `docs/05_agile_planning/12_tickets/{modulo}/` y su correspondiente `docs/05_agile_planning/12_tickets/tickets_index.md`.

```

### Respuesta del agente de IA:
La matriz de trazabilidad y las fichas técnicas detalladas de los tickets de trabajo del backlog se encuentran en:
* [docs/05_agile_planning/12_tickets/tickets_index.md](docs/05_agile_planning/12_tickets/tickets_index.md)

### Nota de control humano:
Se corroboró que el manejo de caídas de red en el frontend (TK-007) se mitigue mediante capturas explícitas de promesas asíncronas y actualización de estados de error de data-fetching locales, en lugar de Error Boundaries de React.

---

### 7. Pull Requests

**Prompt 1:**

```md
Usando el skill de Registro de PRs en `.agents/skills/specs/05_agile_planning/SK-15_document_pull_requests.md`, documenta las Pull Requests iniciales reales e integraciones del proyecto e infúndelas en la sección correspondiente de `readme.md`.

```

### Respuesta del agente de IA:
La documentación detallada de las Pull Requests reales se ha integrado en la sección "7. Pull Requests" de [readme.md](readme.md).

### Nota de control humano:
Se auditó la documentación de Pull Requests para asegurar que solo contenga información verídica y verificable del repositorio (evitando la invención de PRs ficticios o pipelines de CI falsos), admitiendo documentar menos de tres PRs cuando no existan más en el historial de Git.

---

## 8. Refactor de Complejidad y Mantenibilidad

### **8.1. Refactor Backend (TK-040)**

**Prompt 1:**
```md
Usando el skill de Refactor en `.agents/skills/development/05_quality_and_lint/SK-19_refactor_and_lint.md`, refactoriza los archivos del backend que superan los umbrales de complejidad ciclomática y longitud de función declarados en la configuración del linter (`complexity`, `max-lines-per-function`), extrayendo colaboradores privados sin alterar el comportamiento existente. Verifica con la suite de pruebas y el gate de calidad ticket-scoped que ningún test se rompa.
```

### Respuesta del agente de IA:
Se refactorizaron 6 archivos extrayendo colaboradores privados (`setupSwaggerDocs`, `buildDefaultRepositories`, `mountApiRoutes` en `app.ts`; `consumeIngredient` en `ConsumeRecipeUseCase`; `autoDiscardExpiredRemanentes` y `reconcilePhysicalCount` en `PerformShiftReconciliationUseCase`; funciones de seeding por entidad en ambos `seed.ts`; lookup `FALLBACK_INSUMO_DISPLAY` en `InMemoryRemanenteQueryRepository`), sin cambios de comportamiento.

### Nota de control humano:
Se verificó que los 46 tests del backend siguieran en verde sin modificar ninguno, que el linter quedara en 0 advertencias, y que la duplicación de código no aumentara.

---

### **8.2. Refactor Frontend (TK-041)**

**Prompt 1:**
```md
Usando el skill de Refactor en `.agents/skills/development/05_quality_and_lint/SK-19_refactor_and_lint.md`, refactoriza los componentes del frontend que superan los umbrales de complejidad ciclomática y longitud de función, extrayendo subcomponentes locales y custom hooks sin alterar el comportamiento existente. Verifica con la suite de pruebas y el gate de calidad ticket-scoped que ningún test se rompa.
```

### Respuesta del agente de IA:
Se refactorizaron 12 archivos: componentes con múltiples estados/secciones inline (`AlertFeed`, `ActiveRemanentesList`, `ReportsDashboard`) se descompusieron en subcomponentes por estado; formularios grandes (`ShiftReconciliationWizard`, `WarehouseExtractionModal`, `RecipeSelectorModal`) extrajeron su estado y handlers a custom hooks; `App.tsx` extrajo su estado a `useDashboardState`/`useModalVisibility` y su JSX a subcomponentes de header, tarjetas resumen y modales; `PinLoginModal.tsx` extrajo header, selector de usuario e indicador de PIN.

### Nota de control humano:
Se verificó que los 52 tests del frontend siguieran en verde sin modificar ninguno, que el linter quedara en 0 advertencias, y que la duplicación de código no aumentara (1.57%, bajo el umbral del 3%).

---

## 9. Entrega Final — Desarrollo Iterativo VSDD (TK-063 – TK-176)

> La Entrega Final se construyó a lo largo de **108 tickets** sobre `finalproject-JDLM`. En vez de transcribir un prompt por ticket, se documentan aquí los **prompts estructurales** que se repitieron como patrón para cada nueva capacidad, remediación de auditoría y cierre de entrega. El detalle ticket a ticket vive en [`docs/05_agile_planning/15_history.md`](docs/05_agile_planning/15_history.md), y la §9.4 traza cada ticket a su prompt patrón.

### **9.1. Nueva capacidad de negocio (cascada spec-before-code, Guard 26)**

**Prompt patrón:**
```md
Nueva capacidad: "<descripción en lenguaje natural>".

Ejecuta la Etapa 1 de `.agents/workflows/01_cascading_spec_workflow.md` ANTES de tocar código de producción: entrada al PRD (SK-02), Historia de Usuario (SK-11), Ticket(s) Técnico(s) (SK-12), Matriz de Trazabilidad (SK-13) y Mapa del Backlog (SK-14). Recién con las fichas aprobadas, implementa con SK-16 (backend) / SK-17 (frontend) y cierra con el gate de calidad ticket-scoped, tests y `oasdiff` si cambia el contrato.
```

### Respuesta del agente de IA:
Se aplicó para las épicas US-014, US-015, US-016/US-025, US-018, US-019/US-020/US-021, US-022/US-023/US-024, US-026→US-029 (ADR-003), US-030 (ADR-004), US-032, US-033, US-034, US-035 y US-036/US-037. Cada una dejó su ficha de US, sus tickets `TK-XXX(-FE)`, filas en la matriz `REQ-XXX` y entrada en `15_history.md`.

### Nota de control humano:
Se hizo cumplir el Guard 26: escribir código antes de la ficha —aunque se reconstruya la spec después en la misma sesión— es en sí una violación. El Guard 28 (interrogatorio de reglas de negocio) se usó para fijar decisiones como la inmutabilidad de `unitOfMeasure` y el congelamiento de composición de recetas con preparaciones cerradas. Restricción transversal explícita: **prohibida la fuga de datos del restaurante (recetas, insumos) al modelo de IA** — verificada en cada ticket del módulo de recetas.

### **9.2. Auditoría de módulo y remediación técnica (carve-out C-DEV-006-4)**

**Prompt patrón:**
```md
Audita el módulo <X> (seguridad / calidad / completitud CRUD / accesibilidad) con el skill correspondiente. Emite el informe en `docs/audits/AUDIT-<TIPO>-<NNN>-*.md` con hallazgos clasificados por severidad.

Para cada hallazgo que sea un DEFECTO de código ya entregado (no una nueva regla de negocio): crea un ticket técnico standalone vía SK-12 (referenciando el audit), impleméntalo y ciérralo con su commit atómico propio. NO reabras el ticket original.
```

### Respuesta del agente de IA:
Auditorías emitidas: AUDIT-SEC-001 (hardening RBAC — escalada de privilegios Crítica), AUDIT-SEC-002 (`/api/v1/roles` sin guard), AUDIT-SEC-003 (rate limiter con bucket compartido), AUDIT-SEC-004 (hardcode de credenciales y auth), AUDIT-DEV-006 (extracción de bodega), AUDIT-DEV-007 (módulo de recetas), AUDIT-DEV-012 (fuga IA + brechas CRUD), AUDIT-DEV-013/014/015 (calidad de TK-129/130/131). Remediaciones: TK-091→094, TK-098→101, TK-110, TK-117, TK-118, TK-125→128, TK-132→135.

### Nota de control humano:
Se validó el test decisivo del carve-out en cada remediación: "¿el product owner o un usuario notaría una diferencia en las reglas de negocio o en el comportamiento visible?" — si sí, cascada completa; si no (mismo resultado, bien construido), ticket técnico directo. Llamar "técnico" a una regla de negocio nueva para saltarse la cascada es en sí una violación del Guard.

### **9.3. Pre-vuelo de CI y smoke test antes del push**

**Prompt patrón:**
```md
Antes del push de la entrega, corre `docs/04_governance_and_quality/scripts/ci_local.sh` (reproduce los 3 jobs de `ci.yml`) y arréglalo si falla. Después levanta la pila completa con `docker compose up` en `NODE_ENV=production` y verifica login + un flujo crítico end-to-end a través del proxy nginx. NO hagas el push.
```

### Respuesta del agente de IA:
`ci_local.sh` (TK-063) destapó, antes del push, CVEs HIGH de septiembre 2026 en dependencias transitivas de Prisma 7 y en el base Alpine del frontend (TK-134), y 4 tests RTL con carrera bajo carga paralela. El smoke test de `docker compose` (Fase 0.2) destapó un fallo de arranque real: `docker-compose.yml` inyectaba `CLIENT_ORIGIN`/`ENCRYPTION_KEY` como cadena vacía y el *fail-fast* de Guard 14 abortaba el backend en bucle (TK-135, regresión de TK-133). Ambos se arreglaron y quedaron con `ci_local.sh` en verde y los 3 contenedores `healthy`.

### Nota de control humano:
El push y el PR quedan explícitamente reservados para la fecha de entrega (2026-09-10); toda la sesión operó bajo la consigna "haz todo menos el push". No hay despliegue público en vivo — la verificación es local vía `docker compose` (readme §0.4).

### **9.4. Índice por ticket**

Respuesta a la revisión del tutor (`EXT-002`, R-03): la §9 agrupa los prompts por tipo de tarea, así que esta tabla los traza **por ticket**. Cada fila dice qué prompt patrón de 9.1–9.3 siguió el ticket y de qué historia, auditoría o incidencia viene.

**Cómo se clasificó:** con el campo `related_story` de cada ficha, no de memoria. Un ticket que cuelga de una historia de usuario sigue el patrón 9.1. Uno técnico o que remedia el hallazgo de una auditoría sigue el 9.2. Uno de pre-entrega o del CI local sigue el 9.3. No se transcribe un prompt por ticket porque esos prompts no se conservaron literalmente, y reconstruirlos sería inventar registro.

Total: 145 tickets (96 del patrón 9.1, 43 del 9.2 y 6 del 9.3). Los tickets desde `TK-145` son posteriores a la entrega del 2026-09-10. La columna **Revisión** marca los que responden a una recomendación del tutor ([`EXT-002`](docs/04_governance_and_quality/external_reviews/EXT-002-revision-de-entrega-final.md)).

| Ticket | Patrón | Qué hace | Origen | Estado | Revisión |
|---|---|---|---|---|---|
| [TK-063](docs/05_agile_planning/12_tickets/shared/backend/TK-063.md) | 9.3 | Script Orquestador `ci_local.sh` (Reproduce CI Localmente) | N/A | hecho |  |
| [TK-064](docs/05_agile_planning/12_tickets/shared/backend/TK-064.md) | 9.3 | Guards 30/31/32 (SecDevOps) — Cierre del Gap Encontrado en TK-063 | N/A | hecho |  |
| [TK-067](docs/05_agile_planning/12_tickets/shared/frontend/TK-067.md) | 9.2 | Migración Visual de Pantallas Táctiles de Cocina al Design System v2.0.0 ("Señal Industrial") | N/A | hecho |  |
| [TK-068](docs/05_agile_planning/12_tickets/shared/frontend/TK-068.md) | 9.2 | Migración Visual del Backoffice al Design System v2.0.0 ("Señal Industrial") | N/A | hecho |  |
| [TK-069](docs/05_agile_planning/12_tickets/recipes/backend/TK-069.md) | 9.1 | Extracción del Módulo `recipes` (independiente de `catalog`) | US-012 | hecho |  |
| [TK-069-FE](docs/05_agile_planning/12_tickets/recipes/frontend/TK-069-FE.md) | 9.1 | Extracción del Feature `recipes` (independiente de `catalog`) | US-012 | hecho |  |
| [TK-070-FE](docs/05_agile_planning/12_tickets/recipes/frontend/TK-070-FE.md) | 9.1 | Recetario — pestaña de recetas con lista, búsqueda y alta en modal | US-012 | hecho |  |
| [TK-071](docs/05_agile_planning/12_tickets/shared/frontend/TK-071.md) | 9.2 | Reemplaza emoji sueltos por íconos lucide-react en Catálogo/Recetario | N/A | hecho |  |
| [TK-072](docs/05_agile_planning/12_tickets/stock/backend/TK-072.md) | 9.1 | Trazabilidad Completa en Extracciones de Bodega (Backend) | US-014 | hecho |  |
| [TK-072-FE](docs/05_agile_planning/12_tickets/stock/frontend/TK-072-FE.md) | 9.1 | Interfaz Táctil para Extracciones con Responsable y Motivo (Frontend) | US-014 | hecho |  |
| [TK-073](docs/05_agile_planning/12_tickets/security/backend/TK-073.md) | 9.1 | Backend Dynamic RBAC | US-015 | hecho |  |
| [TK-073-FE](docs/05_agile_planning/12_tickets/security/frontend/TK-073-FE.md) | 9.1 | Frontend Dynamic RBAC UI | US-015 | hecho |  |
| [TK-074](docs/05_agile_planning/12_tickets/stock/backend/TK-074.md) | 9.1 | Backend Storage Locations API | US-016 | hecho |  |
| [TK-074-FE](docs/05_agile_planning/12_tickets/stock/frontend/TK-074-FE.md) | 9.1 | Frontend Storage Locations UI | US-016 | hecho |  |
| [TK-075](docs/05_agile_planning/12_tickets/settings/backend/TK-075.md) | 9.1 | Backend System Settings API | US-017 | hecho |  |
| [TK-075-FE](docs/05_agile_planning/12_tickets/settings/frontend/TK-075-FE.md) | 9.1 | Frontend System Settings UI | US-017 | hecho |  |
| [TK-076](docs/05_agile_planning/12_tickets/auth/TK-076.md) | 9.1 | Complete Super Admin CRUD Suite (Personal, Roles y Sectores) | US-010, US-015, US-016 | hecho |  |
| [TK-077](docs/05_agile_planning/12_tickets/auth/backend/TK-077.md) | 9.1 | Backend Admin PIN Recovery via Email Token & Magic Link | US-018 | hecho |  |
| [TK-077-FE](docs/05_agile_planning/12_tickets/auth/frontend/TK-077-FE.md) | 9.1 | Frontend Admin PIN Recovery UI (Modal & Reset Screen) | US-018 | hecho |  |
| [TK-078](docs/05_agile_planning/12_tickets/reports/backend/TK-078.md) | 9.1 | Backend Costeo de Insumos y Valorización Monetaria de Mermas | US-019 | hecho |  |
| [TK-078-FE](docs/05_agile_planning/12_tickets/reports/frontend/TK-078-FE.md) | 9.1 | Frontend Costeo de Insumos y Valorización Monetaria de Mermas | US-019 | hecho |  |
| [TK-079](docs/05_agile_planning/12_tickets/reports/backend/TK-079.md) | 9.1 | Backend Indicador TRR Real (Rotation Metrics) | US-020 | hecho |  |
| [TK-079-FE](docs/05_agile_planning/12_tickets/reports/frontend/TK-079-FE.md) | 9.1 | Frontend Indicador TRR Real en el Dashboard de Reportes | US-020 | hecho |  |
| [TK-080](docs/05_agile_planning/12_tickets/stock/backend/TK-080.md) | 9.1 | Backend Filtro `insumoId` para Detección de Apertura Duplicada | US-021 | hecho |  |
| [TK-080-FE](docs/05_agile_planning/12_tickets/stock/frontend/TK-080-FE.md) | 9.1 | Frontend Advertencia de Apertura Duplicada en Extracción | US-021 | hecho |  |
| [TK-081-FE](docs/05_agile_planning/12_tickets/shared/frontend/TK-081-FE.md) | 9.1 | Núcleo del Sistema FEFO (Tokens Día/Noche + Interruptor) — Tablero Principal | US-022 | hecho |  |
| [TK-082-FE](docs/05_agile_planning/12_tickets/shared/frontend/TK-082-FE.md) | 9.1 | Sistema FEFO — Modales de Operación de Cocina | US-022 | hecho |  |
| [TK-083-FE](docs/05_agile_planning/12_tickets/shared/frontend/TK-083-FE.md) | 9.1 | Sistema FEFO — Autenticación Táctil (PIN) | US-022 | hecho |  |
| [TK-084-FE](docs/05_agile_planning/12_tickets/shared/frontend/TK-084-FE.md) | 9.1 | Sistema FEFO — Backoffice y Administración | US-022 | hecho |  |
| [TK-085-FE](docs/05_agile_planning/12_tickets/shared/frontend/TK-085-FE.md) | 9.1 | Adopción de react-router + Shell de Rutas FEFO (`AppShell` + `ProtectedRoute`) | US-023 | hecho |  |
| [TK-086-FE](docs/05_agile_planning/12_tickets/shared/frontend/TK-086-FE.md) | 9.1 | Componentes de la Lámina "Aplicación" (Botón Circular, Chip 4 Niveles, Botón de Fila) | US-023 | hecho |  |
| [TK-087-FE](docs/05_agile_planning/12_tickets/shared/frontend/TK-087-FE.md) | 9.1 | Panel "Estado" de 3 Cubetas + Leyenda Numérica + Grid Acciones\|Estado | US-023 | hecho |  |
| [TK-088-FE](docs/05_agile_planning/12_tickets/shared/frontend/TK-088-FE.md) | 9.1 | Auditoría de Contraste AAA 7:1 del Sistema FEFO (Ambos Turnos) | US-023 | hecho |  |
| [TK-089-FE](docs/05_agile_planning/12_tickets/shared/frontend/TK-089-FE.md) | 9.1 | Reportes Inline (sin `<Modal>` flotante) | US-024 | hecho |  |
| [TK-090-FE](docs/05_agile_planning/12_tickets/shared/frontend/TK-090-FE.md) | 9.1 | Ajustes con Sub-Rutas Inline Deep-Linkables | US-024 | hecho |  |
| [TK-091](docs/05_agile_planning/12_tickets/shared/backend/TK-091.md) | 9.2 | Saneamiento de Duplicación en `auth.controller.ts` (jscpd) | N/A (Técnico — Deuda de Calidad) | hecho |  |
| [TK-092](docs/05_agile_planning/12_tickets/shared/backend/TK-092.md) | 9.2 | Resolución Fail-Safe de Rol de Usuario (cierre de escalada de privilegios AUDIT-SEC-001 F-1) | US-010 (Gestión de Personal) · AUDIT-SEC-001 F-1/F-2 | hecho |  |
| [TK-093](docs/05_agile_planning/12_tickets/shared/backend/TK-093.md) | 9.2 | Declaración Explícita de Rol por Ruta en Mutaciones de Cocina y Stock (AUDIT-SEC-001 F-3) | US-015 (Dynamic RBAC) · AUDIT-SEC-001 F-3 | hecho |  |
| [TK-094](docs/05_agile_planning/12_tickets/shared/backend/TK-094.md) | 9.2 | Paridad entre `prisma/migrations/` y `schema.prisma` (columnas `mustChangePin` / `email`) | N/A (Técnico — Deuda de Infraestructura) | hecho |  |
| [TK-095-FE](docs/05_agile_planning/12_tickets/shared/frontend/TK-095-FE.md) | 9.1 | Pase de Fidelidad Visual y UX vs. el Artefacto "Sistema FEFO" | US-023 · US-024 (auditoría de fidelidad visual vs artefacto "Sistema FEFO") | hecho |  |
| [TK-096](docs/05_agile_planning/12_tickets/stock/backend/TK-096.md) | 9.1 | Stock Multi-Sector de Bodega y Depósito por Sub-Sector (Backend) | US-025 | hecho |  |
| [TK-096-FE](docs/05_agile_planning/12_tickets/stock/frontend/TK-096-FE.md) | 9.1 | Selector de Sub-Sector de Bodega y Desglose de Stock (Frontend) | US-025 | hecho |  |
| [TK-097](docs/05_agile_planning/12_tickets/shared/backend/TK-097.md) | 9.2 | Restaurar `prisma migrate deploy` en `docker-entrypoint.sh` (Guard 25) | N/A (Técnico — Deuda de Infraestructura) | hecho |  |
| [TK-098](docs/05_agile_planning/12_tickets/stock/backend/TK-098.md) | 9.2 | Integridad Transaccional y Decremento Atómico en Extracción de Bodega (Backend) | US-014 · US-025 · AUDIT-DEV-006 F-1/F-2/F-10 | hecho |  |
| [TK-099](docs/05_agile_planning/12_tickets/stock/backend/TK-099.md) | 9.2 | Saneamiento de la Capa de Aplicación de Extracción — Reloj/ID Inyectados, Excepción de Dominio y Auditoría (Backend) | US-014 · AUDIT-DEV-006 F-3/F-4/F-7/F-8/F-9 | hecho |  |
| [TK-100-FE](docs/05_agile_planning/12_tickets/stock/frontend/TK-100-FE.md) | 9.2 | Propagación Real de Errores y Aritmética Decimal en la Pantalla de Extracción (Frontend) | US-014 · AUDIT-DEV-006 F-5/F-6 | hecho |  |
| [TK-101](docs/05_agile_planning/12_tickets/stock/backend/TK-101.md) | 9.2 | Trazabilidad del Sub-Sector de Origen por ID en `StockMovement` (AUDIT-DEV-006 F-7) | US-011 · US-014 · AUDIT-DEV-006 F-7 | hecho |  |
| [TK-102](docs/05_agile_planning/12_tickets/stock/backend/TK-102.md) | 9.1 | Áreas de Cocina como `StorageLocation` y `Remanente.location` → FK (Backend) | US-026 | hecho |  |
| [TK-102-FE](docs/05_agile_planning/12_tickets/stock/frontend/TK-102-FE.md) | 9.1 | Destino de Cocina Dinámico y Gestión de Áreas de Cocina (Frontend) | US-026 | hecho |  |
| [TK-103](docs/05_agile_planning/12_tickets/kitchen/backend/TK-103.md) | 9.1 | Agregado `RecipePreparation` y Apertura Automática al Extraer para Receta (Backend) | US-027 | hecho |  |
| [TK-103-FE](docs/05_agile_planning/12_tickets/kitchen/frontend/TK-103-FE.md) | 9.1 | Extracción para Receta con Preparación + Tablero "Preparaciones en Curso" (Frontend) | US-027 | hecho |  |
| [TK-104](docs/05_agile_planning/12_tickets/kitchen/backend/TK-104.md) | 9.1 | Cierre y Abandono de Preparación de Receta (Backend) | US-028 | hecho |  |
| [TK-104-FE](docs/05_agile_planning/12_tickets/kitchen/frontend/TK-104-FE.md) | 9.1 | Pantalla "Cerrar Preparación de Receta" (Frontend) | US-028 | hecho |  |
| [TK-105](docs/05_agile_planning/12_tickets/reports/backend/TK-105.md) | 9.1 | Reporte de Mermas de Preparación + Auditoría del Consumo Ad-hoc (Backend) | US-029 | hecho |  |
| [TK-105-FE](docs/05_agile_planning/12_tickets/reports/frontend/TK-105-FE.md) | 9.1 | Panel de Reporte de Mermas de Preparación (Frontend) | US-029 | hecho |  |
| [TK-106-FE](docs/05_agile_planning/12_tickets/stock/frontend/TK-106-FE.md) | 9.1 | Aviso de Stock por Sub-Sector en la Extracción de Bodega (Frontend) | US-025 | hecho |  |
| [TK-107](docs/05_agile_planning/12_tickets/kitchen/backend/TK-107.md) | 9.1 | Catálogo de Motivos de Consumo — CRUD (Backend) | US-030 | hecho |  |
| [TK-107-FE](docs/05_agile_planning/12_tickets/kitchen/frontend/TK-107-FE.md) | 9.1 | Panel de Administración de Motivos de Consumo (Frontend) | US-030 | hecho |  |
| [TK-108](docs/05_agile_planning/12_tickets/kitchen/backend/TK-108.md) | 9.1 | Motivo Obligatorio en el Consumo Manual de Remanentes (Backend) | US-004 | hecho |  |
| [TK-108-FE](docs/05_agile_planning/12_tickets/kitchen/frontend/TK-108-FE.md) | 9.1 | Modal de Motivo al Consumir un Remanente (Frontend) | US-004 | hecho |  |
| [TK-109](docs/05_agile_planning/12_tickets/kitchen/backend/TK-109.md) | 9.1 | Motivo en Varianza Negativa de Conciliación + Fix de Superávit (Backend) | US-008 | hecho |  |
| [TK-109-FE](docs/05_agile_planning/12_tickets/kitchen/frontend/TK-109-FE.md) | 9.1 | Selector de Motivo por Línea en el Cierre de Turno (Frontend) | US-008 | hecho |  |
| [TK-110](docs/05_agile_planning/12_tickets/kitchen/backend/TK-110.md) | 9.1 | El Umbral de Alerta Crítica FEFO Ignoraba `SystemSettings` (Backend) | US-017 | hecho |  |
| [TK-111](docs/05_agile_planning/12_tickets/kitchen/backend/TK-111.md) | 9.1 | Vista Previa de Disponibilidad por Ingrediente de Receta (Backend) | US-007 | hecho |  |
| [TK-111-FE](docs/05_agile_planning/12_tickets/kitchen/frontend/TK-111-FE.md) | 9.1 | Vista Previa de Disponibilidad en "Preparar Receta" (Frontend) | US-007 | hecho |  |
| [TK-112-FE](docs/05_agile_planning/12_tickets/kitchen/frontend/TK-112-FE.md) | 9.1 | Las Pestañas de Filtro por Área de Cocina Dejaron de Coincidir con los Remanentes Reales (Frontend) | US-026 | hecho |  |
| [TK-113-FE](docs/05_agile_planning/12_tickets/shared/frontend/TK-113-FE.md) | 9.1 | Chips de Operario Reciente en el Login (Frontend) | US-031 | hecho |  |
| [TK-114-FE](docs/05_agile_planning/12_tickets/kitchen/frontend/TK-114-FE.md) | 9.1 | Botón de Acción Rápida Circular en el Tablero de Cocina (Frontend) | US-031 | no aplica |  |
| [TK-115-FE](docs/05_agile_planning/12_tickets/kitchen/frontend/TK-115-FE.md) | 9.1 | Resaltado Full-Bleed de Fila con Varianza en Conciliación (Frontend) | US-031 | hecho |  |
| [TK-116-FE](docs/05_agile_planning/12_tickets/stock/frontend/TK-116-FE.md) | 9.1 | Barra de Herramientas Acoplada en el Catálogo de Bodega (Frontend) | US-031 | hecho |  |
| [TK-117](docs/05_agile_planning/12_tickets/security/backend/TK-117.md) | 9.2 | Conectar `authorizePermissions` a Rutas Reales + Cerrar `/api/v1/roles` Sin Guard (US-015 Escenario 3) | US-015 · AUDIT-SEC-002 | hecho |  |
| [TK-118](docs/05_agile_planning/12_tickets/kitchen/backend/TK-118.md) | 9.2 | `DiscardRemanenteUseCase` — Id Determinista + Motivo de Descarte Validado | US-005 · AUDIT-DEV-006 F-3 (caso no cubierto) | hecho |  |
| [TK-119](docs/05_agile_planning/12_tickets/stock/backend/TK-119.md) | 9.1 | Escaneo de Código de Barras en Extracción de Bodega (Backend) | US-032 | hecho |  |
| [TK-119-FE](docs/05_agile_planning/12_tickets/stock/frontend/TK-119-FE.md) | 9.1 | Escaneo de Código de Barras en Extracción de Bodega (Frontend) | US-032 | hecho |  |
| [TK-120](docs/05_agile_planning/12_tickets/kitchen/backend/TK-120.md) | 9.1 | Registro de Temperatura de Refrigeración al Iniciar Turno (Backend) | US-033 | hecho |  |
| [TK-120-FE](docs/05_agile_planning/12_tickets/kitchen/frontend/TK-120-FE.md) | 9.1 | Registro de Temperatura de Refrigeración al Iniciar Turno (Frontend) | US-033 | hecho |  |
| [TK-121](docs/05_agile_planning/12_tickets/security/backend/TK-121.md) | 9.1 | Lista de Permisos en el JWT de Login (Backend, US-015 Escenario 2) | US-015 | hecho |  |
| [TK-121-FE](docs/05_agile_planning/12_tickets/security/frontend/TK-121-FE.md) | 9.1 | Ocultamiento por Permiso y Aterrizaje en Login (Frontend, US-015 Escenario 2) | US-015 | hecho |  |
| [TK-122](docs/05_agile_planning/12_tickets/recipes/backend/TK-122.md) | 9.1 | Adaptador Multimodal de IA y Use Case de Recetas de Rescate (Backend) | US-035 | hecho |  |
| [TK-122-FE](docs/05_agile_planning/12_tickets/recipes/frontend/TK-122-FE.md) | 9.1 | Modal y Visualización de Recetas Anti-Desperdicio (Frontend) | US-035 | hecho |  |
| [TK-123](docs/05_agile_planning/12_tickets/settings/backend/TK-123.md) | 9.1 | Modelo de Persistencia y Endpoints de Configuración de IA (Backend) | US-034 | hecho |  |
| [TK-123-FE](docs/05_agile_planning/12_tickets/settings/frontend/TK-123-FE.md) | 9.1 | Sub-ruta y Panel de Configuración de Agentes IA (Frontend) | US-034 | hecho |  |
| [TK-124](docs/05_agile_planning/12_tickets/recipes/backend/TK-124.md) | 9.1 | Modo Dual de Rescate (Catálogo Propio Zero-Leakage & Creativo IA) (Backend) | US-035 | hecho |  |
| [TK-124-FE](docs/05_agile_planning/12_tickets/recipes/frontend/TK-124-FE.md) | 9.1 | Selector de Modo Dual y Badge de Privacidad Zero-Leakage (Frontend) | US-035 | hecho |  |
| [TK-125](docs/05_agile_planning/12_tickets/recipes/backend/TK-125.md) | 9.2 | Aislamiento Hexagonal y De-duplicación del Caso de Uso de Recetas de Rescate (AUDIT-DEV-007 G-A) | N/A (Técnico — Remediación de Arquitectura · AUDIT-DEV-007 F-2/F-6/F-13) | hecho |  |
| [TK-126](docs/05_agile_planning/12_tickets/recipes/backend/TK-126.md) | 9.2 | Frontera de Confianza y Endurecimiento de los Adapters de IA de Recetas (AUDIT-DEV-007 G-B) | N/A (Técnico — Endurecimiento de la Integración IA · AUDIT-DEV-007 F-3/F-4/F-11/F-14) | hecho |  |
| [TK-127](docs/05_agile_planning/12_tickets/recipes/backend/TK-127.md) | 9.2 | Deuda de Calidad y Eficiencia del Módulo de Recetas (AUDIT-DEV-007 G-C) | N/A (Técnico — Deuda de Calidad y Eficiencia · AUDIT-DEV-007 F-5/F-7/F-8/F-10) | hecho |  |
| [TK-128](docs/05_agile_planning/12_tickets/recipes/backend/TK-128.md) | 9.2 | Valorización Monetaria de la Merma Evitada en Recetas de Rescate (US-035 Esc. 5/6, AUDIT-DEV-007 G-D) | US-035 (Escenarios 5 y 6 · AUDIT-DEV-007 F-1/F-16) | hecho |  |
| [TK-128-FE](docs/05_agile_planning/12_tickets/recipes/frontend/TK-128-FE.md) | 9.1 | Mostrar la Merma Evitada como Valor Monetario en el Modal de Rescate | US-035 (Escenarios 5 y 6) | hecho |  |
| [TK-129](docs/05_agile_planning/12_tickets/settings/backend/TK-129.md) | 9.2 | Saneamiento del Módulo de Configuración de IA (AUDIT-DEV-012 L-3/L-4/L-5) | N/A (Técnico — Deuda del Módulo de Configuración de IA · AUDIT-DEV-012 L-3/L-4/L-5) | hecho |  |
| [TK-129-FE](docs/05_agile_planning/12_tickets/settings/frontend/TK-129-FE.md) | 9.2 | Quitar el Toggle de Reabastecimiento Inerte de la Pantalla de Configuración de IA | N/A (Técnico — AUDIT-DEV-012 L-3) | hecho |  |
| [TK-130](docs/05_agile_planning/12_tickets/stock/backend/TK-130.md) | 9.1 | Endpoint de Edición de Insumo (`PUT /api/v1/stock/insumos/:id`) — US-036 | US-036 | hecho |  |
| [TK-130-FE](docs/05_agile_planning/12_tickets/stock/frontend/TK-130-FE.md) | 9.1 | Modal de Edición de Insumo en el Catálogo de Bodega — US-036 | US-036 | hecho |  |
| [TK-131](docs/05_agile_planning/12_tickets/recipes/backend/TK-131.md) | 9.1 | Edición y Baja de Recetas (`PUT` / `DELETE /api/v1/recipes/:id`) — US-037 | US-037 | hecho |  |
| [TK-131-FE](docs/05_agile_planning/12_tickets/recipes/frontend/TK-131-FE.md) | 9.1 | Edición y Baja de Recetas en el Recetario — US-037 | US-037 | hecho |  |
| [TK-132](docs/05_agile_planning/12_tickets/security/backend/TK-132.md) | 9.2 | `trust proxy` + Rate Limiting por Cliente Real (AUDIT-SEC-003) | AUDIT-SEC-003 | hecho |  |
| [TK-133](docs/05_agile_planning/12_tickets/security/backend/TK-133.md) | 9.2 | Clave de Cifrado Dedicada + Origin del Reset Validado + Email de Producción Explícito (AUDIT-SEC-004) | AUDIT-SEC-004 | hecho |  |
| [TK-134](docs/05_agile_planning/12_tickets/security/backend/TK-134.md) | 9.3 | Refresh de Seguridad Pre-Entrega — `fast-uri`/`mysql2` + Base Alpine | pre-entrega-final | hecho |  |
| [TK-135](docs/05_agile_planning/12_tickets/security/backend/TK-135.md) | 9.3 | `CLIENT_ORIGIN` / `ENCRYPTION_KEY` vacíos abortan el arranque en `docker compose` | pre-entrega-final | hecho |  |
| [TK-136](docs/05_agile_planning/12_tickets/security/backend/TK-136.md) | 9.3 | Barrido de CVEs de Dependencias en la Ventana Pre-Push (`js-yaml`) | pre-entrega-final | hecho |  |
| [TK-137](docs/05_agile_planning/12_tickets/shared/backend/TK-137.md) | 9.2 | Test unitario directo para `Temperature.ts` (mutantes sin cobertura) | N/A (Técnico — Deuda de Calidad · production-readiness-state 2026-09-06) | hecho |  |
| [TK-138](docs/05_agile_planning/12_tickets/shared/backend/TK-138.md) | 9.2 | Hacer real el gate de mutación en CI (diff-scoped) + config de Stryker en frontend | N/A (Técnico — Deuda de Calidad · production-readiness-state 2026-09-06) | hecho |  |
| [TK-139](docs/05_agile_planning/12_tickets/shared/backend/TK-139.md) | 9.2 | Skill de gobierno de ADRs (`SK-36`) — decisiones técnicas justificadas | N/A (Técnico — Gobernanza de `.agents/`) | hecho |  |
| [TK-140](docs/05_agile_planning/12_tickets/auth/frontend/TK-140.md) | 9.2 | Migrar el token de sesión de `localStorage` a cookie `httpOnly` | N/A (Técnico — Hardening de sesión · ADR-005 / AUDIT-SEC-004 O-1) | hecho | R-09 |
| [TK-141](docs/05_agile_planning/12_tickets/shared/frontend/TK-141.md) | 9.2 | Cabeceras de seguridad y CSP en el `nginx` que sirve el SPA | N/A (Técnico — Hardening · ADR-005 fuerza 3) | hecho |  |
| [TK-142](docs/05_agile_planning/12_tickets/shared/frontend/TK-142.md) | 9.2 | Parametrizar el upstream de nginx y declarar la infra de Render (`render.yaml`) | N/A (Técnico — Despliegue · ADR-006) | hecho |  |
| [TK-143](docs/05_agile_planning/12_tickets/shared/backend/TK-143.md) | 9.2 | Dos implementaciones de seed independientes y divergentes | N/A (Técnico — Deuda de Claridad) | hecho |  |
| [TK-144](docs/05_agile_planning/12_tickets/shared/backend/TK-144.md) | 9.3 | `ci_local.sh` no reproduce `ci.yml` — 3 divergencias reales | N/A (Técnico — Fidelidad del gate local) | hecho |  |
| [TK-145](docs/05_agile_planning/12_tickets/security/backend/TK-145.md) | 9.2 | Validar `CORS_ALLOWED_ORIGINS` como lista de URLs con esquema | N/A (Técnico — incidencia PM-001) | hecho |  |
| [TK-146](docs/05_agile_planning/12_tickets/security/backend/TK-146.md) | 9.2 | Forzar `qs` >= 6.16.0 en el Parser de Peticiones de Producción | N/A (Técnico — mantenimiento MNT-001) | hecho |  |
| [TK-147](docs/05_agile_planning/12_tickets/shared/backend/TK-147.md) | 9.2 | El Gate de Dependencias Debe Fallar si la Auditoría No Se Ejecuta | N/A (Técnico — mantenimiento MNT-001) | hecho |  |
| [TK-148](docs/05_agile_planning/12_tickets/shared/backend/TK-148.md) | 9.2 | Índice Único de Deuda Técnica | N/A (Técnico — mantenimiento MNT-001) | hecho |  |
| [TK-149-FE](docs/05_agile_planning/12_tickets/kitchen/frontend/TK-149-FE.md) | 9.2 | Montar el Feed de Alertas FEFO en la Interfaz (Frontend) | N/A (Técnico) — remediación de `TK-007`, detectada en la revisión externa `EXT-001` | hecho |  |
| [TK-150](docs/05_agile_planning/12_tickets/shared/backend/TK-150.md) | 9.2 | Estándar de Nomenclatura de momoy Escrito en `CONTRIBUTING.md` | N/A (Técnico — AUDIT-DEV-016) | no aplica |  |
| [TK-151](docs/05_agile_planning/12_tickets/shared/backend/TK-151.md) | 9.2 | `check_naming.py` en Rojo, Luego los Renombrados que lo Ponen en Verde | N/A (Técnico — AUDIT-DEV-016) | no aplica |  |
| [TK-152](docs/05_agile_planning/12_tickets/shared/backend/TK-152.md) | 9.2 | Separar Comandos de Procedimientos — `.agents/procedures/` | N/A (Técnico — AUDIT-DEV-016) | hecho |  |
| [TK-153](docs/05_agile_planning/12_tickets/stock/backend/TK-153.md) | 9.1 | Abrir el Historial de Movimientos a Quien Lee el Stock | US-038 | hecho |  |
| [TK-153-FE](docs/05_agile_planning/12_tickets/stock/frontend/TK-153-FE.md) | 9.1 | Movimientos como Sección de Primer Nivel | US-038 | hecho |  |
| [TK-154-FE](docs/05_agile_planning/12_tickets/kitchen/frontend/TK-154-FE.md) | 9.1 | Panel de Estado y Acciones Rápidas sobre el Inventario | US-039 | hecho |  |
| [TK-155](docs/05_agile_planning/12_tickets/kitchen/backend/TK-155.md) | 9.1 | Rechazar el Consumo de un Remanente Vencido | US-040 | hecho |  |
| [TK-155-FE](docs/05_agile_planning/12_tickets/kitchen/frontend/TK-155-FE.md) | 9.1 | Separar Vencidos de Caduca Hoy en la Vista de Remanentes | US-040 | hecho |  |
| [TK-156-FE](docs/05_agile_planning/12_tickets/catalog/frontend/TK-156-FE.md) | 9.1 | Ordenar el Catálogo por Nombre o Cantidad | US-041 | hecho |  |
| [TK-157-FE](docs/05_agile_planning/12_tickets/catalog/frontend/TK-157-FE.md) | 9.1 | Ficha de Insumo con sus Movimientos Recientes | US-042 | hecho |  |
| [TK-158-FE](docs/05_agile_planning/12_tickets/shared/frontend/TK-158-FE.md) | 9.1 | Errores de Validación Junto a su Campo | US-043 | hecho |  |
| [TK-159](docs/05_agile_planning/12_tickets/shared/backend/TK-159.md) | 9.1 | Idempotencia y Momento Real en las Escrituras Encolables | US-044 | hecho |  |
| [TK-159-FE](docs/05_agile_planning/12_tickets/shared/frontend/TK-159-FE.md) | 9.1 | Shell Instalable y Caché de la Aplicación | US-044 | hecho |  |
| [TK-160](docs/05_agile_planning/12_tickets/shared/backend/TK-160.md) | 9.1 | Aceptación de Operaciones Diferidas con Varianza | US-044 | hecho |  |
| [TK-160-FE](docs/05_agile_planning/12_tickets/shared/frontend/TK-160-FE.md) | 9.1 | Cola Local de Consumo y Descarte | US-044 | hecho |  |
| [TK-161-FE](docs/05_agile_planning/12_tickets/shared/frontend/TK-161-FE.md) | 9.1 | Tramo de Teléfono en el Shell y el Tablero de Cocina | US-045 | hecho |  |
| [TK-162-FE](docs/05_agile_planning/12_tickets/shared/frontend/TK-162-FE.md) | 9.1 | Tramo de Teléfono en Bodega e Historial | US-045 | hecho |  |
| [TK-163-FE](docs/05_agile_planning/12_tickets/shared/frontend/TK-163-FE.md) | 9.1 | Modales a Hoja Completa en Teléfono | US-045 | hecho |  |
| [TK-164](docs/05_agile_planning/12_tickets/auth/backend/TK-164.md) | 9.1 | El Arranque Reasienta la Rotación Obligatoria del PIN Inicial | US-046 | hecho | R-02, R-10 |
| [TK-165](docs/05_agile_planning/12_tickets/auth/backend/TK-165.md) | 9.1 | Documentar el Endpoint de Cambio de PIN en el Contrato | US-046 | hecho | R-02 |
| [TK-166](docs/05_agile_planning/12_tickets/shared/backend/TK-166.md) | 9.1 | Alinear la Documentación de API con el Contrato Publicado | US-047 | hecho | R-01, R-05 |
| [TK-167](docs/05_agile_planning/12_tickets/shared/backend/TK-167.md) | 9.1 | Higiene del Repositorio — Artefactos Huérfanos y Notas Caducadas | US-047 | hecho | R-08 |
| [TK-168](docs/05_agile_planning/12_tickets/kitchen/backend/TK-168.md) | 9.1 | Frontera Transaccional del Consumo y el Descarte | US-048 | hecho | R-07 |
| [TK-169](docs/05_agile_planning/12_tickets/kitchen/backend/TK-169.md) | 9.1 | Extraer el Mapeo de Movimientos del Repositorio de Stock | US-048 | hecho | R-07 |
| [TK-170-FE](docs/05_agile_planning/12_tickets/stock/frontend/TK-170-FE.md) | 9.1 | Eliminar el Respaldo de Unidad por Identificador de Semilla | US-049 | hecho | hallazgo de la ingesta |
| [TK-171](docs/05_agile_planning/12_tickets/shared/backend/TK-171.md) | 9.1 | Corregir las Cifras del README y Declarar el Alcance de sus Selecciones | US-050 | hecho | R-04 |
| [TK-172-FE](docs/05_agile_planning/12_tickets/security/frontend/TK-172-FE.md) | 9.2 | Corregir la Matriz de Permisos que Descarta la Concesión Anterior en Cada Clic (AUDIT-DEV-017 F-1, F-3) | US-015 · AUDIT-DEV-017 | hecho |  |
| [TK-173](docs/05_agile_planning/12_tickets/auth/backend/TK-173.md) | 9.2 | Código de Operario como Identidad de Acceso, con Unicidad en la Base de Datos (US-051) | US-051 · AUDIT-DEV-017 | hecho |  |
| [TK-173-FE](docs/05_agile_planning/12_tickets/auth/frontend/TK-173-FE.md) | 9.2 | Hacer Visible el Código de Operario en el Alta, la Lista y el Login (US-051, AUDIT-DEV-017 F-2/F-4) | US-051 · AUDIT-DEV-017 | hecho |  |
| [TK-174](docs/05_agile_planning/12_tickets/security/backend/TK-174.md) | 9.2 | `check_privilege_defaults` No Puede Aprobar un Catálogo de Roles Dinámico (C-SEC-2 vs. US-015) | US-015 · AUDIT-DEV-017 | hecho |  |
| [TK-175](docs/05_agile_planning/12_tickets/security/backend/TK-175.md) | 9.2 | Forzar `brace-expansion` a sus Versiones Parcheadas en Cada Major | N/A (Técnico — gate de dependencias en rojo) | hecho |  |
| [TK-176](docs/05_agile_planning/12_tickets/auth/frontend/TK-176.md) | 9.2 | Retirar el Token de Sesión Heredado de `localStorage` en el Frontend | N/A (Técnico — cierre de la ventana de compatibilidad de TK-140 · ADR-005) | hecho |  |

---
