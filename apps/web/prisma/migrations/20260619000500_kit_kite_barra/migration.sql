-- AlterTable: kit (kite + barra no mesmo anúncio)
ALTER TABLE "Listing" ADD COLUMN "hasBarra" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN "kitePrice" INTEGER;
ALTER TABLE "Listing" ADD COLUMN "barraPrice" INTEGER;
ALTER TABLE "Listing" ADD COLUMN "barraAttributes" JSONB;

-- AlterTable: foto marcada por peça
ALTER TABLE "ListingImage" ADD COLUMN "component" TEXT;
