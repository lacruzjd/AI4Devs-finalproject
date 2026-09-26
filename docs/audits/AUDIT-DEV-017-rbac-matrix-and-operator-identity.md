# 🧪 Informe de Auditoría de Desarrollo — AUDIT-DEV-017

* **ID Auditoría:** AUDIT-DEV-017
* **Fecha:** 2026-09-25
* **Auditor:** Sesión de diagnóstico a petición del humano — reportó dos fallos observados operando la aplicación desplegada: «no se pueden seleccionar los permisos para los roles» y «al dar de alta a un operario no se puede agregar o ver el id del operario para ingresar al sistema».
* **Alcance:** `RolesManagementPanel` (matriz de permisos, `US-015`) e identidad de acceso del operario (`US-001`/`US-010`).
* **Método:** Reproducción en vivo contra el stack Docker real (`restostock_postgres` + `restostock_backend`, `NODE_ENV=production`, 18 migraciones aplicadas) — `curl` autenticado contra la API para aislar backend de frontend, más un test RTL desechable contra el componente real para confirmar el defecto de estado. **No** solo lectura de código: ambos hallazgos están reproducidos.

---

## 📋 Resumen ejecutivo

| # | Severidad | Título | Naturaleza | Estado |
| :-- | :-- | :-- | :-- | :-- |
| **F-1** | 🟠 **Alta** | La matriz de permisos no refleja ni acumula cambios: cada clic **destruye** la concesión anterior | Defecto de implementación (frontend) | **Confirmada, corregida en `TK-172-FE`** |
| **F-2** | 🟠 **Alta** | El identificador de acceso del operario no existe en ninguna superficie de la interfaz | Brecha de especificación | **Confirmada, cerrada por `US-051`** |
| **F-3** | 🟡 Media | `catch {}` vacío en la carga de roles/permisos (viola Guard 6 §2) | Defecto de implementación | **Corregida en `TK-172-FE`** |
| **F-4** | 🟢 Baja | Comentario obsoleto justifica un diseño cuya restricción ya no existe | Deuda documental en código | **Corregida en `TK-173-FE`** |

---

## 🚨 Hallazgos detallados

### F-1 — 🟠 Alta: la matriz de permisos parte siempre de un estado obsoleto

**El backend está sano.** Verificado contra el contenedor real con un JWT de `ADMIN`:

```
POST /api/v1/roles                          → 201  {"id":"role-1790386120291","name":"TEST_BODEGA","permissions":[]}
PUT  /api/v1/roles/{id}/permissions         → 200  {"message":"Permisos actualizados correctamente"}
GET  /api/v1/roles                          → TEST_BODEGA ['stock:extract', 'stock:read']
```

La escritura funciona y persiste. El defecto es exclusivamente de frontend.

**Path de datos:**

1. `RolesManagementPanel.tsx:135` — al recargar, `loadData` conserva **el objeto `prev`** en vez de re-leer el rol de la lista recién traída:
   ```js
   setSelectedRole((prev) => (prev && rList.some((r) => r.id === prev.id) ? prev : rList[0] ?? null));
   ```
   `rList.some(...)` solo comprueba que el rol *siga existiendo*; el valor que se conserva es el viejo. `roles` se refresca, `selectedRole` no.
2. `RolesManagementPanel.tsx:148` — `togglePermission` calcula el estado siguiente desde `selectedRole.permissions`, es decir, desde la copia congelada.
3. `PermissionsList` pinta el check desde `selectedRole.permissions.some(...)` — también congelado.

**Consecuencias (ambas reproducidas con un test RTL contra el componente real):**

| Síntoma | Evidencia |
| :-- | :-- |
| El check nunca se marca tras un guardado con éxito | `permission-check-indicator--active` = 0 tras un `PUT` que devolvió 200 |
| El segundo permiso **borra** el primero | esperado `['perm-1','perm-3']`, obtenido `['perm-3']` |

El segundo punto es el grave y no es cosmético: `PUT /:id/permissions` **reemplaza** la matriz completa. Partiendo siempre del mismo estado obsoleto, cada clic manda un array que ignora todo lo concedido después de la última carga. Un rol nunca puede acumular más de un permiso, y la concesión anterior se pierde en silencio, sin error visible. Es pérdida de datos, no un fallo de refresco.

**Por qué sobrevivió a `TK-117` y `TK-121-FE`:** no existe ningún test para `RolesManagementPanel` — `find` sobre `apps/frontend/src/features/security/` no devuelve ningún `.test.tsx`. `US-015` se cerró con cobertura de backend (`RolesRbac.test.ts`, `CustomRolePermissions.test.ts`) y de gating de navegación (`PermissionGating.test.tsx`); el componente que *escribe* la matriz nunca tuvo prueba. Instancia exacta de lo que Guard 11 pretende evitar.

### F-2 — 🟠 Alta: el identificador de acceso del operario no existe en la interfaz

No es un defecto de implementación: es una **contradicción entre especificación aprobada e implementación**, que el propio código documenta sin haberla cerrado.

**Path de datos (reproducido contra el backend real):**

| Capa | Comportamiento actual | Fichero |
| :-- | :-- | :-- |
| Alta | `crypto.randomUUID()` | `CreateUserUseCase.ts:24` |
| Confirmación de alta | muestra nombre y estado, **omite `created.id`** pese a venir en el DTO | `CreateUserForm.tsx:107` |
| Listado de personal | pinta nombre, rol y estado, **nunca `user.id`** pese a estar en `UserListItem` | `UserStatusForm.tsx:170-172` |
| Login | exige teclear ese UUID a mano | `PinLoginModal.tsx:37` |

