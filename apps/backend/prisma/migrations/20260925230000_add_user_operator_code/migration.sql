-- US-051 / TK-173: el operario entra con un código corto, no con la clave interna.
--
-- Relleno antes de imponer NOT NULL (US-051 Escenario 5): cada usuario preexistente
-- recibe su propio `id` como código, de modo que NINGUNA credencial en circulación
-- deja de funcionar tras la migración — `bootstrap-admin` incluido, que conserva
-- literalmente `bootstrap-admin` y mantiene válidas las credenciales publicadas para
-- la revisión. El relleno es idempotente y no puede colisionar: `id` ya es único.

-- 1. Columna nullable para poder rellenar las filas existentes.
ALTER TABLE "User" ADD COLUMN "operatorCode" TEXT;

-- 2. Relleno determinista de las filas preexistentes.
UPDATE "User" SET "operatorCode" = "id" WHERE "operatorCode" IS NULL;

-- 3. Ya sin nulos: la columna pasa a obligatoria.
ALTER TABLE "User" ALTER COLUMN "operatorCode" SET NOT NULL;

-- 4. La unicidad vive aquí (Guard 39), no en un findBy previo de la aplicación.
CREATE UNIQUE INDEX "User_operatorCode_key" ON "User"("operatorCode");
