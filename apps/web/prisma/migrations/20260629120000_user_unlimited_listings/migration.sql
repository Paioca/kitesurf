-- Isenção INDIVIDUAL do teto de anúncios ativos. Default false: adicionar a coluna NÃO
-- libera ninguém; só um UPDATE explícito numa linha isenta aquele usuário.
ALTER TABLE "User" ADD COLUMN "unlimitedListings" BOOLEAN NOT NULL DEFAULT false;
