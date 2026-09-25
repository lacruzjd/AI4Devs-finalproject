---
document: technical_ticket
id: TK-159-FE
related_story: US-044
points: 3
type: frontend
status: done
inputs:
  - docs/05_agile_planning/11_user_stories/shared/US-044.md
  - docs/02_architecture_design/adr/ADR-008-superficie-de-operacion-movil.md
---

# TK-159-FE: Shell Instalable y Caché de la Aplicación

> **Navegación del Framework SDD:**
> [Historia US-044](../../../11_user_stories/shared/US-044.md) | [Índice de tickets](../../indice_tickets.md) | [Matriz de trazabilidad](../../../13_matriz_trazabilidad.md)

---

## Descripción
Convertir el cliente en una aplicación instalable: manifiesto de aplicación, service worker que cachea el bundle para que la interfaz abra sin conexión, e invalidación de ese caché atada a la versión del release para que un despliegue nuevo no deje clientes ejecutando el bundle viejo.

*   **ID US Relacionada:** `US-044`
*   **Módulo / Vertical Slice:** `shared`
*   **Estimación (Story Points):** 3 SP
*   **Prioridad MoSCoW:** Must Have
*   **Prerrequisitos:** ninguno

---

## Alcance de Modificación (Hexagonal Layers)
**Infrastructure (UI):** manifiesto de aplicación e iconos, registro del service worker en el arranque del cliente, estrategia de caché del bundle y su invalidación por versión. La herramienta concreta sale de `docs/00_stack_manifest.md`; si no declara ninguna, se reporta como gap antes de elegirla.

---

## Mitigación de Riesgos Técnicos
1. **Cliente atrapado en una versión vieja:** el caché se versiona con el release y el service worker toma el control solo tras activar la versión nueva. Sin esto, un despliegue corregido no llega a quien ya instaló.
2. **Caché de respuestas de la API:** este ticket cachea el bundle, **no** datos de inventario. Servir stock cacheado como si fuera actual sería peor que no funcionar.
3. **Cabeceras de seguridad:** el service worker se sirve bajo la política de contenido ya declarada; ampliarla exige justificarlo, no relajarla en silencio.

---

## Criterios de Aceptación & DoD (Definition of Done)
### Escenario 1 (Happy Path)
*   **Given** la aplicación abierta una vez con conexión
*   **When** el dispositivo pierde la red y el operario la vuelve a abrir
*   **Then** la interfaz carga desde el caché sin error de red

### Escenario 2 (Despliegue nuevo)
*   **Given** un cliente con una versión ya instalada
*   **When** se despliega una versión nueva y el operario recarga
*   **Then** el cliente pasa a la versión nueva y el caché anterior se descarta

### Escenario 3 (Datos nunca cacheados)
*   **Given** el cliente sin conexión
*   **When** se abre una pantalla que depende de datos de inventario
*   **Then** se muestra el estado sin conexión, nunca un dato de stock obsoleto presentado como actual

### DoD Estricto:
1. **TDD Compliance:** el test se escribe y se ve fallar antes de la implementación, con el runner declarado en `docs/00_stack_manifest.md`.
2. **Precisión Aritmética:** no aplica; este ticket no maneja cantidades.
3. **Verificación Total:** cero errores en los comandos de test, build y lint declarados en `AGENTS.md`.

---

## Verificación pendiente declarada al cerrar (2026-09-25)

Dos cosas no quedan cubiertas por los tests y se declaran en vez de darse por hechas:

1. **El comportamiento del service worker no tiene test unitario.** `public/sw.js` corre en el ámbito de un worker y no se puede ejercitar de forma fiable en el entorno de pruebas del proyecto. Lo verificado automáticamente es el registro (4 tests) y la salida del build: `sw.js`, `manifest.webmanifest` e `icon.svg` se publican y la versión del paquete queda inyectada en el bundle. Los escenarios 1 a 3 del ticket —abrir sin red, recibir un despliegue nuevo, no servir stock cacheado— exigen un navegador real: corresponden a `/momoy-verify-live` (workflow 09), no a un test de nodo.
2. **El icono es un marcador de posición.** `public/icon.svg` es una forma geométrica con el color primario declarado en `DESIGN.md`, no una identidad de marca. Android suele exigir PNG de 192 y 512 px para ofrecer la instalación, así que el icono definitivo es un artefacto de diseño pendiente — no se inventa aquí una marca que nadie aprobó.

---

## Instrucciones de Ejecución Autónoma para Agente IA
1. **Leer `docs/00_stack_manifest.md`** antes de añadir cualquier dependencia; si la herramienta de service worker no está declarada, reportarlo como gap en vez de elegirla por costumbre.
2. **Ejecutar TDD Suite:** comando de test declarado en `AGENTS.md`.
3. **Comando de Verificación Total:** comandos de build y lint declarados en `AGENTS.md`.
