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
// Policy' que enxerga no REQUEST, e o resolve-routes do Next COPIA todo header de RESPONSE
// do proxy de volta pro request (req.headers[k]=v). Ou seja, se o proxy setar um
// 'Content-Security-Policy' de RESPONSE, esse valor sobrescreve o override estrito e o
// nonce some. Por isso, na Fase 1, a CSP loose ENFORCED vem ESTÁTICA do next.config
// (não passa por esse merge) e o proxy NÃO seta Content-Security-Policy de response —
// só o override estrito de request (pro nonce) + o report-only estrito.
//
// Rollout (Fase 1 → Fase 2):
//   Fase 1 (CSP_ENFORCE_STRICT=false, atual): ENFORCED loose vem do next.config; o proxy
//     aplica o nonce via override de request e publica a estrita em Content-Security-Policy-
//     Report-Only (só prod). Como o nonce É aplicado, o report-only reporta ZERO violação —
//     sinal limpo de que dá pra apertar.
//   Fase 2 (flip): confirme zero violação em prod, REMOVA a CSP estática do next.config e
//     vire CSP_ENFORCE_STRICT=true. O proxy passa a setar Content-Security-Policy ENFORCED
//     por request (estrita em prod, loose em dev) e para o report-only.
//
// DEV fica SEMPRE na loose: o dev server (Turbopack) não aplica o atributo nonce nos seus
// <script> de HMR/bootstrap, então a estrita quebraria a hidratação local. Nonce estrita
// é assunto de prod.
const CSP_ENFORCE_STRICT = false;

function buildCsp(nonce: string, strict: boolean): string {
  // 'unsafe-eval' só em dev: o React Refresh/HMR do Next precisa de eval.
  const scriptSources = strict
    ? `'self' 'nonce-${nonce}' https://va.vercel-scripts.com`
    : `'self' 'unsafe-inline' https://va.vercel-scripts.com`;
  return [
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
  ].join('; ');
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
