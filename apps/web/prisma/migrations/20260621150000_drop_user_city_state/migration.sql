-- Limpeza: remove as colunas VESTIGIAIS city/state do User (substituídas por spot).
-- DESTRUTIVA mas de baixo risco: colunas adicionadas no mesmo dia, sem dado real
-- (só 1 conta de teste). ORDEM: aplicar SÓ DEPOIS que o código sem referência a
-- city/state já estiver no ar (o client Prisma antigo lista essas colunas no SELECT).
ALTER TABLE "User" DROP COLUMN IF EXISTS "city";
ALTER TABLE "User" DROP COLUMN IF EXISTS "state";
