-- Spot de interesse do usuário (lista controlada SPOTS). Substitui city/state como
-- campo coletado — city/state ficam vestigiais (nullable) e podem ser podados depois.
-- ADITIVA e IDEMPOTENTE: coluna nullable, sem default, sem backfill.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "spot" TEXT;
