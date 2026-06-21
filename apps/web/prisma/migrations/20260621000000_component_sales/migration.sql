-- Venda por componente (kit): kite/barra avulsos podem vender separados do conjunto.
-- 100% aditiva: DEFAULT 'conjunto' faz todo o histórico (sempre "anúncio inteiro")
-- ficar correto sem backfill. Escrita IDEMPOTENTE (recupera aplicação parcial).

DO $$ BEGIN
  CREATE TYPE "Component" AS ENUM ('conjunto', 'kite', 'barra');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Listing"
  ADD COLUMN IF NOT EXISTS "kiteSoldAt"        TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "kiteSoldToUserId"  TEXT,
  ADD COLUMN IF NOT EXISTS "barraSoldAt"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "barraSoldToUserId" TEXT;

ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "component" "Component" NOT NULL DEFAULT 'conjunto';
-- o @@unique do Prisma é um índice único (não constraint).
DROP INDEX IF EXISTS "Request_listingId_buyerId_type_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Request_listingId_buyerId_type_component_key"
  ON "Request" ("listingId", "buyerId", "type", "component");

ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "component" "Component" NOT NULL DEFAULT 'conjunto';
DROP INDEX IF EXISTS "Deal_listingId_completed_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Deal_listing_component_completed_key"
  ON "Deal" ("listingId", "component") WHERE "status" = 'completed';

CREATE INDEX IF NOT EXISTS "Listing_kiteSoldAt_idx"  ON "Listing" ("kiteSoldAt");
CREATE INDEX IF NOT EXISTS "Listing_barraSoldAt_idx" ON "Listing" ("barraSoldAt");
