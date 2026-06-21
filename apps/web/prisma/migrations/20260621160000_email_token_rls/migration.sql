-- Alinha EmailToken à postura de defesa em profundidade do enable_rls:
-- RLS ligado, sem políticas -> anon/authenticated do Supabase ficam bloqueados.
-- O app acessa via service role / owner (postgres), que IGNORAM RLS — nada quebra.
ALTER TABLE "EmailToken" ENABLE ROW LEVEL SECURITY;
