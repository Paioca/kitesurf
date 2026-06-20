-- Índices de alto valor pras queries quentes do Listing.
-- userId: perfil, "meus anúncios", checagem de dono (não tinha índice).
-- (status, deletedAt): filtro base de TODA busca (active + não-excluído); substitui
-- o índice só de status.
CREATE INDEX IF NOT EXISTS "Listing_userId_idx" ON "Listing" ("userId");
CREATE INDEX IF NOT EXISTS "Listing_status_deletedAt_idx" ON "Listing" ("status", "deletedAt");
DROP INDEX IF EXISTS "Listing_status_idx";
