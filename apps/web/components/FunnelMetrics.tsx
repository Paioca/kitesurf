// Funil do beta — seção só-leitura da página /saude (admin). Lê direto do banco via
// Prisma (count/groupBy + uma raw pro percentil), sem cache novo. Janelas fixas de 7 e
// 30 dias por data de criação. São os números que decidem a direção do beta nos dias
// 30-45: vitrine, pedidos por estado, taxa de aceite, vendas, tempo de resposta do vendedor.
//
// LIMITAÇÃO (consciente): não existe timestamp dedicado de "decisão do vendedor" no
// Request; o tempo de resposta usa (updatedAt - createdAt) dos pedidos accepted/declined
// como proxy — para os accepted/declined o updatedAt reflete a decisão. Ler como aproximação.
import { db } from '../lib/db';
import { color, font } from '../lib/tokens';

const DAY = 86_400_000;

// Rótulos PT dos estados (literais do schema — RequestStatus / DealStatus).
const REQ_LABEL: Record<string, string> = {
  pending: 'pendente', accepted: 'aceito', declined: 'recusado', withdrawn: 'retirado',
  listing_removed: 'anúncio removido', sold_elsewhere: 'vendido p/ outro', expired: 'expirado',
};
const DEAL_LABEL: Record<string, string> = {
  seller_confirmed: 'aguardando confirmação', completed: 'concluída', cancelled: 'cancelada',
  voided: 'anulada', closed_unconfirmed: 'fechada s/ confirmar', reversal_requested: 'correção pedida',
  reversed: 'revertida', disputed: 'em disputa',
};

async function windowMetrics(since: Date) {
  const [newListings, reqGroups, dealGroups, medianRows] = await Promise.all([
    db.listing.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
    db.request.groupBy({ by: ['status'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    db.deal.groupBy({ by: ['status'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    db.$queryRaw<{ median_seconds: number | null }[]>`
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("updatedAt" - "createdAt"))) AS median_seconds
      FROM "Request"
      WHERE status IN ('accepted', 'declined') AND "createdAt" >= ${since}
    `,
  ]);

  const req: Record<string, number> = {};
  for (const g of reqGroups) req[g.status] = g._count._all;
  const deal: Record<string, number> = {};
  for (const g of dealGroups) deal[g.status] = g._count._all;

  const reqTotal = Object.values(req).reduce((a, b) => a + b, 0);
  const dealTotal = Object.values(deal).reduce((a, b) => a + b, 0);
  const accepted = req.accepted ?? 0;
  const declined = req.declined ?? 0;
  const aceite = accepted + declined > 0 ? Math.round((accepted / (accepted + declined)) * 100) : null;
  const medSec = medianRows[0]?.median_seconds != null ? Number(medianRows[0].median_seconds) : null;

  return { newListings, req, reqTotal, deal, dealTotal, aceite, medSec };
}

function byStatusText(counts: Record<string, number>, labels: Record<string, string>): string {
  const parts = Object.entries(counts).filter(([, n]) => n > 0).map(([k, n]) => `${labels[k] ?? k}: ${n}`);
  return parts.length ? parts.join(' · ') : '—';
}

function fmtDuration(sec: number | null): string {
  if (sec == null) return '—';
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  const h = sec / 3600;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} d`;
}

type Metrics = Awaited<ReturnType<typeof windowMetrics>>;

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ padding: '10px 0', borderTop: `1px solid ${color.lineCard}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <span style={{ fontSize: 13.5, color: color.inkMute }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: color.ink, textAlign: 'right' }}>{value}</span>
      </div>
      {sub && <div style={{ fontSize: 12.5, color: color.inkFaint, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function WindowCard({ title, m }: { title: string; m: Metrics }) {
  const card = { border: `1px solid ${color.lineCard}`, borderRadius: 14, background: color.surface, padding: '14px 16px', flex: '1 1 240px', minWidth: 0 } as const;
  return (
    <div style={card}>
      <div style={{ fontSize: 15, fontWeight: 600, color: color.ink, marginBottom: 2 }}>{title}</div>
      <Row label="Novos anúncios" value={String(m.newListings)} />
      <Row label="Pedidos criados" value={String(m.reqTotal)} sub={byStatusText(m.req, REQ_LABEL)} />
      <Row label="Taxa de aceite" value={m.aceite == null ? '—' : `${m.aceite}%`} sub="aceito ÷ (aceito + recusado)" />
      <Row label="Resposta do vendedor (mediana)" value={fmtDuration(m.medSec)} />
      <Row label="Vendas (deals)" value={String(m.dealTotal)} sub={byStatusText(m.deal, DEAL_LABEL)} />
    </div>
  );
}

export async function FunnelMetrics() {
  const now = Date.now();
  const [activeListings, w7, w30] = await Promise.all([
    db.listing.count({ where: { status: 'active', deletedAt: null } }),
    windowMetrics(new Date(now - 7 * DAY)),
    windowMetrics(new Date(now - 30 * DAY)),
  ]);

  const headline = { border: `1px solid ${color.lineCard}`, borderRadius: 14, background: color.surface, padding: '14px 16px', marginBottom: 12 } as const;

  return (
    <>
      <h2 style={{ fontFamily: font.serif, fontSize: 21, fontWeight: 600, margin: '0 0 4px' }}>Funil do beta</h2>
      <p style={{ fontSize: 13.5, color: color.inkMute, margin: '0 0 4px' }}>Janelas de 7 e 30 dias, por data de criação.</p>
      <p style={{ fontSize: 12.5, color: color.inkFaint, margin: '0 0 14px' }}>
        Tempo de resposta = mediana de <code>updatedAt − createdAt</code> dos pedidos aceitos/recusados (proxy da decisão do vendedor, não há timestamp dedicado). Ler como aproximação.
      </p>

      <div style={headline}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
          <span style={{ fontSize: 14.5, color: color.inkMute }}>Anúncios ativos agora</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: color.ink }}>{activeListings}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <WindowCard title="Últimos 7 dias" m={w7} />
        <WindowCard title="Últimos 30 dias" m={w30} />
      </div>
    </>
  );
}
