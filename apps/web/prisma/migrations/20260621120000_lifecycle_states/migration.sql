-- Formaliza estados do ciclo de negociação + notificação in-app.
-- 100% ADITIVA e IDEMPOTENTE: novos valores de enum + tabela nova; nenhum backfill,
-- nenhum dado existente muda. Os valores novos NÃO são usados neste arquivo (evita o
-- "unsafe use of new enum value" do Postgres dentro da mesma transação).

-- RequestStatus: + withdrawn / listing_removed / sold_elsewhere / expired
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'withdrawn';
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'listing_removed';
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'sold_elsewhere';
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'expired';

-- DealStatus: + voided
ALTER TYPE "DealStatus" ADD VALUE IF NOT EXISTS 'voided';

-- NotificationType
DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM (
    'request_new', 'request_accepted', 'request_declined', 'sale_marked',
    'purchase_confirmed', 'purchase_denied', 'sold_elsewhere', 'listing_removed'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Notification (in-app). FK só pro destinatário (refs de listing/request/deal são
-- soft, TEXT — sobrevivem à remoção do alvo pra não derrubar o histórico).
CREATE TABLE IF NOT EXISTS "Notification" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "type"      "NotificationType" NOT NULL,
  "listingId" TEXT,
  "requestId" TEXT,
  "dealId"    TEXT,
  "actorId"   TEXT,
  "data"      JSONB,
  "readAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx"    ON "Notification" ("userId", "readAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification" ("userId", "createdAt");

-- Defesa em profundidade (mesmo padrão das demais tabelas): app acessa via owner
-- (ignora RLS); sem políticas, anon/authenticated ficam bloqueados.
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
