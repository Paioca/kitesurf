-- negociacao-v2 — estados, campos, disputa e a trava de reserva.
--
-- ⚠️ PRÉ-CONDIÇÃO: rodar prisma/diag-negociacao-v2.mjs em STAGING e ter os gates
-- VERDES (zero seller_confirmed duplicados, zero conflito de kit, zero colisão de
-- telefone). O índice único parcial abaixo FALHA se houver duplicados.
-- Ver docs/negociacao-v2.md §6 e §16.

-- DealStatus: novos estados terminais/intermediários
ALTER TYPE "DealStatus" ADD VALUE IF NOT EXISTS 'closed_unconfirmed';
ALTER TYPE "DealStatus" ADD VALUE IF NOT EXISTS 'reversal_requested';
ALTER TYPE "DealStatus" ADD VALUE IF NOT EXISTS 'reversed';
ALTER TYPE "DealStatus" ADD VALUE IF NOT EXISTS 'disputed';

-- NotificationType: novos eventos do fluxo v2
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'sale_cancelled';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'sale_closed_unconfirmed';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'reversal_requested';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'reversal_confirmed';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'reversal_rejected';

-- Enums da disputa
CREATE TYPE "DisputeStatus" AS ENUM ('open', 'under_review', 'resolved_upheld', 'resolved_reversed', 'closed');
CREATE TYPE "DisputeReason" AS ENUM ('devolvido', 'engano', 'nao_aconteceu', 'outro');

-- Deal: datas do ciclo de venda/reversão
ALTER TABLE "Deal"
  ADD COLUMN "confirmationDeadlineAt" TIMESTAMP(3),
  ADD COLUMN "closedUnconfirmedAt" TIMESTAMP(3),
  ADD COLUMN "reversalRequestedAt" TIMESTAMP(3),
  ADD COLUMN "reversedAt" TIMESTAMP(3);

-- Índice pro cron das 72h (varre seller_confirmed com prazo vencido)
CREATE INDEX "Deal_status_confirmationDeadlineAt_idx" ON "Deal"("status", "confirmationDeadlineAt");

-- Índice único PARCIAL: no máximo 1 reserva pendente (seller_confirmed) por
-- (anúncio, componente). Segunda camada da trava — a 1ª é o lock de linha na app.
-- ⚠️ FALHA se já houver duplicados (ver diagnóstico do Passo 0).
CREATE UNIQUE INDEX "Deal_seller_confirmed_per_component"
  ON "Deal"("listingId", "component")
  WHERE "status" = 'seller_confirmed';

-- DealDispute — fila própria, separada de Report
CREATE TABLE "DealDispute" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "openedByUserId" TEXT NOT NULL,
    "counterpartyId" TEXT NOT NULL,
    "reason" "DisputeReason" NOT NULL,
    "description" TEXT,
    "status" "DisputeStatus" NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "resolvedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "DealDispute_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DealDispute_status_idx" ON "DealDispute"("status");
CREATE INDEX "DealDispute_dealId_idx" ON "DealDispute"("dealId");

ALTER TABLE "DealDispute" ADD CONSTRAINT "DealDispute_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealDispute" ADD CONSTRAINT "DealDispute_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DealDispute" ADD CONSTRAINT "DealDispute_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DealDispute" ADD CONSTRAINT "DealDispute_resolvedByAdminId_fkey" FOREIGN KEY ("resolvedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS: defesa em profundidade (igual às demais tabelas)
ALTER TABLE "DealDispute" ENABLE ROW LEVEL SECURITY;
