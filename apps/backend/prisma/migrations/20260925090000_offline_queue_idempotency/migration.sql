-- TK-159 / US-044 / ADR-009: la cola de operaciones sin conexion necesita dos cosas que
-- el ledger no tenia: una clave de idempotencia (reintentar una sincronizacion es
-- comportamiento normal de una cola, no un caso raro) y el momento real en que la
-- operacion ocurrio en cocina, distinto del momento en que el servidor la recibio.
--
-- Migracion puramente aditiva: las tres columnas admiten nulo o tienen valor por defecto,
-- asi que ninguna fila existente se invalida. En PostgreSQL un indice unico admite multiples
-- nulos, de modo que los movimientos historicos (operationId nulo) no colisionan entre si.

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "occurredAt" TIMESTAMP(3),
ADD COLUMN     "occurredAtAdjusted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "operationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_operationId_key" ON "StockMovement"("operationId");
