---
document: adr
id: ADR-010
status: accepted
date: 2026-09-25
---

# ADR-010: Con qué se implementa el almacenamiento local de la cola sin conexión

- **ID:** ADR-010
- **Estado:** `Accepted`
- **Fecha:** 2026-09-25
- **Decidido por:** el humano, sobre la matriz de opciones de `SK-36`
- **Implementado por:** [`TK-160-FE`](../../05_agile_planning/12_tickets/shared/frontend/TK-160-FE.md) — `US-044`
- **Relación con `ADR-002`:** lo **acota**, no lo reemplaza. `ADR-002` sigue `accepted` y vigente en todo lo demás —framework, estilos, estrategia de pruebas— y su elección de **IndexedDB** como mecanismo de persistencia local se mantiene intacta. Lo único que esta decisión estrecha es la librería envoltorio que aquel ADR nombró de paso.

## Contexto

`ADR-002` decidió *"IndexedDB (vía Dexie.js)"* para la cola de transacciones sin conexión. Al implementar `TK-160-FE` se constató que **Dexie nunca se instaló**: no aparece en `apps/frontend/package.json`, como tampoco ninguna otra pieza de aquella decisión. La cola completa quedó sin construir durante toda la vida del proyecto, algo que este mismo ciclo destapó y que `ADR-008` recoge.

Al retomarla, la elección del envoltorio vuelve a estar abierta, y el alcance real resultó mucho más estrecho que el que justificaría una librería: **un único almacén de objetos** con alta, listado, actualización de estado y borrado. Sin consultas compuestas, sin índices múltiples, sin migraciones de esquema local, sin transacciones entre almacenes.

Fuerzas en tensión:

- Desviarse de un ADR aceptado sin registrarlo es exactamente la deriva entre decisión y código que este proyecto ya arrastró con esta misma capacidad.
- Toda dependencia nueva obliga a la auditoría de `SK-23` y pasa a formar parte de la superficie que hay que mantener y vigilar.
- El proyecto acaba de decidir, para el service worker de `TK-159-FE`, escribir a mano en lugar de añadir Workbox, por el mismo razonamiento de alcance estrecho.

No se decide aquí el formato de las operaciones encoladas ni su política de reintento, que salen de `ADR-009` y de la historia.

## Opciones

| Criterio | 1. Instalar Dexie (lo que dijo `ADR-002`) | 2. IndexedDB directo tras un puerto | 3. IndexedDB directo sin registrar |
|---|---|---|---|
| Fidelidad a la decisión previa | Total | Se acota y queda registrado | El repositorio se contradice a sí mismo |
| Dependencias nuevas | Una, más su árbol | Ninguna | Ninguna |
| Código propio a mantener | Mínimo | Un adaptador de unas 70 líneas | Igual |
| Auditoría exigida | `SK-23` antes de añadirla | Ninguna | Ninguna |
| Capacidad sobrante | Consultas, índices y migraciones que esta cola no usa | Ninguna | Ninguna |
| Riesgo | Superficie que mantener por una necesidad estrecha | Escribir a mano una API incómoda de usar | La deriva se vuelve invisible otra vez |

## Decisión

**Opción 2: IndexedDB directo, detrás de un puerto de almacenamiento.** La lógica de la cola —encolar, sincronizar, estados por operación— depende de una interfaz, no de IndexedDB; el adaptador real es delgado y hay una implementación en memoria para las pruebas, igual que el proyecto ya hace con sus repositorios de backend.

**Decisión del humano** el 2026-09-25, coherente con la que tomó el mismo día para el service worker de `TK-159-FE`.

El criterio que rompe el empate es el alcance: un solo almacén de objetos sin consultas compuestas no justifica una dependencia, y el puerto deja la puerta abierta a introducir Dexie más adelante sin tocar la lógica, si la cola creciera hasta necesitarla.

## Consecuencias

- `ADR-002` conserva su estado `accepted`. Un lector que llegue a su mención de Dexie encontrará aquí por qué el código dice otra cosa, que es justo lo que faltaba.
- La lógica de la cola es comprobable sin navegador, contra la implementación en memoria del puerto. El adaptador de IndexedDB, en cambio, **no queda cubierto por pruebas unitarias** —igual que el service worker de `TK-159-FE`— y su verificación corresponde al workflow de verificación en vivo.
- Si la cola llegara a necesitar consultas por índice, migraciones de esquema local o varios almacenes, esta decisión se revisa: el puerto es precisamente el punto donde se cambiaría.
- El manifiesto de stack declara IndexedDB sin librería, para que el próximo que implemente algo local no vuelva a asumir Dexie.
