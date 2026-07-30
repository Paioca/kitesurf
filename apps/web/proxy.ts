import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware único: injeta correlation ID em TODA request (entrada + saída).
//
// Por que existir: hoje não há como amarrar um log do otp.ts a um log do ratelimit
// dispararam pela mesma requisição. Com o correlationId propagado, todo logger.child
// pode carregar esse id e o Log Drain (Better Stack Telemetry) consegue reconstruir
// a linha do tempo da request inteira filtrando por uma string.
//
// Contrato:
//   1. Se o cliente mandou x-correlation-id e ele é "razoável" (UUID/hex/16-64 chars),
//      a gente reusa — permite tracing cross-service quando chamamos /api de outro lado.
//   2. Senão, gera um randomUUID().
//   3. Sempre devolve no response (clientes podem logar e mostrar pro suporte).
//   4. Route handlers acessam via `headers().get('x-correlation-id')` (chega
//      via Next.js request headers — já vem populado pelo middleware).

const VALID_ID = /^[A-Za-z0-9_-]{16,64}$/;

// Em prod, HMR/eval do Next não rodam — 'unsafe-eval' fica fora do script-src.
const isProd = process.env.NODE_ENV === 'production';

// Endpoint de violação de CSP (opcional). Setar com a URL de "Security Header" do Sentry
// (formato: https://oXXX.ingest.sentry.io/api/<project>/security/?sentry_key=<key>). Quando
// presente, a CSP estrita ganha report-uri/report-to e o proxy publica Reporting-Endpoints —
// assim o Content-Security-Policy-Report-Only da Fase 1 vira telemetria real antes do flip.
const CSP_REPORT_URI = process.env.CSP_REPORT_URI;

// --- CSP por request com nonce ----------------------------------------------
// O script-src migra de 'unsafe-inline' (que neutraliza a CSP como backstop de XSS)
// pra um nonce por request. Mecânica:
//   1. Geramos o nonce aqui (o proxy roda em toda página).
//   2. Setamos a política ESTRITA no header de REQUEST 'Content-Security-Policy':
//      o Next lê esse header, extrai o nonce e injeta o atributo `nonce` nos SEUS
//      próprios <script> de bootstrap/hidratação (o App Router faz streaming deles —
//      sem nonce, remover 'unsafe-inline' quebraria a hidratação).
//   3. Expomos o nonce em 'x-nonce' pra qualquer <script> inline manual futuro
//      conseguir lê-lo no layout via headers() (hoje não há nenhum).
// Os scripts da Vercel (Analytics/Speed Insights) são EXTERNOS (<script src>) e caem
// no 'self' (/_vercel/...) ou em https://va.vercel-scripts.com — cobertos por host,
// não precisam de nonce. style-src segue com 'unsafe-inline' (fora de escopo aqui).
//
// IMPORTANTE — de onde o Next tira o nonce: ele lê o nonce do header 'Content-Security-
// Policy' que enxerga no REQUEST. Na Vercel, a plataforma injeta nesse request a CSP que vai
// no RESPONSE (seja do next.config estático, seja deste proxy). Logo, a CSP ENFORCED precisa
// SER a estrita (com nonce) — qualquer CSP loose enforced faz o render ler "sem nonce" e não
// carimbar nada (testado: report-only com loose enforced nunca dá sinal limpo na Vercel).
// Por isso a CSP loose foi REMOVIDA do next.config e aqui setamos a estrita como enforced.
//
// CSP_ENFORCE_STRICT:
//   true (atual, Fase 2): Content-Security-Policy ENFORCED por request — estrita (nonce, sem
//     'unsafe-inline') em prod, loose em dev. É o estado final.
//   false: NÃO seta Content-Security-Policy de response (deixa pra uma CSP estática externa)
//     e publica a estrita só em Content-Security-Policy-Report-Only (prod). Mantido como
//     escape hatch — porém NÃO produz sinal limpo na Vercel (ver acima); só serve com a CSP
//     enforced vindo de fora num ambiente que não faça esse merge.
//
// DEV fica na loose: o dev server (Turbopack) não aplica o atributo nonce nos seus <script>
// de HMR/bootstrap, então a estrita quebraria a hidratação local. Nonce estrita é só prod.
const CSP_ENFORCE_STRICT = true;

