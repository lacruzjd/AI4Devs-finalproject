---
document: postmortem
id: PM-001
version: 1.0.0
status: closed
severity: alta
detected_at: 2026-09-09T18:40:00-03:00
resolved_at: 2026-09-09T18:54:00-03:00
---

# PM-001: El primer despliegue en Render no arrancaba por URLs sin esquema

## Resumen
El primer despliegue real en Render falló dos veces seguidas: nginx no arrancó en el frontend y el backend abortó su arranque. En ambos casos, el blueprint usaba referencias de la plataforma que devuelven hosts sin esquema en variables que exigen una URL. Se resolvió pasando esos valores a literales con esquema, y el servicio quedó en vivo y verificado a las 18:54.

## Impacto
Ningún usuario afectado: era el primer despliegue del sistema. El servicio no llegó a servir hasta las 18:54. El despliegue era la evidencia de entrega del proyecto, de ahí la severidad alta. `detected_at` es una cota superior: el fallo se detectó antes del primer commit de corrección, pero el log de la plataforma no está versionado y no permite fijar la hora exacta.

## Línea de tiempo
- 08:40 — se declara el blueprint de Render y se parametriza el upstream de nginx, TK-142 (fuente: commit `6d232c7`)
- 18:10 — `render.yaml` pasa a desplegar desde `main` en lugar de la rama de entrega (fuente: commit `1c8d4ca`)
- antes de las 18:40 — despliegue 1: el frontend no arranca con `nginx: [emerg] invalid URL prefix` (fuente: log de la plataforma citado en `3baca93`; hora exacta sin fuente)
- 18:40 — `BACKEND_ORIGIN` pasa a valor literal con esquema (fuente: commit `3baca93`)
- entre 18:40 y 18:45 — despliegue 2: migraciones y seed correctos; Guard 14 aborta con `CLIENT_ORIGIN debe ser una URL válida` (fuente: log citado en `8c48eb8`; hora estimada)
- 18:45 — `CLIENT_ORIGIN` y `CORS_ALLOWED_ORIGINS` pasan a literales `https://` (fuente: commit `8c48eb8`)
- 18:54 — servicio en vivo y verificado contra el despliegue real: `/` 200, fallback SPA 200, API 401 (fuente: commit `49619b2` y TK-142)

## Causas contribuyentes
- **Disparó el fallo:** en el blueprint de Render, las referencias `fromService` con `property: host` y `property: hostport` devuelven valores sin esquema, y se usaron en variables que exigen una URL: el `proxy_pass` de nginx y `CLIENT_ORIGIN`, validado con `z.string().url()`.
- **Le permitió llegar:** el blueprint no se verificó contra la plataforma antes del primer despliegue. La nota de verificación pendiente predijo un 502 en tiempo de ejecución y el fallo real ocurrió al arrancar: una suposición ocupó el lugar de una comprobación. Además, en local el Dockerfile ya define esos valores con esquema, así que el entorno local no podía reproducir el fallo.
- **Defecto latente, todavía abierto:** `CORS_ALLOWED_ORIGINS` compartía el defecto sin dar la cara, porque se valida como `z.string()` y en producción solo se rechaza `*`. Un origen sin esquema habría pasado la validación y roto CORS en silencio, con usuarios. El blueprint se corrigió con un literal, pero la validación del código sigue aceptando el valor inválido.

## Por qué ningún gate lo detectó
- Guard 30 exige verificar contra la fuente real las referencias de terceros fijadas (actions, providers, imágenes), pero no cubre la forma de los valores que resuelve la plataforma de despliegue.
- `check_iac_syntax.sh` solo valida OpenTofu: `render.yaml` no tiene ningún gate.
- `check_env_usage.sh` comprueba que las variables validadas se consuman, no que su validación corresponda a su forma: por eso una variable con forma de URL validada como texto libre pasó inadvertida.
- El workflow 08 de momoy valida después de desplegar. momoy no tiene ninguna verificación previa al despliegue: es el hueco de la etapa 8 de su ciclo de vida.

## Qué funcionó
- El Fail-Fast de Guard 14 y la negativa de nginx a arrancar convirtieron los defectos en fallos inequívocos al arrancar, en lugar de errores en tiempo de ejecución con usuarios.
- Cada corrección dejó escrita en `render.yaml` la lección general, no solo el caso concreto.
- TK-142 no se dio por cerrado hasta verificarlo contra el despliegue real.

## Acciones
- Validar `CORS_ALLOWED_ORIGINS` como lista de URLs con esquema en el esquema Fail-Fast de entorno, cerrando el defecto latente — TK-145
- Verificar antes de desplegar las variables con forma de URL del blueprint — sin acción — se aborda en momoy con `/momoy-release` (ola 2), no en este proyecto

## Candidatos a regla permanente
- **Toda variable de entorno con forma de URL se valida como URL con esquema en el esquema Fail-Fast.** Destino: Guard 14 de `AGENTS.md`, con comprobación en `check_env_usage.sh` (generado por SK-27). Requiere script.
- **Los valores que resuelve la plataforma de despliegue se verifican contra su documentación o un despliegue de prueba antes del primer despliegue.** Destino: extender Guard 30. Requiere un paso de verificación en `/momoy-release`.
