-- Cada grupo passa a ser uma rota: os parâmetros de custo movem-se de "Route" para "Group".

-- 1) Adiciona os parâmetros ao Group (defaults para as linhas existentes passarem).
ALTER TABLE "Group" ADD COLUMN "fuelPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Group" ADD COLUMN "totalKm" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Group" ADD COLUMN "consumptionPer100" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Group" ADD COLUMN "tolls" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Group" ADD COLUMN "avgPeople" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- 2) Backfill: cada grupo herda os parâmetros de uma das suas rotas (em geral só há uma).
UPDATE "Group" g SET
    "fuelPrice" = r."fuelPrice",
    "totalKm" = r."totalKm",
    "consumptionPer100" = r."consumptionPer100",
    "tolls" = r."tolls",
    "avgPeople" = r."avgPeople"
FROM (
    SELECT DISTINCT ON ("groupId") "groupId", "fuelPrice", "totalKm", "consumptionPer100", "tolls", "avgPeople"
    FROM "Route"
    ORDER BY "groupId", "id"
) r
WHERE r."groupId" = g."id";

-- 3) Trip deixa de referenciar Route.
ALTER TABLE "Trip" DROP CONSTRAINT "Trip_routeId_fkey";
ALTER TABLE "Trip" DROP COLUMN "routeId";

-- 4) Remove a tabela Route.
DROP TABLE "Route";
