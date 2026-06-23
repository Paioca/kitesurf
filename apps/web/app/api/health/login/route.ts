import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Sonda do fluxo de LOGIN. Razão de existir: Twilio é hoje SPOF da autenticação
// (sem fallback de e-mail/senha). Uma queda da Twilio = lockout total — esta probe
// é o que um monitor externo (Better Stack / UptimeRobot / Pingdom) bate a cada
// minuto pra detectar e alertar antes do usuário reclamar.
//
// Componentes verificados:
//   - db:     SELECT 1 — Postgres responde?
//   - twilio: GET https://api.twilio.com/2010-04-01/Accounts/{SID}.json — credenciais
//             válidas e a API da Twilio respondendo? (HEAD não é suportada por todos
//             os endpoints REST da Twilio, então GET com timeout curto.)
//
// Resposta:
//   200 + { ok: true,  components: { db, twilio } }   → tudo verde
//   503 + { ok: false, components: { ... }, downs }   → algum componente caído
//
// Endpoint PÚBLICO (probe externo precisa bater sem auth). Não vaza segredo:
// devolve só status binário por componente, nunca credenciais ou detalhes.

const PROBE_TIMEOUT_MS = 5000;

type ComponentStatus = { ok: boolean; latencyMs: number; reason?: string };

async function checkDb(): Promise<ComponentStatus> {
  const t0 = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - t0 };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t0, reason: e instanceof Error ? e.name : 'unknown' };
  }
}

async function checkTwilio(): Promise<ComponentStatus> {
  const t0 = Date.now();
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    // Sem credenciais configuradas, a probe não pode afirmar "Twilio OK".
    // Devolve down explícito — login DEPENDE de Twilio, então isso é prod-broken.
    return { ok: false, latencyMs: 0, reason: 'not_configured' };
  }
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      method: 'GET',
      headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return res.ok
      ? { ok: true, latencyMs: Date.now() - t0 }
      : { ok: false, latencyMs: Date.now() - t0, reason: `status_${res.status}` };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t0, reason: e instanceof Error ? e.name : 'fetch_failed' };
  }
}

export async function GET() {
  // Roda os dois em paralelo: se um trava no timeout, o outro não espera.
  const [dbStatus, twilioStatus] = await Promise.all([checkDb(), checkTwilio()]);
  const components = { db: dbStatus, twilio: twilioStatus };
  const downs = Object.entries(components).filter(([, c]) => !c.ok).map(([k]) => k);
  const ok = downs.length === 0;
  const body = ok ? { ok, components } : { ok, components, downs };
  return NextResponse.json(body, {
    status: ok ? 200 : 503,
    // Probe externa não pode pegar resposta cacheada — força revalidação a cada hit.
    headers: { 'cache-control': 'no-store, must-revalidate' },
  });
}
