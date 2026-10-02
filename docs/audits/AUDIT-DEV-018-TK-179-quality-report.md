# Informe de Auditoría de Código VSDD - Ticket TK-179

* **ID Auditoría:** AUDIT-DEV-018
* **Fecha de Auditoría:** 2026-10-01
* **Reviewer:** Subagente Independiente (fases de juicio) + gates deterministas ejecutados por el orquestador
* **Ticket Evaluado:** TK-179 — Enviar el Correo de Recuperación de PIN por SMTP Real (INC-002)

> **Estado del diff auditado:** el ticket se había commiteado (`df437d9`) antes de esta auditoría. Para que los gates acotados al diff evaluaran el ticket y no un árbol vacío, el commit se deshizo con `git reset --soft HEAD~1`: el diff completo quedó en el índice, sin commitear, que es el estado que este workflow presupone.

## Resumen por Fases:
- Fase 0 (Descubrimiento de Reglas): PASÓ — `TK-179` existe y se creó antes del código de producción; `related_story: N/A (Técnico — incidencia INC-002)` sigue el precedente de `TK-145`; fila `REQ-078` en la matriz; sin regla de negocio nueva frente a `US-018`.
- Fase 1 (Mutation Testing >= 70%): PASÓ — `check_mutation_score.sh` verde por fichero en `RequestAdminPinResetUseCase.ts` (única capa domain/application tocada).
- Fase 2 (Arquitectura Hexagonal / SOLID): PASÓ — dominio intacto, el caso de uso depende solo del puerto `IEmailService`, adaptador en `infrastructure/notifications`, composición en `composition.ts`/`server.ts`. Duplicación, calidad y código muerto en verde y acotados al diff.
- Fase 3 (Anti-Drift Arquitectónico): PASÓ — sin cambio de contrato (`check_contract_drift.sh` verde, `openapi.yaml` intacto); build `dist/infrastructure/http/server.js` = `main`, sin rutas anidadas; `tofu validate` correcto con la imagen oficial `ghcr.io/opentofu/opentofu:1.10` (el binario local no existe); `tofu fmt` marca 2 líneas preexistentes, idénticas antes y después del ticket. Nota: D-5.
- Fase 4 (Seguridad, Entornos y Sanitización): **FALLÓ** — D-1 y D-2 (MEDIA). Rate limiting de `forgot-pin` intacto (Guard 16), sin secretos de respaldo (Guard 14), HTML escapado, sin inyección de cabeceras, token y URL nunca registrados. `check_env_usage`, `check_container_security`, `check_dependency_audit`, `check_privilege_defaults`, `check_decimal_arithmetic` y semgrep (0 hallazgos) en verde.
- Fase 5 (UI / WCAG 2.2 Ergonomía Táctil): N/A — ningún fichero de frontend tocado.

## Defectos Detectados (Si los hay):
- **D-1 · MEDIA — STARTTLS oportunista.** `apps/backend/src/infrastructure/notifications/SmtpEmailService.ts:29-35` crea el transporte sin `requireTLS`. nodemailer 10.0.13 solo negocia STARTTLS si el servidor lo anuncia (`smtp-connection/index.js:108`, `requireTLS` es opcional). Con la configuración por defecto (587, `SMTP_SECURE=false`), un atacante en la ruta que elimine `STARTTLS` del EHLO recibe `SMTP_PASS` en `AUTH PLAIN` y el `resetToken` en el cuerpo → toma de la cuenta ADMIN. Arreglo: `requireTLS` activo por defecto cuando `secure=false`; desactivarlo solo fuera de producción (Fail-Fast).
- **D-2 · MEDIA — reset-poisoning reabierto fuera de producción.** `RequestAdminPinResetUseCase.ts:32` acepta cualquier `clientOrigin` cuando la allowlist es `*`, el valor por defecto de `CORS_ALLOWED_ORIGINS` fuera de producción. Antes de TK-179 el enlace envenenado solo acababa en logs de desarrollo; con `SMTP_HOST` configurado en dev/staging llega al buzón real del ADMIN con un token válido (`AUDIT-SEC-004` F-2). Arreglo: con `SMTP_HOST`, exigir `CLIENT_ORIGIN` o un `CORS_ALLOWED_ORIGINS` sin comodín, o no aceptar nunca `clientOrigin` con allowlist `*`.
- **D-3 · BAJA — PII en logs.** `RequestAdminPinResetUseCase.ts:68-70` y el `catch` de `verifyConnection` en `server.ts` vuelcan `error.message`, que en nodemailer incluye la respuesta del servidor (p. ej. `550 … <admin@…>`). Arreglo: registrar `code`/`responseCode`, no `message`.
- **D-4 · BAJA — timeouts por defecto.** Sin `connectionTimeout`/`greetingTimeout`/`socketTimeout`, nodemailer espera hasta 2 min / 30 s / 10 min; con envío sin esperar, un SMTP colgado retiene sockets por petición (acotado por `loginLimiter`). Arreglo: timeouts explícitos.
- **D-5 · BAJA — `apps/backend/.env.example:29-30` incoherente.** `SMTP_USER=""` con `SMTP_PASS="YOUR_SMTP_PASSWORD_HERE"` aborta el arranque por su propia regla de pareja. Arreglo: ambos con placeholder o ambos vacíos.
- **D-6 · BAJA — huecos de validación.** `environment.ts:67` acepta puertos `0` o `70000`; combinaciones 465+`false` / 587+`true` no avisan.
- **Tests (BAJA):** `SmtpEmailService.test.ts` — el test «propaga el fallo sin incluir el token» es tautológico (el mensaje lo fija el transporte falso) y el de `verifyConnection` depende de la red y no prueba la delegación; sin test que detecte quitar `escapeHtml(dto.resetUrl)`; `RequestAdminPinResetUseCase.test.ts:154` restaura el espía fuera de un `finally`.
- **Observaciones (no defectos):** el `.catch` síncrono impide rechazos sin manejar con adaptadores `async`; la defensa anti-enumeración por tiempo no cubre el `save()` previo (diferencia preexistente, no empeorada); `auth.routes.ts:29` (`new ConsoleEmailService()`) es preexistente y TK-179 lo mitiga.

