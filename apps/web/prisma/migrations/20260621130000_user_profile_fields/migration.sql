-- Perfil do usuário: sobrenome + cidade/estado (país já existe em User.country).
-- 100% ADITIVA e IDEMPOTENTE: colunas NULLABLE, sem default, sem backfill — legados
-- ficam null e o create atual segue válido. RLS já ligado; coluna nova não mexe em policy.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "state" TEXT;
