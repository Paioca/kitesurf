-- Defesa em profundidade: habilita Row Level Security em todas as tabelas.
-- O app acessa via service role / owner (postgres), que IGNORAM RLS — então
-- nada quebra. Sem políticas, os papéis anon/authenticated do Supabase ficam
-- totalmente bloqueados (caso a anon key vaze, não há leitura de dados).
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OtpCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Brand" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Model" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Listing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ListingImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Deal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RateHit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;
