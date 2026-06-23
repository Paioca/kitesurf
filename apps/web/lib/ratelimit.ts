import 'server-only';
import * as Sentry from '@sentry/nextjs';
import { db } from './db';

// Rate limit de janela fixa via banco (sem infra extra). Para a escala de 1 hub.
// Retorna true se PERMITIDO; false se estourou o limite.
//
// Atomicidade: a janela é (bucketStart, bucketStart+windowSec], bucketStart é o
// floor da hora atual em segundos pelo windowSec. O par (key, bucketStart) é UNIQUE,
// então o upsert serializa requests concorrentes: dois inserts disputando a mesma
// linha colidem no índice e o segundo cai no `update { count: increment }`. Sem race.
//
// failClosed (default false): se o BANCO falhar, o que fazer?
//   - false → libera (fail-open). Usar em rotas não críticas onde bloquear usuário
//     legítimo durante incidente de DB é pior que perder a proteção.
//   - true  → bloqueia (fail-closed). USAR EM TUDO QUE PROTEGE custo/abuso real:
//     OTP-send (Twilio cobra), recuperação/verify (brute-force de conta).
// Em qualquer caso a falha vai pro Sentry com tag `ratelimit_backend_failure`.
export async function rateLimit(
  key: string,
  max: number,
  windowSec: number,
  opts: { failClosed?: boolean } = {},
): Promise<boolean> {
  const nowSec = Math.floor(Date.now() / 1000);
  const bucketStart = Math.floor(nowSec / windowSec) * windowSec;
  try {
    // Upsert atômico: cria a linha do bucket com count=1, ou incrementa se já existir.
    // Confiar no INDEX UNIQUE para serializar; sob alta concorrência o segundo writer
    // cai no UPDATE e ninguém escapa.
    const row = await db.rateHit.upsert({
      where: { key_bucketStart: { key, bucketStart } },
      create: { key, bucketStart, count: 1 },
      update: { count: { increment: 1 } },
      select: { count: true },
    });
    return row.count <= max;
  } catch (err) {
    // O backend do rate limiter caiu. Não engolimos: emitimos pro Sentry e decidimos
    // por política da rota se libera (fail-open) ou bloqueia (fail-closed).
    const keyPrefix = key.split(':').slice(0, 2).join(':');
    Sentry.captureException(err, {
      tags: { component: 'ratelimit', event: 'backend_failure', key_prefix: keyPrefix, fail_mode: opts.failClosed ? 'closed' : 'open' },
    });
    // eslint-disable-next-line no-console
    console.error('[ratelimit] backend_failure', { keyPrefix, failMode: opts.failClosed ? 'closed' : 'open' });
    return !opts.failClosed;
  }
}

// IP do cliente atrás do proxy da Vercel.
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  return (xff?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown').trim();
}

export const tooMany = () =>
  new Response(JSON.stringify({ message: 'Muitas tentativas. Tente de novo daqui a pouco.' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json' },
  });
