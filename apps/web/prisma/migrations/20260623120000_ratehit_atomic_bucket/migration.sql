-- RateHit: troca count+create (race) por upsert atômico em janela fixa.
-- Cada linha vira o CONTADOR de uma (key, bucketStart).
--
-- TRUNCATE intencional: linhas legadas (do esquema antigo de 1 linha por hit) não têm
-- como herdar bucketStart correto sem assumir uma windowSec que varia por caller. Como
-- RateHit é descartável (janela horária de rate-limit), zerar é aceitável — o pior caso
-- é alguns usuários conseguirem mais alguns SMS/tentativas nos próximos segundos.
--
-- IF NOT EXISTS: tolera estado parcial deixado por uma execução interrompida desta
-- mesma migration (CREATE UNIQUE INDEX falhou em produção; as colunas tinham passado).

TRUNCATE TABLE "RateHit";

ALTER TABLE "RateHit"
  ADD COLUMN IF NOT EXISTS "bucketStart" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "count" INTEGER NOT NULL DEFAULT 1;

-- Unicidade que torna o upsert atômico sob concorrência.
CREATE UNIQUE INDEX IF NOT EXISTS "RateHit_key_bucketStart_key"
  ON "RateHit"("key", "bucketStart");
