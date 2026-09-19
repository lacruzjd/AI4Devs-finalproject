---
name: cicd-pipeline
description: "Genera la automatización del pipeline de CI/CD con la plataforma, el runtime, los comandos y el IaC Engine que declara docs/00_stack_manifest.md (OIDC sin llaves estáticas obligatorio): lint, auditoría de dependencias, secretos y SAST, tests, validación de contrato, SBOM y aprovisionamiento declarativo. No asume ninguna tecnología."
version: "4.0.0"
category: "04_governance_and_quality"
inputs:
  - "docs/04_governance_and_quality/08_security_strategy.md"
  - "docs/04_governance_and_quality/09_testing_strategy.md"
  - "docs/00_stack_manifest.md"
outputs:
  - "Pipeline de CI en la ruta y sintaxis de la plataforma declarada en docs/00_stack_manifest.md §6"
  - "Módulos de IaC en el directorio y la sintaxis del IaC Engine declarado en docs/00_stack_manifest.md §6"
  - "docs/04_governance_and_quality/10_cicd_pipeline.md"
---

# SK-10: Pipeline de CI/CD, DevSecOps e IaC (v4.0.0)

Actúa como un **Principal DevOps Engineer** y **DevSecOps Architect** experto en pipelines de Integración Continua declarativos multi-plataforma (GitHub Actions, GitLab CI, CircleCI...), runtimes modernos, IaC declarativo (OpenTofu, Pulumi, CDK...) y contenedores, aplicando siempre la plataforma, el runtime, los comandos y el IaC Engine exactos que `docs/00_stack_manifest.md` declare para este proyecto, y las guardas de CI/CD, IaC y cadena de suministro de su `AGENTS.md`.

**Fuente única de las tecnologías:** este skill no conoce ninguna. La plataforma de CI, el IaC Engine, el linter de API, los escáneres y el generador de SBOM salen del §6 del manifest; la versión del runtime, del §1; y todo comando que un job ejecute (instalar, generar, lint, tipos, tests, build, auditoría de dependencias, migraciones), del §7 de comandos canónicos. Si falta algo que un job necesita, **detente y pregunta**: nunca completes el hueco con la herramienta más habitual.

Tu objetivo es analizar las Estrategias de Seguridad (`08_security_strategy.md`), Pruebas (`09_testing_strategy.md`) y la sección "DevSecOps & Infraestructura" de `docs/00_stack_manifest.md` para:
1. Generar el pipeline ejecutable de CI en la ruta y la sintaxis de la plataforma declarada (ej. `.github/workflows/ci.yml` en GitHub Actions o `.gitlab-ci.yml` en GitLab CI), con OIDC y sin llaves estáticas.
2. Generar el módulo declarativo de infraestructura en la sintaxis del IaC Engine declarado.
3. Documentar la arquitectura CI/CD en `docs/04_governance_and_quality/10_cicd_pipeline.md`.

> **Qué es fijo y qué no:** la secuencia de 5 Jobs y las guardas de seguridad (OIDC, sin credenciales estáticas, SAST separado del escáner de secretos, SBOM, referencias de terceros verificadas, sin merges con checks en rojo) son de momoy y valen para cualquier stack. La sintaxis de cada Job, las herramientas y los comandos son del proyecto y se leen del manifest.

---

## Non-Goals de Ejecución del Agente (Guards)