function buildCsp(nonce: string, strict: boolean): string {
  // 'unsafe-eval' só em dev: o React Refresh/HMR do Next precisa de eval.
  // www.googletagmanager.com: host do GTM (gtm.js) e das tags Google que o container carrega
  // (gtag/js do GA4 etc.). O bootstrap inline do GTM leva o nonce (x-nonce) e injeta o gtm.js
  // deste host. Beacons de coleta (google-analytics.com / *.analytics.google.com) já passam no
  // connect-src/img-src 'https:'. Tags de terceiros adicionadas DENTRO do GTM (Meta, LinkedIn,
  // Custom HTML...) têm host próprio e precisarão ser liberadas aqui caso a CSP as bloqueie.
  // connect.facebook.net: host do fbevents.js (Meta Pixel), inserido direto no código (fora do
  // GTM) via components/MetaPixel.tsx — o script inline leva o nonce.
  const scriptSources = strict
    ? `'self' 'nonce-${nonce}' https://va.vercel-scripts.com https://www.googletagmanager.com https://connect.facebook.net`
    : `'self' 'unsafe-inline' https://va.vercel-scripts.com https://www.googletagmanager.com https://connect.facebook.net`;
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `script-src ${scriptSources}${isProd ? '' : " 'unsafe-eval'"}`,
    "connect-src 'self' https:",
    // frame-src: o <noscript> do GTM embute um iframe de googletagmanager.com/ns.html. Sem
    // esta linha ele cairia no default-src 'self' e seria bloqueado (só afeta usuários sem JS).
    "frame-src 'self' https://www.googletagmanager.com",
  ];
  // Reporting opcional (só com CSP_REPORT_URI): report-uri (legado, suporte amplo) +
  // report-to (moderno, declarado no header Reporting-Endpoints). Cobre browser novo e antigo.
  if (CSP_REPORT_URI) {
    directives.push(`report-uri ${CSP_REPORT_URI}`, 'report-to csp-endpoint');
  }
  return directives.join('; ');
}

// Métodos que mudam estado. CSRF só importa nestes — GET/HEAD são (ou deviam ser)
// idempotentes e o cookie de sessão é sameSite=lax.
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// CSRF defense-in-depth: além do cookie sameSite=lax (lib/session.ts), exige que toda
// request que MUDA ESTADO numa rota /api venha da MESMA ORIGEM. O navegador sempre manda
// `Origin` em POST/PUT/PATCH/DELETE (mesmo same-origin), então um POST forjado de outro
// site chega com Origin de terceiro e é barrado aqui — fechando a janela residual do
// "Lax-plus-POST" do Chrome e cobrindo qualquer rota mutante futura num único ponto.
//
// Política deliberadamente leniente em UM caso: se NÃO houver Origin nem Referer, deixa
// passar (não quebra clientes legítimos sem esses headers) — o sameSite=lax ainda cobre.
// O vetor real de CSRF via navegador SEMPRE carrega Origin, então é pego mesmo assim.
// Cron/manutenção usam GET + Bearer CRON_SECRET, não cookie, então não passam por aqui.
function csrfOriginViolation(req: NextRequest): boolean {
  if (!MUTATING.has(req.method)) return false;
  if (!req.nextUrl.pathname.startsWith('/api/')) return false;
  const source = req.headers.get('origin') ?? req.headers.get('referer');
  if (!source) return false; // sem sinal de origem: confia no sameSite=lax
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    return !host || new URL(source).host !== host;
  } catch {
    return true; // Origin/Referer malformado: trata como suspeito
  }
}

export function proxy(req: NextRequest) {
  const incoming = req.headers.get('x-correlation-id');
  const id = incoming && VALID_ID.test(incoming) ? incoming : crypto.randomUUID();

  // Barra CSRF cross-origin antes de qualquer trabalho de rota.
  if (csrfOriginViolation(req)) {
    return NextResponse.json(
      { message: 'Origem inválida.' },
      { status: 403, headers: { 'x-correlation-id': id } },
    );
  }

  const nonce = crypto.randomUUID().replace(/-/g, '');
  const strictCsp = buildCsp(nonce, true);

  // Propaga pra entrada: route handlers leem com headers().get('x-correlation-id').
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-correlation-id', id);
  // O Next lê o nonce DESTE header de request e o aplica nos seus <script> inline.
  requestHeaders.set('Content-Security-Policy', strictCsp);
  // Exposto pro layout (headers().get('x-nonce')) caso surja <script> inline manual.
  requestHeaders.set('x-nonce', nonce);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  // Devolve pra saída: cliente vê e pode reportar em ticket de suporte.
  res.headers.set('x-correlation-id', id);

  // Declara o grupo 'csp-endpoint' usado pelo report-to da CSP (quando há endpoint).
  if (CSP_REPORT_URI) {
    res.headers.set('Reporting-Endpoints', `csp-endpoint="${CSP_REPORT_URI}"`);
  }

  if (CSP_ENFORCE_STRICT) {
    // Fase 2 (flip): CSP ENFORCED por request — estrita em prod, loose em dev. Setar aqui
    // exige ter REMOVIDO a CSP estática do next.config (senão dois Content-Security-Policy).
    res.headers.set('Content-Security-Policy', buildCsp(nonce, isProd));
  } else if (isProd) {
    // Fase 1 (de-risco): NÃO setamos Content-Security-Policy aqui de propósito — a loose
    // ENFORCED vem estática do next.config (ver bloco acima sobre o clobber). Só o report-
    // only estrito; com o nonce já aplicado via override de request, ele reporta zero.
    res.headers.set('Content-Security-Policy-Report-Only', strictCsp);
  }
  return res;
}

// Roda em todas as rotas — incluindo assets. Custo é desprezível (uma alocação +
// crypto.randomUUID). Excluímos só o que o Next já filtra automaticamente.
export const config = {
  matcher: [
    // Tudo, EXCETO assets estáticos e _next internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
