import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

// Host EXATO do nosso Supabase (derivado do env; fallback = projeto de prod). Pinar o
// host fecha o vetor de DoS do Image Optimizer do Next 14.2.x: o wildcard `*.supabase.co`
// deixava qualquer projeto Supabase de terceiro rotear imagens gigantes pelo nosso
// optimizer. Espelha o que `isOfficialImageUrl` já exige no write (host + pathname).
const supabaseHost = (() => {
  try {
    return new URL(process.env.SUPABASE_URL).hostname;
  } catch {
    return 'oycxkofylcofvvditjeg.supabase.co';
  }
})();

// CSP pragmática pra Fase 0: bloqueia clickjacking, plugins e base/form hijack
// sem exigir nonce middleware. 'unsafe-eval' só em dev (HMR do Next precisa).
// img/connect liberam https: porque as imagens vêm do Supabase Storage (host varia
// por ambiente) — o aperto de origem da imagem é feito no write (allowlist de host).
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com${isProd ? '' : " 'unsafe-eval'"}`,
  "connect-src 'self' https:",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  ...(isProd
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
];

const nextConfig = {
  reactStrictMode: true,
  // Next 16: instrumentation.ts é estável e auto-detectada; o build não roda mais
  // ESLint (a chave `eslint` saiu do config) — lint é passo à parte.
  // TODO: migrar <a> internos para <Link> (regra no-html-link-for-pages).
  images: {
    minimumCacheTTL: 86400, // 1 dia: corta re-otimização repetida (mitiga DoS no optimizer)
    remotePatterns: [
      // storage oficial das fotos — host EXATO + caminho público (não mais `*.supabase.co`)
      { protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' },
      // TODO(3.4b): remover junto com a purga dos dados de teste (seed usa estes hosts).
      { protocol: 'https', hostname: 'i.pravatar.cc' }, // avatares de seed
      { protocol: 'https', hostname: 'fastly.picsum.photos' }, // imagens de seed
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

// Sentry envolve o config preservando headers/CSP. Upload de source maps só roda
// quando SENTRY_AUTH_TOKEN existe (CI/build) — sem ele, só pula com aviso.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Remove os logs de debug do SDK no bundle de produção (substitui disableLogger).
  webpack: { treeshake: { removeDebugLogging: true } },
  // Proxy same-origin pros eventos do Sentry — driblar ad blockers e bater com
  // o connect-src da CSP sem precisar liberar host externo.
  tunnelRoute: '/monitoring',
});
