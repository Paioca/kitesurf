// Saúde do sistema — só admin (User.admin). Lê o que o app JÁ grava (JobRun + outbox
// NotificationDelivery) e mostra num relance: os processos automáticos rodaram? os avisos
// (WhatsApp/SMS) estão sendo entregues? Página só-leitura — nenhuma mutação, nenhum banco novo.
// (O botão "reenviar" das entregas falhas entra num 2º passo.)
import { notFound } from 'next/navigation';
import { getCurrentUser, getNavUser } from '../../lib/session';
import { db } from '../../lib/db';
import { color, font } from '../../lib/tokens';
import { SiteHeader } from '../../components/SiteHeader';
import { MobileAppBar } from '../../components/MobileChrome';
import { Footer } from '../../components/Footer';
import { FailedDeliveries } from '../../components/FailedDeliveries';

export const dynamic = 'force-dynamic';

// Jobs esperados + janela de tolerância (ms) desde o ÚLTIMO início. Espelha vercel.json:
//   drain-notifications */5min · close-unconfirmed 03:00 UTC · cleanup 04:00 UTC.
// Passou da janela sem rodar de novo = suspeito (verde vira âmbar).
const JOBS: { job: string; label: string; staleAfterMs: number }[] = [
  { job: 'drain-notifications', label: 'Envio de avisos', staleAfterMs: 15 * 60_000 }, // 3× o intervalo
  { job: 'close-unconfirmed', label: 'Fechar vendas não confirmadas', staleAfterMs: 26 * 3_600_000 },
  { job: 'cleanup', label: 'Limpeza diária', staleAfterMs: 26 * 3_600_000 },
];

const MINUTE = 60_000;

function ago(date: Date, now: Date): string {
  const min = Math.max(0, Math.round((now.getTime() - date.getTime()) / MINUTE));
  if (min < 1) return 'agora há pouco';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
}

// Telefone NUNCA aparece cru (LGPD): só os 4 últimos dígitos. "whatsapp:+5585..." → "•••1234".
function maskPhone(raw: unknown): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length < 4) return '•••••';
  return '•••• ' + digits.slice(-4);
}

type Health = 'ok' | 'warn' | 'down';
const DOT: Record<Health, string> = { ok: color.primary, warn: color.accent, down: color.heart };

function Dot({ state }: { state: Health }) {
  return <span aria-hidden="true" style={{ width: 11, height: 11, borderRadius: 999, background: DOT[state], flex: 'none', display: 'inline-block' }} />;
}

export default async function Saude() {
  const user = await getCurrentUser();
  const navMe = await getNavUser();
  if (!user || !user.admin) notFound();

  const now = new Date();

  // Último run de cada job (batch, sem N+1) + backlog/falhas do outbox.
  const [lastRuns, pendingCount, failedCount, failedRecent] = await Promise.all([
    Promise.all(JOBS.map((j) => db.jobRun.findFirst({ where: { job: j.job }, orderBy: { startedAt: 'desc' } }))),
    db.notificationDelivery.count({ where: { status: 'pending' } }),
    db.notificationDelivery.count({ where: { status: 'failed' } }),
    db.notificationDelivery.findMany({ where: { status: 'failed' }, orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);

  const jobs = JOBS.map((j, i) => {
    const run = lastRuns[i];
    let state: Health = 'ok';
    let detail: string;
    if (!run) {
      state = 'warn';
      detail = 'Nunca rodou (ou sem histórico).';
    } else if (run.status === 'error') {
      state = 'down';
      detail = `Falhou ${ago(run.startedAt, now)}${run.error ? ` — ${run.error}` : ''}`;
    } else if (run.status === 'running' && now.getTime() - run.startedAt.getTime() > j.staleAfterMs) {
      state = 'warn';
      detail = `Preso em execução desde ${ago(run.startedAt, now)}.`;
    } else if (now.getTime() - run.startedAt.getTime() > j.staleAfterMs) {
      state = 'warn';
      detail = `Não roda desde ${ago(run.startedAt, now)}.`;
    } else {
      detail = `Rodou ${ago(run.finishedAt ?? run.startedAt, now)} — tudo certo.`;
    }
    return { label: j.label, state, detail };
  });

  const failed = failedRecent.map((d) => ({
    id: d.id,
    channel: d.channel,
    kind: d.kind === 'new_request' ? 'Aviso de pedido novo' : d.kind === 'accept' ? 'Aviso de interesse liberado' : d.kind,
    to: maskPhone((d.body as Record<string, unknown>)?.To),
    lastError: d.lastError ?? '—',
    date: d.createdAt.toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' }),
  }));

  const label = { fontSize: 13.5, color: color.inkMute } as const;
  const card = { border: `1px solid ${color.lineCard}`, borderRadius: 14, background: color.surface, padding: '14px 16px' } as const;

  return (
    <>
      <div className="only-mobile"><MobileAppBar initialMe={navMe} /></div>
      <div className="only-desktop"><SiteHeader /></div>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '36px 24px 80px' }}>
        <h1 style={{ fontFamily: font.serif, fontSize: 30, fontWeight: 600, letterSpacing: '-0.4px', margin: '0 0 6px' }}>Saúde do sistema</h1>
        <p style={{ ...label, margin: '0 0 4px' }}>Os processos automáticos rodaram? Os avisos estão sendo entregues?</p>
        <p style={{ fontSize: 12.5, color: color.inkFaint, margin: '0 0 28px' }}>
          Só leitura · <a href="/moderacao" style={{ color: color.primary }}>ir para Moderação</a>
        </p>

        <h2 style={{ fontFamily: font.serif, fontSize: 21, fontWeight: 600, margin: '0 0 12px' }}>Processos automáticos</h2>
        <div style={{ display: 'grid', gap: 10, marginBottom: 36 }}>
          {jobs.map((j) => (
            <div key={j.label} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Dot state={j.state} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: color.ink }}>{j.label}</div>
                <div style={{ fontSize: 13, color: color.inkMute }}>{j.detail}</div>
              </div>
            </div>
          ))}
        </div>

        <h2 style={{ fontFamily: font.serif, fontSize: 21, fontWeight: 600, margin: '0 0 4px' }}>Avisos (WhatsApp / SMS)</h2>
        <p style={{ ...label, margin: '0 0 12px' }}>
          <strong style={{ color: color.ink }}>{pendingCount}</strong> na fila · <strong style={{ color: failedCount > 0 ? color.heart : color.ink }}>{failedCount}</strong> falharam de vez
        </p>

        {failed.length === 0 ? (
          <div style={{ ...card, fontSize: 14, color: color.inkMute }}>Nenhum aviso falho. 🎉</div>
        ) : (
          <>
            <FailedDeliveries items={failed} />
            {failedCount > failed.length && (
              <p style={{ fontSize: 12.5, color: color.inkFaint, margin: '10px 0 0' }}>Mostrando os {failed.length} mais recentes de {failedCount}.</p>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
