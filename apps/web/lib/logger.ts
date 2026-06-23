import 'server-only';
import pino from 'pino';

// Logger estruturado JSON único pra todo o runtime de servidor.
//
// Por que Pino (e não Winston): menor overhead, JSON nativo sem transformação extra,
// redaction embutida com paths declarativos, formato pronto pra ingestão por Vercel
// Log Drain → Better Stack Telemetry.
//
// Em dev/test (NODE_ENV !== 'production') o nível padrão é 'debug' pra ver tudo
// localmente; em prod 'info'. Override com LOG_LEVEL.
//
// `base` injeta service/env/release em TODA entrada — assim toda linha no Log Drain
// pode ser filtrada por service:'kitetropos', env:'production' (vs preview), release.
const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
  base: {
    service: 'kitetropos',
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'local',
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  },
  // Redaction declarativa: estes paths viram [REDACTED] ANTES de qualquer transporte.
  // Defesa em profundidade junto com o Sentry beforeSend — se um campo sensível
  // escapou pro log object, o Pino corta antes de virar JSON serializado.
  redact: {
    paths: [
      // headers de auth e cookies que NUNCA devem virar log
      'req.headers.authorization',
      'req.headers.cookie',
      'headers.authorization',
      'headers.cookie',
      // credenciais e tokens em qualquer nível
      '*.token',
      '*.otp',
      '*.code',
      '*.password',
      '*.apiKey',
      '*.api_key',
      '*.secret',
      '*.jwt',
      // PII regulado (LGPD)
      '*.cpf',
      '*.payoutAccountId',
      // tokens em payloads aninhados
      'body.token',
      'body.code',
      'body.otp',
      'body.password',
    ],
    censor: '[REDACTED]',
  },
  // Format ISO em vez de epoch — Better Stack indexa melhor, e dev fica legível.
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Loggers filhos com contexto pré-carregado. Use por componente:
//   const log = childLogger('otp');
//   log.warn({ phone: hash(phone) }, 'invalid attempt')
export function childLogger(component: string, extra: Record<string, unknown> = {}) {
  return logger.child({ component, ...extra });
}
