import 'server-only';

// Cliente mínimo do Upstash Redis via REST (sem SDK/dependência nova — só fetch).
// Lê as env do Vercel KV (KV_REST_API_URL / KV_REST_API_TOKEN). Quando AUSENTES,
// kvEnabled = false e quem chama cai no backend antigo (Postgres) — zero mudança de
// comportamento até o KV estar provisionado. Liga sozinho quando a env aparece.
const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

export const kvEnabled = !!(KV_URL && KV_TOKEN);

// Executa um pipeline de comandos Redis via REST. Lança em erro de rede/HTTP/comando
// (o caller decide fail-open/closed). Timeout curto: o rate-limit não pode pendurar a
// request se o KV travar.
async function pipeline(commands: (string | number)[][], timeoutMs = 1500): Promise<unknown[]> {
  const res = await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`KV pipeline HTTP ${res.status}`);
  const data = (await res.json()) as Array<{ result?: unknown; error?: string }>;
  return data.map((d) => {
    if (d.error) throw new Error(`KV cmd error: ${d.error}`);
    return d.result;
  });
}

// Rate-limit de JANELA FIXA atômico: INCR no contador da chave + EXPIRE só no primeiro
// hit (NX), pra a janela inteira expirar junta e o Redis limpar a chave sozinho (sem
// cron de limpeza, diferente da tabela RateHit). Retorna o count após o incremento.
export async function kvFixedWindowIncr(key: string, windowSec: number): Promise<number> {
  const [count] = await pipeline([['INCR', key], ['EXPIRE', key, windowSec, 'NX']]);
  return Number(count);
}
