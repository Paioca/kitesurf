-- Kit barra gets its own controlled brand/model references.
ALTER TABLE "Listing" ADD COLUMN "barraBrandId" TEXT;
ALTER TABLE "Listing" ADD COLUMN "barraModelId" TEXT;

CREATE INDEX "Listing_barraBrandId_idx" ON "Listing"("barraBrandId");
CREATE INDEX "Listing_barraModelId_idx" ON "Listing"("barraModelId");

ALTER TABLE "Listing" ADD CONSTRAINT "Listing_barraBrandId_fkey" FOREIGN KEY ("barraBrandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_barraModelId_fkey" FOREIGN KEY ("barraModelId") REFERENCES "Model"("id") ON DELETE SET NULL ON UPDATE CASCADE;
