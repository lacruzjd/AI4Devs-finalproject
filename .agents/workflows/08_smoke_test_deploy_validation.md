---
name: 08_smoke_test_deploy_validation
description: "Workflow de validación post-despliegue: comprueba salud, contratos HTTP críticos y cabeceras de seguridad del sistema recién desplegado y emite un veredicto PASS/FAIL. Ante un FAIL propone el rollback a la versión anterior con el mecanismo declarado en el stack manifest y espera la aprobación humana antes de ejecutarlo."
version: "2.0.1"
category: "workflows/deployment"
---

# Workflow 08: Smoke Test & Deploy Validation (v2.0.1)

> **DIRECTIVA PARA EL AGENTE:**
> Actúa como un **Site Reliability Engineer (SRE)** y **DevSecOps Validator**.
> Este workflow se ejecuta **inmediatamente después** de cada despliegue, normalmente como paso final del [workflow 10](10_release_workflow.md).
> Su misión es confirmar en pocos minutos que el sistema desplegado es funcional, seguro y cumple el contrato de API del proyecto.
>
> **FASE 0 OBLIGATORIA:** lee `docs/00_stack_manifest.md` antes de ejecutar ningún paso. De ahí salen las URLs base, el endpoint de salud, la plataforma y el **mecanismo de despliegue y de vuelta a la versión anterior**. Si alguno no está declarado, detente y pregunta: nunca lo supongas.
>
> **Ninguna acción sobre producción sin aprobación humana:** este workflow observa y propone. Un rollback, una destrucción de recursos o una reversión de datos solo se ejecutan después de que el humano lo apruebe explícitamente.

---

## Paso 1 — Health Check (≤1 min)

1. **Esperar a que el despliegue responda:** sondear el endpoint de salud declarado en el stack manifest con reintentos y un tiempo máximo (ej. cada 5 s durante 2 min). Nunca una espera fija: un `sleep` pasa en verde aunque el servicio no esté listo, o falla aunque solo tardara un poco más.
2. **Salud del backend:** el endpoint responde con el estado esperado según su contrato.
3. **Dependencias críticas:** si el health check expone el estado de la base de datos u otros servicios, verificar que estén disponibles.
4. Si falla → **veredicto FAIL** (Paso 4). No se ejecuta ninguna acción correctiva desde este paso.

---

## Paso 2 — Smoke Tests de Contratos HTTP (≤3 min)

### 2.1. Seleccionar los endpoints críticos
1. Leer el contrato de API del proyecto (ruta declarada en el stack manifest, habitualmente `docs/03_persistence_and_api/openapi.yaml`).
2. Elegir los **3 a 5 endpoints más críticos de negocio**: los que bloquean el uso del sistema si fallan.
3. Para cada uno, preparar una llamada con el payload mínimo válido **o una llamada de solo lectura**. Prohibido crear, modificar o borrar datos reales de producción desde un smoke test.

### 2.2. Tabla de Oráculos de Smoke Test

| Oráculo | Verificación |
|:--------|:------------|
| `// ORACULO HTTP:` | El código de respuesta coincide con el esperado en el contrato (200, 401 en una ruta protegida sin token, 404 ante un recurso inexistente...) |
| `// ORACULO SCHEMA:` | El body contiene los campos del schema declarado, incluido el formato de error del proyecto (ej. RFC 7807) |
| `// ORACULO LATENCIA:` | La respuesta llega por debajo del umbral declarado (por defecto 2000 ms) |

### 2.3. Criterios al escribir los oráculos
- **Verificar contra el sistema real, no contra la lectura del código:** el código de estado que devuelve una ruta ante una entrada concreta depende de cómo interactúan validación, autenticación y caso de uso. Confirmarlo ejecutando la llamada una vez antes de fijar el oráculo.
- **No suprimir el body de los errores:** opciones como `curl -f` o `--fail` descartan el cuerpo de las respuestas 4xx/5xx. Un oráculo de schema que las use devuelve vacío en silencio en vez de fallar con un error legible.
- **Una ruta protegida sin credenciales es un buen oráculo barato:** si responde 401, la ruta existe, el enrutado funciona y la autenticación está activa, sin tocar datos.

---

## Paso 3 — Verificación de Seguridad (≤1 min)

1. **Cabeceras de seguridad HTTP** declaradas por el proyecto (ej. `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy`).
2. **CORS:** `Access-Control-Allow-Origin` no es `*` en producción y coincide con los orígenes declarados.
3. **Rate limiting:** en producción, verificar solo que la configuración declarada esté activa (cabeceras de límite o configuración desplegada). Provocar el bloqueo con intentos fallidos reales solo en un entorno de pruebas o con aprobación humana: en producción puede bloquear a usuarios legítimos.

---

## Paso 4 — Veredicto y Acción

### Veredicto PASS
```text
✅ DEPLOY VALIDADO — Sistema operativo y contratos HTTP confirmados.
```
Registrar el resultado en la sección "Verificación posterior" del registro de release (`docs/06_release_and_operations/releases/vX.Y.Z.md`) y en `docs/05_agile_planning/15_history.md`:
```text
Deploy: [fecha y hora con zona] | Versión: vX.Y.Z | Commit: [sha] | Smoke Tests: PASS | Latencia p95: [ms]
```

### Veredicto FAIL
```text
🔴 DEPLOY FALLIDO — Rollback propuesto, pendiente de aprobación humana
```
1. **Presentar al humano** el oráculo que falló, la evidencia (respuesta, código, latencia) y la **propuesta de rollback**: volver a la última versión que pasó el smoke, con el mecanismo de despliegue declarado en el stack manifest.
2. **Esperar la decisión explícita.** Si el release incluyó una migración de base de datos, la propuesta dice qué pasa con los datos: una migración `expand` compatible permite volver al código anterior sin tocar el esquema; cualquier reversión de datos se decide aparte y nunca se ejecuta sin aprobación.
3. **Prohibido** destruir infraestructura, recrear recursos con datos o revertir migraciones como forma de rollback.
4. Tras ejecutar el rollback aprobado, repetir los Pasos 1 a 3 sobre la versión restaurada y marcar el release como `rolled_back`.
5. Abrir la incidencia con el [workflow 07](07_production_observability_workflow.md): un despliegue fallido a producción es severidad `alta` y lleva postmortem.

---

## Integración en el Pipeline CI/CD

El script de smoke test es específico del stack del proyecto, así que **se genera con `SK-27` en `docs/04_governance_and_quality/scripts/smoke_test.sh`**, nunca en `.agents/scripts/` (regla de `CONTRIBUTING.md`: `.agents/scripts/` solo contiene tooling agnóstico). Un job del CI declarado en el stack manifest, posterior al despliegue, lo invoca pasando la URL del entorno desde el gestor de secretos de esa plataforma (nunca escrita en el repositorio):

```bash
BACKEND_URL="<url del entorno, leída del gestor de secretos del CI>" \
  bash docs/04_governance_and_quality/scripts/smoke_test.sh
```

El script sondea el endpoint de salud hasta que responda (Paso 1) y termina con código distinto de cero ante cualquier oráculo fallido. El CI solo informa: la decisión de rollback sigue siendo humana.

Invoca [05_test_runner_workflow.md](05_test_runner_workflow.md) si se detectan regresiones y [07_production_observability_workflow.md](07_production_observability_workflow.md) si hay fallos en producción.
