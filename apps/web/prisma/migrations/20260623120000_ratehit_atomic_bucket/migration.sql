-- RateHit: troca count+create (race) por upsert atômico em janela fixa.
-- Cada linha vira o CONTADOR de uma (key, bucketStart). Linhas antigas migram com
-- bucketStart=0/count=1 (semântica antiga preservada até a janela expirar).

ALTER TABLE "RateHit"
  ADD COLUMN "bucketStart" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "count" INTEGER NOT NULL DEFAULT 1;

-- Unicidade que torna o upsert atômico sob concorrência.
CREATE UNIQUE INDEX "RateHit_key_bucketStart_key" ON "RateHit"("key", "bucketStart");