## Candidatos a Regla Permanente (Filtro de Sistemicidad, FASE 6.1):
- **Todo adaptador de salida que transporte secretos o tokens exige TLS por defecto** (SMTP `requireTLS`, HTTP solo `https`); desactivarlo solo fuera de producción y con Fail-Fast. Destino propuesto: `docs/04_governance_and_quality/rules/security_rules.md`. Script: no (revisable en Fase 4).
- **Activar un canal de entrega real obliga a revisar qué datos, inofensivos cuando acababan en un log, se vuelven explotables al entregarse**, y a exigir que la configuración que los construye sea concreta en todo entorno donde el canal esté activo. Destino propuesto: paso de la Fase 4 de este workflow (agnóstico → fuente de momoy). Script: no.
- **No registrar `error.message` de librerías de red sin filtrar; registrar `code`/`status`.** Destino propuesto: `security_rules.md` §2 (Tokenización PII). Script: no.
- **Toda librería cliente de red se configura con timeouts explícitos.** Destino propuesto: `backend_rules.md`. Script: no.

Ninguno se escribe sin aprobación humana explícita (FASE 5.C de `05_cascading_dev_workflow.md`).

## VEREDICTO FINAL:
RECHAZADO CON DEFECTOS

---

# Re-auditoría tras las correcciones (2026-10-02)

* **Reviewer:** el mismo Subagente Independiente, sobre el diff corregido, sin acceso de escritura.

## Resumen por Fases:
- Fase 0 (Descubrimiento de Reglas): PASÓ — escenarios 4 y 5 añadidos a `TK-179`; regla §11 aprobada por el humano y ubicada en `docs/04_governance_and_quality/rules/security_rules.md`.
- Fase 1 (Mutation Testing >= 70%): PASÓ — `check_mutation_score.sh` verde en `RequestAdminPinResetUseCase.ts`.
- Fase 2 (Arquitectura Hexagonal / SOLID): PASÓ — `buildSmtpTransportOptions` en infraestructura; las reglas de coherencia SMTP pasan a una lista declarativa (`SMTP_COHERENCE_RULES`) para cumplir el gate de complejidad.
- Fase 3 (Anti-Drift Arquitectónico): PASÓ — residuales de documentación (comentario de `environment.ts`, historial, este informe) corregidos antes del commit.
- Fase 4 (Seguridad, Entornos y Sanitización): PASÓ — D-1 a D-6 cerrados con tests. El test de D-1 falla si se fuerza `requireTLS: false` (oráculo verificado) y comprueba que, con credenciales configuradas, el servidor sin STARTTLS no recibe ni `AUTH` ni `MAIL`. Semgrep 0 hallazgos.
- Fase 5 (UI / WCAG 2.2 Ergonomía Táctil): N/A.

## Defectos Detectados (Si los hay):
- Ninguno bloqueante. Residuales BAJA de la re-auditoría, todos corregidos antes del commit: comentario desactualizado sobre STARTTLS (`environment.ts`), historial y este informe sin la re-auditoría, test de D-1 sin credenciales ni registro de comandos, e importación de tipos sin `import type`.
- Observaciones INFO aceptadas: con `SMTP_SECURE=true` en producción, `SMTP_REQUIRE_TLS=false` aborta aunque no tenga efecto (más estricto de lo necesario); en producción con CORS `*` y SMTP, el primer error nombra `CLIENT_ORIGIN` antes que el comodín.

## Candidatos a Regla Permanente (Filtro de Sistemicidad, FASE 6.1):
- **Cuando una corrección de auditoría cambia un comportamiento, revisar los comentarios y documentos que describían el anterior.** Destino propuesto: paso de re-auditoría del workflow 09 (agnóstico → fuente de momoy). Script: no. Pendiente de aprobación humana; no se escribe.
- De la primera pasada, el humano aprobó solo «TLS obligatorio en adaptadores de salida» (escrito en `security_rules.md` §11); los otros tres candidatos quedan descartados.

## VEREDICTO FINAL:
APROBADO PARA COMMIT