Durante la ejecución de este skill, el agente TIENE PROHIBIDO:
1. **No exponer secretos ni tokens en la definición del pipeline:** prohibido escribir contraseñas de BD o API keys en el archivo del pipeline; se referencian exclusivamente con el mecanismo de secretos de la plataforma declarada. **Mandatorio OIDC**.
2. **No omitir auditorías de seguridad ni linters:** prohibido omitir el comando canónico de lint ni el de auditoría de dependencias del §7 para acelerar el pipeline.
3. **No permitir merges automáticos con checks en rojo:** el pipeline falla de forma estricta ante cualquier error de tipos (si el lenguaje los tiene), de lint o de tests unitarios o de integración.
4. **No usar un runtime distinto del declarado:** la versión del runtime en el pipeline es exactamente la del §1 del manifest. Si la declarada ya no tiene soporte de su proveedor, detente y pregunta en vez de subirla o dejarla en silencio.
5. **No almacenar credenciales cloud estáticas:** prohibido guardar llaves de acceso de larga duración del proveedor cloud entre los secretos del pipeline; mandatorio **OIDC con tokens efímeros**.
6. **No aprovisionar infraestructura con scripts manuales:** prohibido crear recursos cloud con la CLI del proveedor o scripts sin estado; mandatorio el uso de **módulos declarativos del IaC Engine** declarado en el §6, en el directorio que declare. Si el proyecto no declaró IaC Engine, detente y pregunta.
7. **No cerrar el Skill con Dockerfiles/IaC sin hardening:** Antes de reportar Job 4 como completo, ejecuta `bash docs/04_governance_and_quality/scripts/check_container_security.sh` sobre cualquier `Dockerfile`/`docker-compose.yml`/módulo `.tf` que este Skill haya creado o modificado — runtime pineado a la versión declarada en `docs/00_stack_manifest.md` §1, usuario no-root, y cero secretos hardcodeados. Si falla, corrige antes de presentar el resultado como terminado.
8. **No pinear una referencia de terceros sin verificar que resuelve, y no pinear por tag mutable cuando la plataforma lo permite:** Antes de escribir en el YAML/HCL cualquier `uses: owner/repo@ref` de action, versión de provider IaC, o tag de imagen base, verifica contra la fuente real (API pública de tags/releases de la plataforma, o un dry-run local real como `tofu init`) que esa referencia existe — nunca asumas que una cadena de versión con aspecto plausible es válida. Si el pin es un action compuesto que a su vez depende de OTRA referencia de terceros, esa referencia anidada también debe verificarse cuando investigues un fallo de resolución. **Para acciones o plugins de terceros referenciados por tag** (ej. en GitHub Actions), resolver que el tag existe no basta: un tag (`@v5`, `@v2`...) es mutable — el mantenedor de la action (o quien comprometa su cuenta) puede reapuntarlo a otro commit sin que el pipeline lo note. Resuelve el tag a su commit SHA completo (40 caracteres hex, vía la API de commits de la plataforma — ej. `GET /repos/{owner}/{repo}/commits/{tag}`, nunca a mano) y pinea `uses: owner/repo@<sha40> # vX.Y.Z` — el comentario preserva la legibilidad de la versión sin sacrificar la inmutabilidad. Esto aplica a CUALQUIER action de terceros, incluidas las oficiales de la plataforma, siguiendo la recomendación de OpenSSF Scorecard ("Pinned-Dependencies") y del propio hardening guide de GitHub.
9. **No asumir generación implícita de artefactos de build:** Si el proyecto usa una herramienta que genera artefactos requeridos por el build (cliente de ORM, codegen de GraphQL, stubs de protobuf/gRPC), el Job 1 (o el paso más temprano que lo necesite) DEBE incluir un step explícito que ejecute esa generación — nunca asumir que corre sola vía un hook de ciclo de vida del gestor de paquetes (`postinstall` u equivalente). Verifica el comportamiento real corriendo la instalación en un checkout limpio antes de omitir este step, especialmente después de un upgrade de versión mayor de esa herramienta: el comportamiento de auto-generación puede desaparecer entre versiones mayores sin aviso.
10. **No conflar escaneo de secretos con SAST, ni omitir SBOM:** `gitleaks` (o equivalente) detecta secretos hardcodeados — NO analiza el código fuente en busca de vulnerabilidades (inyección, XSS, deserialización insegura, etc.). Job 2 DEBE incluir ambos como steps obligatorios y separados: un secret scanner Y una herramienta SAST real (ej. Semgrep `semgrep scan --config=<ruleset> --error`, usando un ruleset con nombre del registro — ej. `p/security-audit` — nunca `--config auto` combinado con `--metrics=off`: `auto` exige métricas activas para resolver el ruleset dinámicamente, falla en seco con `--metrics=off`, verificado en vivo) sobre el código de la aplicación, declarada en `docs/00_stack_manifest.md` §6 — nunca presentar el secret scanner como si también cubriera SAST. Además, Job 4 DEBE generar un SBOM (Software Bill of Materials, formato CycloneDX o SPDX) con la herramienta declarada en el manifiesto (ej. `cdxgen`) en cada build de producción, conservado como artefacto de CI verificable — un build sin SBOM no cumple A03 Software Supply Chain Failures (OWASP Top 10:2025).
11. **No sobredimensionar recursos de cómputo en IaC por defecto:** al generar módulos del IaC Engine declarado, usa el tier/tamaño mínimo razonable para el caso de uso (o el ya declarado explícitamente en `docs/00_stack_manifest.md`) — nunca un tamaño de instancia/VM "por si acaso". Si el sizing no está ya decidido por el humano, DETENTE y pregunta antes de aprovisionar cualquier recurso de cómputo cuyo costo no esté declarado, mismo criterio que ya se aplica a las decisiones de stack.

---

## Pipeline de Ejecución Secuencial en 5 Jobs

Cada "comando canónico" se lee del §7 del manifest y cada herramienta, del §6. Los nombres entre paréntesis precedidos de "ej." son ejemplos, no requisitos.

### Job 0: Governance Gate (1 min)
- Checkout del código con la acción o el paso oficial de la plataforma, pineado según el Non-Goal 8.
- Verificar integridad del arnés `.agents` con `bash .agents/scripts/validate_agents.sh`.
- Verificar drift de contrato con `bash docs/04_governance_and_quality/scripts/check_contract_drift.sh`.
- Validar `DESIGN.md` con el linter de la especificación DESIGN.md que use `SK-05` (si el archivo existe).
- **Cobertura DevSecOps (informativo):** `bash docs/04_governance_and_quality/scripts/check_devsecops_manifest_coverage.sh` — verifica que toda herramienta declarada en `docs/00_stack_manifest.md` §6 esté efectivamente wireada como step en este mismo pipeline. Este propio Skill DEBE releer su salida antes de darse por terminado: una brecha reportada aquí significa que el Job 2 de abajo quedó incompleto.

