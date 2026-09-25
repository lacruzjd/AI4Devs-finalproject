---
document: adr
id: ADR-009
status: accepted
date: 2026-09-25
---

# ADR-009: Cómo se resuelven los conflictos de la cola de operaciones sin conexión

- **ID:** ADR-009
- **Estado:** `Accepted`
- **Fecha:** 2026-09-25
- **Decidido por:** el humano, sobre la matriz de opciones de `SK-36`
- **Implementado por:** — pendiente de cascada de spec

## Contexto

`ADR-008` decidió operar desde dispositivos personales con una PWA instalable y cerrar la cola de transacciones sin conexión que `ADR-002` había aceptado. Con una única tablet compartida la cola era secuencial por construcción; con varios teléfonos encolando en paralelo, dos operarios pueden registrar operaciones sobre el mismo remanente sin verse, y ambas llegan juntas al sincronizar.

Lo que el modelo de datos permite hoy, verificado en `apps/backend/prisma/schema.prisma`:

- **No existe bloqueo optimista.** Ningún modelo declara una columna de versión; sólo `updatedAt`. El servidor no puede detectar que el estado cambió entre que el cliente lo leyó y lo escribió.
- **`StockMovement.createdAt` lo sella el servidor** al recibir la operación, no la cocina al ejecutarla.
- `Remanente` expone tres campos que dos operarios pueden pisar a la vez: `currentQuantity`, `isPristine` y `status`.

Las colisiones concretas que esto produce:

1. **Sobreconsumo.** Dos operarios consumen 200 g cada uno de un remanente con 300 g. Al sincronizar, la segunda operación dejaría la cantidad en negativo.
2. **Remanente ya terminal.** Uno lo descarta; otro tenía encolado un consumo sobre algo que al llegar ya no existe.
3. **`isPristine` perdido.** Uno consume y el remanente deja de estar intacto; otro tenía encolada una devolución a bodega, que exige envase sin abrir (`ADR-003`).
4. **Reenvío duplicado.** Un reintento de sincronización aplica la misma operación dos veces, porque no hay clave de idempotencia en el contrato.
5. **El orden miente.** Lo ocurrido a las 14:02 se registra a las 16:30. FEFO y el cierre de turno leen ese orden como si fuera el real.

No se decide aquí la interfaz de la cola, su tamaño o caducidad, ni la autenticación por dispositivo.

## Opciones

| Criterio | 1. Rechazar y reintentar | 2. Aceptar y derivar a varianza | 3. Restringir qué es encolable |
|---|---|---|---|
| Quién tiene la autoridad | El servidor, siempre | La cocina: el producto ya se usó | El servidor, por construcción |
| Invariantes de stock | Nunca se rompen | Se preservan acotando a cero y registrando la diferencia | Nunca se rompen |
| Qué vive el operario | El rechazo llega horas después, con el producto ya consumido | La operación se acepta; el descuadre aparece en el cierre de turno | Aviso inmediato de que hace falta conexión |
| Trabajo perdido | El del operario que registró de buena fe | Ninguno | Ninguno: no llega a empezar |
| Maquinaria nueva | Ninguna | Ninguna: reutiliza conciliación de turno y el catálogo de motivos | Clasificar cada operación como encolable o no |
| Consumo sin conexión | Sí, pero anulable después | Sí | No |
| Coste de revertir | Bajo | Medio: quedan movimientos escritos como varianza | Bajo |

## Decisión

**Opción 2: la operación encolada se acepta siempre.** Si al aplicarla la cantidad resultante fuese negativa, `currentQuantity` se acota a cero y la diferencia se registra como **varianza con motivo obligatorio del catálogo de `ADR-004`**, que aflora en la conciliación de turno. **Decisión del humano** el 2026-09-25, coincidente con la recomendación del análisis.

La fuerza decisiva es física, no técnica: **el producto ya salió de la nevera**. Un sistema de inventario existe para reflejar lo que pasó en la cocina, no para negarlo. La opción 1 vuelve inútil el modo sin conexión justo en el caso que lo motivó —el operario descubre el rechazo cuando el insumo ya está en el plato— y la opción 3 prohíbe precisamente la operación más frecuente del turno.

Pesa además que la opción 2 no estrena mecanismo: la conciliación de turno con varianza y el catálogo de motivos obligatorio para la varianza negativa ya existen y ya funcionan. El caso nuevo se enchufa a una maquinaria probada en lugar de inaugurar una propia.

Las colisiones 2 y 3 se resuelven con el mismo criterio: la operación se acepta y su efecto imposible se registra como varianza atribuida al remanente, nunca se descarta en silencio.

## Consecuencias

- **Clave de idempotencia generada en el cliente, obligatoria.** Sin ella la colisión 4 duplica descuentos, y el reintento de sincronización es el comportamiento normal de una cola, no un caso raro. Afecta al contrato de todos los endpoints de escritura encolables.
- **El movimiento debe declarar cuándo ocurrió, no sólo cuándo se recibió.** Hace falta un campo de momento real, sellado por el dispositivo, distinto de `createdAt`. Sin él, FEFO y el cierre de turno ordenan por la hora de sincronización, que es falsa. Un dispositivo puede tener el reloj mal: el servidor debe acotar valores imposibles (futuros, o anteriores a la creación del remanente) en lugar de confiar a ciegas.
- **La varianza por sincronización diferida debe distinguirse de la varianza de conteo físico.** Ambas acaban en el mismo informe, pero tienen causas distintas y confundirlas haría ilegible el cierre de turno. El tipo o motivo concreto se define en la cascada de especificación.
- `currentQuantity` no queda nunca negativo: la decisión acota a cero y registra la diferencia, para no romper las invariantes de dominio que asumen cantidades no negativas.
- El operario debe poder ver qué operaciones suyas quedaron pendientes y cuáles se aplicaron con varianza. Una cola silenciosa traslada el problema del sistema a la memoria de la persona.
- Esta decisión aumenta el trabajo del cierre de turno: los descuadres que antes eran imposibles ahora son un resultado esperado y auditado. Es un coste aceptado a cambio de no perder registros reales.
