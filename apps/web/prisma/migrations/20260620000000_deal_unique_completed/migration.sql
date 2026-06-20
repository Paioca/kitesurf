-- Trava de integridade: no máximo UM negócio "completed" por anúncio.
-- Cobre a corrida em que dois compradores confirmam a compra do mesmo listing.
-- Índice parcial (só linhas completed) — não impede múltiplos deals seller_confirmed
-- enquanto o vendedor ainda escolhe o comprador.
CREATE UNIQUE INDEX IF NOT EXISTS "Deal_listingId_completed_key"
  ON "Deal" ("listingId")
  WHERE "status" = 'completed';
