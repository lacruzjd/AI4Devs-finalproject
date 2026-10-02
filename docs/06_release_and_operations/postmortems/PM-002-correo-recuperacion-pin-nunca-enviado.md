---
document: postmortem
id: PM-002
version: 1.0.0
status: closed
severity: alta
detected_at: 2026-10-01T16:00:00-03:00
resolved_at: 2026-10-01T16:57:00-03:00
---

# PM-002: El correo de recuperación de PIN nunca se envió

## Resumen
El humano reportó que el correo de recuperación de PIN no llegaba en ningún caso, incluido el de un administrador bloqueado tras cinco intentos fallidos. La causa: desde `TK-077` la única implementación del puerto `IEmailService` era `ConsoleEmailService`, un adaptador de desarrollo, y ningún punto de arranque inyectaba otra. La respuesta genérica anti-enumeración («se enviaron instrucciones») ocultaba el fallo. `TK-179` añade un adaptador SMTP real con nodemailer, lo conecta en `server.ts` y lo verifica contra un servidor SMTP real fuera de la suite de tests.

## Impacto
Ningún administrador pudo recuperar su acceso por correo desde que existe la función (2026-08-31). Un administrador bloqueado solo podía volver a entrar si otro `ADMIN` lo desbloqueaba; si era el único, la administración quedaba inaccesible sin tocar la base de datos. No hubo pérdida de datos ni fuga de tokens: desde `TK-133` el adaptador de producción no los escribe en los logs. Los operarios no se ven afectados: la recuperación por correo es solo para `ADMIN` (`US-018`). `detected_at` es aproximado: el reporte llegó en conversación, sin hora registrada.

`resolved_at` marca la corrección verificada en el código, no su despliegue. Para que el correo salga en un entorno hay que desplegar `TK-179` y configurar allí las variables `SMTP_*`; la demo de Render no las tiene.

## Línea de tiempo
- 2026-08-31 20:19 — `TK-077` implementa la recuperación con el puerto `IEmailService` y `ConsoleEmailService` como única implementación (fuente: commit `2b44bb5`)
- 2026-08-31 23:55 — la auditoría de `TK-077` (workflow 09) lo aprueba; sus tests inyectan `ConsoleEmailService` (fuente: commit `954d05f`)
- 2026-09-08 18:07 — `AUDIT-SEC-004` F-3 diagnostica «la recuperación de PIN de admin no funciona en producción». `TK-133` corrige solo la fuga del token a los logs y añade un aviso de arranque; F-3 queda marcado como «Corregida» (fuente: commit `c3a0e64` y `docs/audits/AUDIT-SEC-004-hardcoded-credentials-and-auth.md` §F-3)
- 2026-10-01, tarde — el humano reporta que el correo no llega, ni siquiera tras el bloqueo por intentos fallidos (fuente: conversación; hora sin registrar)
- 2026-10-01 — diagnóstico, decisiones humanas (SMTP con nodemailer, solo `ADMIN`, arrancar con aviso si falta SMTP), test de regresión aprobado en borrador y `TK-179` (fuente: `TK-179.md`)
- 2026-10-01 16:57 — backend compilado verificado de punta a punta: bloqueo, correo recibido por un servidor SMTP real, nuevo PIN con el token del correo y login correcto (fuente: verificación de `TK-179`)

## Causas contribuyentes
- **Disparó el fallo:** `server.ts` llama a `createApp` sin `emailService`, y `createAuthRouter` cae a `new ConsoleEmailService()`. No existía ninguna otra implementación de `IEmailService` ni ningún proveedor de correo en `docs/00_stack_manifest.md`.
- **Le permitió llegar:** `TK-077` se dio por terminado con un adaptador de desarrollo. Sus criterios (`US-018` Escenario 1: «se despacha un correo») se comprobaron contra el puerto, no contra un correo entregado.
- **Le permitió seguir abierto un mes:** `AUDIT-SEC-004` F-3 encontró el fallo y describió sus dos efectos, pero `TK-133` solo corrigió el de seguridad. El hallazgo se cerró entero como «Corregida» y el efecto funcional quedó reducido a un `console.warn` de arranque que nadie convirtió en ticket.
- **Lo ocultó al usuario:** la respuesta anti-enumeración es idéntica se envíe o no el correo. Es correcta por seguridad, pero hace invisible cualquier fallo de entrega para quien la recibe.

## Por qué ningún gate lo detectó
- Los tests de `TK-077` y de `AdminPinRecovery.test.ts` usan `ConsoleEmailService.getLastSentEmail()`: verifican que se llamó al puerto, nunca que un mensaje saliera. Es el Antipatrón B de `.agents/rules/04_verified_implementation_standard.md` aplicado a un adaptador, no a un artefacto de despliegue.
- La regla 04 y el workflow 08 (verificación con el stack real) recorren el flujo en el navegador, pero el flujo de recuperación termina en la respuesta genérica: una verificación visual da por bueno un correo que nunca salió.
- `check_env_usage.sh` comprueba variables validadas sin consumir. No hay ningún gate que detecte un puerto de salida cuya única implementación de producción es un adaptador de desarrollo.
- Ningún procedimiento obliga a que un hallazgo de auditoría con varios efectos se cierre efecto por efecto: F-3 se cerró con uno de dos.

## Qué funcionó
- El puerto `IEmailService` (arquitectura hexagonal) hizo que la corrección no tocara el dominio ni el contrato HTTP: un adaptador nuevo y una línea en el punto de arranque.
- El endurecimiento de `TK-133` evitó que, mientras tanto, los tokens de recuperación quedaran en los logs.
- El borrador de test con punto de control humano del workflow 12 obligó a fijar qué significa «funciona» (un servidor SMTP recibe el mensaje) antes de corregir.

## Acciones
- Enviar el correo de recuperación por SMTP real, verificar la conexión al arrancar y no esperar el envío en la petición (anti-enumeración por tiempo y por error) — TK-179
- Configurar `SMTP_*` en la plataforma de producción cuando se decida (hoy Render es solo demo) — sin acción — depende de la decisión pendiente sobre la plataforma de producción de la release 1.1.0

## Candidatos a regla permanente
- **Un puerto de salida (correo, SMS, pagos, colas) no se da por terminado mientras su única implementación sea un adaptador de desarrollo o consola.** El ticket debe entregar un adaptador real verificado contra un servidor real, o declarar explícitamente la función como no operativa en producción. Destino: ampliar el Antipatrón B de `.agents/rules/04_verified_implementation_standard.md` (agnóstico → se propone en la fuente de momoy, no en la copia instalada). Requiere un gate: detectar en el punto de arranque puertos cuya única implementación se llama `Console*`/`InMemory*`/`Fake*`.
- **Un hallazgo de auditoría con varios efectos se cierra efecto por efecto.** Si una corrección cubre solo algunos, el hallazgo queda «Parcial» y el resto recibe su propio ticket. Destino: paso de cierre del workflow 09 de momoy. No requiere script.
