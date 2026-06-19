-- Retirada no local (default true) — par com shippable (envio).
ALTER TABLE "Listing" ADD COLUMN "pickup" BOOLEAN NOT NULL DEFAULT true;
