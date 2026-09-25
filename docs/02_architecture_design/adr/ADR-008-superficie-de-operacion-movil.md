---
document: adr
id: ADR-008
status: accepted
date: 2026-09-25
---

# ADR-008: Sobre qué superficie se opera RestoStock desde un dispositivo personal

- **ID:** ADR-008
- **Estado:** `Accepted`
- **Fecha:** 2026-09-25
- **Decidido por:** el humano, sobre la matriz de opciones de `SK-36`
- **Implementado por:** — pendiente de cascada de spec

## Contexto

`ADR-002` diseñó el cliente de cocina para **una tablet táctil fija y compartida**, instalada en el local, y decidió resiliencia offline con *"IndexedDB vía Dexie.js, complementada con un Service Worker"* para *"habilitar el acceso al software 100% offline"*. Se decide ahora que el personal también opere la aplicación desde su propio teléfono.

Eso cambia dos premisas de `ADR-002` a la vez: el dispositivo deja de ser uno y compartido para pasar a ser varios y personales, y el entorno de ejecución pasa de una tablet enchufada a un navegador móvil que descarta pestañas en segundo plano de forma mucho más agresiva.

Verificado contra el repositorio antes de decidir: la resiliencia que `ADR-002` dio por resuelta **no está implementada**. `apps/frontend/package.json` no declara `dexie` ni ninguna librería de service worker, no existe ningún service worker ni su registro, y no hay cola de transacciones. Lo único que existe es `apps/frontend/src/shared/hooks/useOnlineStatus.ts` y el componente `OfflineBanner`: la aplicación **avisa** de que no hay red, pero no sigue operando sin ella.

Fuerzas en tensión:

- El escaneo de código de barras se resolvió deliberadamente con `getUserMedia` para comportarse igual en Chrome, Safari y Firefox sin depender de `BarcodeDetector` nativa, y con un único camino de código.
- Los objetivos táctiles de 48px ya son estándar del proyecto, pero el sistema de diseño no declara matriz de breakpoints.
- El despliegue vigente es web y está cubierto por el workflow de release; una tienda de aplicaciones quedaría fuera de él.
- La autenticación por PIN se pensó para personal que comparte un dispositivo.

No se decide aquí si se implementa la cola offline —eso ya lo decidió `ADR-002`—, ni el diseño responsive concreto, que corresponde a `SK-05`, ni el método de autenticación.

## Opciones

| Criterio | 1. SPA responsive (statu quo) | 2. PWA instalable | 3. Cliente nativo o híbrido |
|---|---|---|---|
| Superficie declarada | Web | Web | Nueva, además de Web |
| Bases de código | Una | Una | Dos |
| Escáner de código de barras | Intacto | Intacto | Se rehace: descarta la decisión de `getUserMedia` |
| Deuda de resiliencia de `ADR-002` | Sigue abierta, y más expuesta en móvil | Se cierra | Se cierra sólo en el cliente nuevo |
| Operación sin red | No | Sí, con cola local y bundle cacheado | Sí |
| Despliegue | El actual | El actual, más versionado del caché | Tiendas, firmas y ciclos fuera del workflow 10 |
| Soporte de momoy | Completo | Completo | `SK-05` es agnóstica de plataforma, pero no existe skill de desarrollo móvil |
| Coste de revertir | Trivial | Medio: desregistrar el service worker en clientes que ya cachearon | Muy alto, y supersede parte de `ADR-002` |

## Decisión

**Opción 2: PWA instalable.** Se declara `Web` como única superficie objetivo y se cierra la deuda de `ADR-002` con manifiesto de aplicación, service worker y cola de transacciones en IndexedDB. **Decisión del humano** el 2026-09-25, coincidente con la recomendación del análisis.

La fuerza decisiva no es el tamaño de la pantalla. Que la interfaz se adapte al móvil es una matriz de breakpoints en el sistema de diseño; lo que falta de verdad es que la aplicación sobreviva a la desconexión que su propio ADR dio por resuelta, y el móvil agrava ese fallo en lugar de introducirlo. La opción 1 deja la deuda intacta y más expuesta; la opción 3 paga un cliente entero antes de haber implementado lo ya decidido.

`ADR-002` no queda superseded: esta decisión **amplía** su contexto de un dispositivo compartido a varios personales, sin contradecir su stack ni su estrategia de persistencia.

## Consecuencias

- `docs/00_stack_manifest.md` debe declarar explícitamente la superficie objetivo, que hoy no aparece en ninguna sección. Sin ese dato, `SK-05` está obligada a preguntarla en cada ejecución en lugar de leerla.
- Entra trabajo nuevo de frontend: manifiesto de aplicación, service worker con estrategia de caché, y la cola de transacciones con su sincronización al recuperar la red.
- El caché del service worker pasa a ser parte del release: una versión nueva debe invalidar la anterior, o los clientes seguirán ejecutando el bundle viejo. Esto toca el workflow de release y la verificación posterior al despliegue.
- **Aparece resolución de conflictos donde antes no existía.** Con una tablet única, la cola era secuencial por construcción. Con varios teléfonos encolando en paralelo, dos operarios pueden registrar consumos del mismo remanente sin red y sincronizar después. Qué gana, qué se rechaza y qué se le muestra al operario es una decisión de arquitectura por derecho propio: **requiere su propio ADR antes de especificar los tickets de la cola**, no una resolución improvisada dentro de un ticket.
- El sistema de diseño gana matriz de breakpoints; los 48px existentes se conservan.
- Si en el futuro apareciera un requisito de notificaciones push fiables en iOS o de hardware fuera del alcance del navegador, esta decisión se revisa con un ADR nuevo que supersedería además la sección de stack de `ADR-002`.
