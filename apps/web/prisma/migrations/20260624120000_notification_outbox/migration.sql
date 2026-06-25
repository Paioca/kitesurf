-- NotificationDelivery: outbox de entrega externa (Twilio SMS/WhatsApp).
-- Estratégia inline-first: o request tenta enviar inline; só quando falha grava uma
-- linha `pending` aqui, e o cron drain-notifications reenvia com backoff. Mata a perda
-- silenciosa do fail-open antigo sem rotear o caminho feliz por uma fila.
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE "NotificationDelivery" (
  "id"            TEXT NOT NULL,
  "channel"       TEXT NOT NULL,
  "kind"          TEXT NOT NULL,
  "body"          JSONB NOT NULL,
  "status"        "DeliveryStatus" NOT NULL DEFAULT 'pending',
  "attempts"      INTEGER NOT NULL DEFAULT 0,
  "lastError"     TEXT,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt"        TIMESTAMP(3),
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- O drain varre pending vencidos (status, nextAttemptAt).
CREATE INDEX "NotificationDelivery_status_nextAttemptAt_idx"
  ON "NotificationDelivery"("status", "nextAttemptAt");

-- Defesa em profundidade (mesma postura do enable_rls): RLS ligado, sem políticas →
-- anon/authenticated do Supabase ficam bloqueados. O app acessa via service role /
-- owner (postgres), que IGNORA RLS — nada quebra.
ALTER TABLE "NotificationDelivery" ENABLE ROW LEVEL SECURITY;