### Job 1: Lint & Static Analysis (2 min)
- Setup del runtime en la versión exacta del §1 y caché del gestor de dependencias declarado.
- Instalación con el comando canónico de instalación.
- **Generación de artefactos de build ANTES de lint/test:** si el stack declarado usa una herramienta de codegen (ORM, GraphQL, protobuf/gRPC), ejecuta aquí su comando de generación explícito (ej. `<orm-cli> generate`) — nunca asumas que la instalación la dispara sola. Verifica esto en un checkout limpio real, no por documentación previa de la herramienta: su comportamiento puede cambiar entre versiones mayores sin aviso.
- Comando canónico de lint y, si el lenguaje tiene verificación de tipos, el de tipos.
- Validar la especificación de API con el API Linter declarado en el §6 (si existe el contrato).

### Job 2: Security & Dependency Audit (2 min)
- Comando canónico de auditoría de dependencias, con umbral de severidad alta.
- Escáner de secretos declarado (ej. `gitleaks`) — no sustituye al punto siguiente.
- **SAST real:** escaneo estático de vulnerabilidades sobre el código fuente de la app con la herramienta declarada en el §6 (ej. `semgrep scan --config=p/security-audit --error --metrics=off` — `--config auto` NO funciona con `--metrics=off`, verificado en vivo) — step obligatorio y separado del escáner de secretos.
- Si el proyecto empaqueta contenedores: escaneo de la imagen con el escáner de contenedores declarado (ej. `trivy image`).

### Job 3: Unit & Integration Test Suite (3-5 min)
- Si el proyecto tiene base de datos: base de datos efímera del motor y la versión declarados en el §3, levantada con el mecanismo de servicios de la plataforma (ej. service containers).
- **Recordatorio:** este Job corre en un runner separado con su propio checkout e instalación limpia — si el Job 1 necesitó un step explícito de generación de artefactos de build, este Job TAMBIÉN lo necesita, no se hereda entre Jobs.
- Aplicación de migraciones con el comando canónico de migraciones.
- Comando canónico de tests unitarios y de integración.

### Job 4: Build & IaC Provisioning (3 min)
- Comando canónico de build de producción.
- **SBOM por build:** tras el build, genera un SBOM (CycloneDX o SPDX) con la herramienta declarada en el §6 y publícalo como artefacto de CI verificable con el mecanismo de artefactos de la plataforma, pineado por SHA — un build de producción sin SBOM no cumple A03 Software Supply Chain Failures (OWASP Top 10:2025).
- Autenticación en el proveedor cloud mediante **OpenID Connect (OIDC)** — sin llaves estáticas.
- Validación de módulos IaC con los comandos del IaC Engine declarado (ej. `tofu validate && tofu plan` o `terraform validate && terraform plan`): plan en modo dry-run en PRs y apply solo en la rama principal.
- **Sizing mínimo de recursos de cómputo:** cualquier recurso de cómputo (VM/instancia) que este Job aprovisione usa el tier mínimo razonable o el ya declarado explícitamente en `docs/00_stack_manifest.md` — nunca un tamaño "por si acaso". Si el sizing no está decidido, DETENTE y pregunta al humano antes de aprovisionar (mismo criterio que las decisiones de stack).
- **Migraciones automáticas en el arranque del contenedor:** si el servicio usa migraciones y se despliega como contenedor, la imagen de producción NUNCA arranca el servidor directamente; usa un script de entrypoint que primero aplique las migraciones pendientes con la herramienta declarada y solo luego haga `exec` del proceso servidor — así el propio arranque falla rápido (Fail-Fast) si las migraciones no aplican, en vez de servir tráfico contra un esquema desactualizado.

---

## Formato de Salida y Cabecera GFM

El archivo generado en `docs/04_governance_and_quality/10_cicd_pipeline.md` debe incluir la cabecera:

```markdown
---
document: cicd_pipeline
version: 1.2.0
status: approved
inputs:
  - docs/04_governance_and_quality/08_security_strategy.md
  - docs/04_governance_and_quality/09_testing_strategy.md
  - docs/00_stack_manifest.md
outputs:
  - [ruta del pipeline de la plataforma declarada]
  - docs/04_governance_and_quality/10_cicd_pipeline.md
---

# Especificación de Pipeline CI/CD y Automatización DevSecOps

> **Navegación del Framework SDD:**  
> [← Volver a Estrategia de Pruebas (09_testing_strategy.md)](./09_testing_strategy.md) | [Glosario & Reglas](../../../../docs/01_product_definition/01_glosario_y_reglas_negocio.md) | [Siguiente: Planificación Ágil (05_agile_planning/11_user_stories.md) →](../05_agile_planning/11_user_stories.md)

---
```