```
POST /api/v1/auth/users  → {"id":"5de8c6cf-d20c-4dd2-b193-02c5768f4773","name":"Operario Diagnostico",...}
POST /api/v1/auth/login-pin  {"userId":"5de8c6cf-…"}            → 200
POST /api/v1/auth/login-pin  {"userId":"Operario Diagnostico"}  → 404
```

El administrador da de alta al operario y **el UUID se pierde**: no se muestra al crearlo, no aparece en la lista de personal, y es la única credencial que `login-pin` acepta. Aunque se mostrara, exigirle a un operario teclear 36 caracteres hexadecimales en una terminal táctil con guantes es inviable por el NFR de ergonomía de `US-001`.

**Incumplimientos de especificación aprobada:**

* **`US-001` Escenario 1** — *«el operario **selecciona su perfil** "Carlos Gomez" e ingresa el PIN "1234"»*. La especificación describe una identidad reconocible, no un identificador opaco tecleado.
* **`US-010` Escenario 1** — *«el operario puede autenticarse inmediatamente con el PIN asignado vía `POST /api/v1/auth/login-pin`»*. Hoy no puede: nadie conoce su identificador.

**Evidencia de que el humano chocó con esto en uso real:** la base de datos contenía tres operarios (`Jose David`, `Jose`, `Jose`) creados desde la interfaz, todos con UUID, ninguno utilizable para iniciar sesión.

**Decisión de producto (Guard 28, resuelta por el humano el 2026-09-25):**

1. **Identidad:** código corto de operario (`operatorCode`), tecleado en el login. Se descartó el selector de operarios porque expondría la plantilla completa en una terminal pública sin autenticar.
2. **Origen del código:** lo escribe el administrador en el alta; la unicidad la impone un índice único real en la base de datos (**Guard 39**), no una comprobación previa en código.
3. **Datos existentes:** los tres operarios de prueba se eliminan; `bootstrap-admin` conserva `bootstrap-admin` como su código, de modo que las credenciales publicadas para la revisión siguen siendo válidas verbatim.

### F-3 — 🟡 Media: silencio deliberado en la carga de la matriz

`RolesManagementPanel.tsx:136`:

```js
} catch {
  // Handled silently — la UI muestra la lista vacía
}
```

Viola **Guard 6 §2** (*No Silent Catches*) de forma explícita y comentada. Si `fetchRoles` o `fetchPermissions` fallaran —403 por permiso retirado, backend caído, token caducado—, la pantalla quedaría vacía y muda, indistinguible de «este despliegue no tiene roles». Durante este diagnóstico obligó a descartar esa hipótesis con `curl` en vez de leerla en pantalla. El estado de error ya existe (`ErrorBanner` + `mapToUserFriendlyError`), solo que esta ruta no lo usa.

### F-4 — 🟢 Baja: comentario que justifica una restricción ya inexistente

`PinLoginModal.tsx:26` justifica el campo de texto libre con: *«El backend no expone ningún endpoint para listar operarios»*. Era cierto cuando se escribió; dejó de serlo con `TK-056`, que añadió `GET /api/v1/auth/users` — endpoint que `UserStatusForm` ya consume. La restricción desapareció y la pantalla de login nunca se revisó. El comentario no causa el fallo, pero es exactamente el tipo de racional obsoleto que hace que un defecto se lea como decisión deliberada.

---

## 🧭 Lección de proceso

Los dos hallazgos principales comparten una causa de proceso, no de código: **la superficie de escritura se dio por cerrada verificando la capa que no falla**. `US-015` se cerró con cobertura de autorización de backend sin un solo test del componente que escribe la matriz. `US-010` se cerró declarando en su propia Nota de Alcance que *«el bloqueo/reactivación ahora se hace desde una lista real, no por ID escrito a mano»* — cierto para bloquear, falso para entrar, y nadie recorrió el camino completo alta → login como lo recorre un humano.

Ambos son defectos que solo aparecen **operando la aplicación de punta a punta**, igual que el hallazgo de `TK-049-FE` registrado en `15_history.md:118` (el `<select>` con operarios de fixtures que hacía imposible el login tras un despliegue nuevo). Es la tercera vez que la identidad de acceso del operario falla por la misma razón.

---

## 🔗 Relacionado

* [`US-015`](../05_agile_planning/11_user_stories/security/US-015.md) — RBAC dinámico; F-1 y F-3 son defectos de su superficie de frontend.
* [`US-001`](../05_agile_planning/11_user_stories/auth/US-001.md) / [`US-010`](../05_agile_planning/11_user_stories/auth/US-010.md) — las especificaciones que F-2 incumple.
* [`US-051`](../05_agile_planning/11_user_stories/auth/US-051.md) — historia que cierra F-2 y F-4.
* [`TK-172-FE`](../05_agile_planning/12_tickets/security/frontend/TK-172-FE.md) — remediación de F-1 y F-3.
* [`AUDIT-SEC-002`](./AUDIT-SEC-002-roles-endpoint-unguarded.md) — hallazgo previo sobre las mismas rutas, capa distinta (autorización de backend).
