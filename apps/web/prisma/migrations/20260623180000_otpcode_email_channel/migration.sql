-- OtpCode dual-channel: SMS (phone) ou e-mail. Mata o SPOF do Twilio na auth.
-- Migration zero-downtime: torna phone nullable + adiciona email nullable; CHECK
-- garante que exatamente UM dos dois esteja preenchido. Linhas legadas (todas com
-- phone preenchido + email NULL) passam no CHECK.

ALTER TABLE "OtpCode"
  ALTER COLUMN "phone" DROP NOT NULL,
  ADD COLUMN "email" TEXT;

-- Exatamente um dos canais por linha — invariante explícito no banco, não só no app.
ALTER TABLE "OtpCode"
  ADD CONSTRAINT "OtpCode_channel_xor"
  CHECK (("phone" IS NOT NULL) <> ("email" IS NOT NULL));

CREATE INDEX "OtpCode_email_context_idx" ON "OtpCode"("email", "context");
