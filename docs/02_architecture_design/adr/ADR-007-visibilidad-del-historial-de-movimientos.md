---
document: adr
id: ADR-007
status: accepted
date: 2026-09-18
---

# ADR-007: Quién puede consultar el historial de movimientos de stock

## Contexto

`GET /api/v1/stock/movements` está protegido con `requireRole('ADMIN')` desde `TK-050`, con el criterio escrito en el propio código: *"Trazabilidad de movimientos: dato administrativo — solo ADMIN"*. En la interfaz, la pantalla vive en `/ajustes`, cuya entrada de navegación exige `roles:manage`.

La revisión externa `EXT-001` (R-02) señaló que un operario no puede ver qué se movió en su turno, aunque sí puede provocar esos movimientos (extracción de bodega, consumo, descarte). Fuerzas en tensión: la trazabilidad es útil en el turno para resolver descuadres, y a la vez expone quién hizo cada operación, lo que puede leerse como control del desempeño.

No se decide aquí qué columnas muestra la pantalla ni si existe exportación.

## Opciones

| Criterio | 1. Abrir con `stock:read` | 2. Permiso nuevo `movements:view` | 3. Mantener solo ADMIN |
|---|---|---|---|
| Quién lo ve | Quien ya consulta el inventario | Quien el administrador decida | Solo administración |
| Permisos nuevos | Ninguno | Uno, con migración de roles existentes | Ninguno |
| Utilidad en el turno | Alta: resuelve descuadres donde ocurren | Alta, si se concede | Nula sin un administrador presente |
| Exposición de quién hizo cada operación | A todo el equipo operativo | Controlada por rol | Mínima |
| Coste de revertir | Bajo: volver a exigir ADMIN | Medio: hay que retirar el permiso concedido | — |

## Decisión

Opción 1: el historial se abre a quien ya tiene `stock:read`. **Decisión del humano** en la Fase 1.5 del workflow 01, el 2026-09-18, tras la revisión externa `EXT-001`.

Esta decisión **supersede el criterio de `TK-050`** ("dato administrativo — solo ADMIN"), que queda registrado aquí como decisión anterior, no borrado de su ticket.

## Consecuencias

- Positivas: el operario resuelve un descuadre sin esperar a un administrador; no se añaden permisos ni migraciones de rol.
- Negativas: el equipo operativo ve quién ejecutó cada movimiento. Si eso genera fricción, la vuelta atrás es volver a exigir ADMIN, o abrir la opción 2 con un ADR nuevo.
- El comentario de `stock.routes.ts` que declara el criterio anterior debe actualizarse citando este ADR, para que el código no contradiga la decisión vigente.

Implementado por: US-038, TK-153
