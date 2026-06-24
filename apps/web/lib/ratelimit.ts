import 'server-only';
import * as Sentry from '@sentry/nextjs';
import { db } from './db';
import { childLogger } from './logger';
import { kvEnabled, kvFixedWindowIncr } from './kv';

const log = childLogger('ratelimit');

// Rate limit de janela fixa. Retorna true se PERMITIDO; false se estourou o limite.
//
// Backend: REDIS (Vercel KV) quando configurado, senão Postgres (tabela RateHit). O KV
// tira do caminho quente o write síncrono no Postgres a cada mutação — crítico com
// connection_limit=1 por lambda em escala. Ambos são atômicos:
//   - KV  → INCR + EXPIRE NX (janela inteira expira junta; o Redis limpa a chave).
//   - DB  → upsert no par UNIQUE (key, bucketStart): inserts concorrentes colidem no
//           índice e o segundo cai no increment. Sem race. Fallback quando o KV some.
//
// failClosed (default false): se o BACKEND falhar, o que fazer?
//   - false → libera (fail-open). Usar em rotas não críticas onde bloquear usuário
//     legítimo durante incidente é pior que perder a proteção.
//   - true  → bloqueia (fail-closed). USAR EM TUDO QUE PROTEGE custo/abuso real:
//     OTP-send (Twilio cobra), recuperação/verify (brute-force de conta).
// Em qualquer caso a falha vai pro Sentry com tag `ratelimit_backend_failure`.
export async function rateLimit(
  key: string,
  max: number,
  windowSec: number,
  opts: { failClosed?: boolean } = {},
): Promise<boolean> {
  const keyPrefix = key.split(':').slice(0, 2).join(':');
  // 1) KV (Redis) quando configurado. Se o KV FALHAR, NÃO aplicamos a fail policy aqui:
  //    degradamos pro Postgres (limiter já provado). Um KV mal configurado/instável não
  //    pode bloquear OTP (fail-closed) nem abrir abuso — só cai no backend de reserva.
  if (kvEnabled) {
    try {
      // Janela fixa por chave; TTL = windowSec setado no primeiro hit (EXPIRE NX).
      const count = await kvFixedWindowIncr(`rl:${key}:${windowSec}`, windowSec);
      return count <= max;
    } catch (err) {
      Sentry.captureException(err, { tags: { component: 'ratelimit', event: 'kv_failure_fallback_db', key_prefix: keyPrefix } });
      log.warn({ event: 'kv_failure_fallback_db', keyPrefix, err }, 'KV rate-limit falhou — degradando pro Postgres');
      // segue pro backend Postgres abaixo
    }
  }
  // 2) Postgres: janela (bucketStart, bucketStart+windowSec] alinhada ao relógio.
  //    Backend default (sem KV) E rede de segurança quando o KV cai.
  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const bucketStart = Math.floor(nowSec / windowSec) * windowSec;
    const row = await db.rateHit.upsert({
      where: { key_bucketStart: { key, bucketStart } },
      create: { key, bucketStart, count: 1 },
      update: { count: { increment: 1 } },
      select: { count: true },
    });
    return row.count <= max;
  } catch (err) {
    // Os DOIS backends caíram. Não engolimos: Sentry + política da rota (fail-open/closed).
    Sentry.captureException(err, {
      tags: { component: 'ratelimit', event: 'backend_failure', key_prefix: keyPrefix, fail_mode: opts.failClosed ? 'closed' : 'open' },
    });
    log.error({ event: 'backend_failure', keyPrefix, failMode: opts.failClosed ? 'closed' : 'open', err }, 'rate limit backend failure');
    return !opts.failClosed;
  }
}

// IP do cliente atrás do proxy da Vercel.
//
// NUNCA confiar no x-forwarded-for[0]: esse é o valor mais à esquerda, controlado
// pelo cliente. Um atacante manda `X-Forwarded-For: <aleatório>` por request e cada
// chamada cai num bucket de rate-limit diferente, anulando todo limite por-IP
// (otp:reqip, otp:verify). A Vercel injeta o IP REAL em headers próprios que ela
// sobrescreve na borda (não spoofáveis): x-vercel-forwarded-for / x-real-ip.
// Só caímos no XFF como último recurso, e aí pegamos o ÚLTIMO hop (o appendado
// pela infra), não o primeiro.
export function clientIp(req: Request): string {
  const vercel = req.headers.get('x-vercel-forwarded-for');
  if (vercel) return vercel.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const hops = xff.split(',');
    return hops[hops.length - 1].trim(); // hop mais à direita = injetado pelo proxy
  }
  return 'unknown';
}

export const tooMany = () =>
  new Response(JSON.stringify({ message: 'Muitas tentativas. Tente de novo daqui a pouco.' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json' },
  });
