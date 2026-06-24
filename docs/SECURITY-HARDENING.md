# Endurecimento de segurança — auditoria + correções

**Data:** 2026-06-23
**Escopo:** apps/web (Next.js 16 App Router + Prisma + Supabase)
**Método:** auditoria adversarial em 10 dimensões de ataque (SQLi, XSS, CSP/headers,
CSRF, validação de input, controle de acesso/IDOR, auth/sessão/JWT, uploads,
rate-limit/abuso, vazamento de segredos). Cada achado foi **verificado de forma
independente** (re-lendo o código real) pra descartar falso-positivo antes de virar fix.

> Verdade-terreno do código vence este doc. Se divergir, o código está certo.

---

## Postura de base (já estava boa — NÃO mexer achando que é buraco)

- **SQL injection:** inexistente. Prisma em todo lugar; os poucos `$queryRaw` usam
  tagged-template (parametrizado), nunca concatenação. `$queryRawUnsafe` só num CLI de
  ops com SQL estático e constantes.
- **XSS:** zero `dangerouslySetInnerHTML`/`innerHTML`/`eval`/`document.write`. Sem
  renderização de HTML/markdown de usuário. React auto-escapa. `wa.me` strip-non-digit.
- **Cookies/sessão:** JWT em cookie `httpOnly` + `secure` (prod) + `sameSite=lax`,
  rotação de segredo (`JWT_SECRETS`), invalidação via `sessionVersion`, gate de `blocked`.
- **Erros:** `lib/http.ts` (`PublicError`) — só mensagens públicas chegam ao cliente;
  resto vira 500 genérico + Sentry. Não vaza Prisma/Supabase.
- **OTP:** 6 dígitos CSPRNG, hash bcrypt (nunca plaintext), TTL 5 min, fail-closed nos
  provedores (Twilio/Resend), sem PII no log.
- **Controle de acesso:** toda rota `[id]` mutante checa ownership (sellerId/buyerId/
  userId/counterparty) na camada lib antes de mutar. Admin via `requireAdmin`. Sem IDOR.
- **Crons:** `GET` + `Bearer CRON_SECRET`, fail-closed. `.env` fora do git.

---

## Correções aplicadas (2026-06-23)

### Bugs exploráveis
1. **Open redirect no login** (`app/entrar/page.tsx`) — o `?next=` era validado só com
   `startsWith('/')`, que deixa passar `//evil.com` e `/\evil.com` (handoff de phishing
   pós-login). Agora resolve via `new URL(next, origin)` e exige `origin` igual.
2. **Decompression bomb no upload** (`lib/storage.ts`) — `sharp` rodava com teto default
   (~268 MP) e **decodificava o buffer 2×**. Um PNG/WebP <1 MB descomprimia pra ~1 GB de
   bitmap e dava OOM na rota pública de avatar. Agora: `limitInputPixels: 40_000_000` +
   `failOn:'error'` + checagem de `metadata()` antes de qualquer resize + `clone()`
   (decodifica **uma** vez).
3. **Cap de tentativas de OTP não-atômico** (`lib/otp.ts`) — read-then-increment (TOCTOU,
   CWE-367): chutes concorrentes furavam o teto de 5/código. Agora `updateMany` condicional
   (`WHERE attempts < 5`) serializa no índice do banco. Consume também condicional.

### Hardening pedido / ganhos claros
4. **CSRF — validação de origem same-origin** (`middleware.ts`) — defense-in-depth além do
   `sameSite=lax`. Num único ponto, toda request **mutante** (`POST/PUT/PATCH/DELETE`) em
   `/api/*` precisa ter `Origin`/`Referer` da mesma origem (compara com `x-forwarded-host`).
   Config-free (funciona em preview/custom domain/localhost). Cron/Bearer não passam por aqui.
   Fecha a janela residual "Lax-plus-POST" do Chrome e cobre rotas mutantes futuras.
5. **Headers** (`next.config.mjs`) — adicionados `X-XSS-Protection: 0` (recomendação atual
   OWASP/MDN: desliga o filtro legado bugado; a proteção real é a CSP), `Cross-Origin-
   Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, e
   `Permissions-Policy` expandida (nega payment/usb/serial/bluetooth/sensores/midi/
   browsing-topics — **mantendo** fullscreen/autoplay que o vídeo do HowItWorks usa).
6. **JWT — algorithms allowlist** (`lib/session.ts`) — `sign`/`verify` fixados em `HS256`.
   Trava o contrato contra alg-confusion/alg:none e mudança futura do tipo de segredo.
7. **Brute-force por conta** (`otp/verify`, `recovery/phone/confirm`) — além do teto por IP,
   teto por telefone/email/token (10/h, fail-closed): IPs rotativos ainda esbarram num
   limite por alvo, sem depender só do cap de 5/código.
8. **Favorite 404 limpo** (`app/api/listings/[id]/favorite`) — id inexistente batia na FK
   (P2003 → 500 + ruído no Sentry); agora `findUnique` → 404.

**Verificação:** `tsc --noEmit` limpo, ESLint limpo, **141/141 testes** passando.

---

## Pendências recomendadas (NÃO aplicadas — exigem rodar o app)

- **[ALTA] CSP `script-src 'unsafe-inline'` → nonce — ENFORCED STRICT (validar no Preview).**
  O nonce por request é gerado em `proxy.ts` (ex-`middleware.ts`; Next 16 renomeou a
  convenção) e propagado pro Next via override do header de REQUEST `Content-Security-Policy`,
  que faz o App Router carimbar o atributo `nonce` em TODOS os seus `<script>` (verificado:
  58/58 inline + 12/12 externos no build de prod local). Os componentes Vercel (Analytics/
  Speed Insights) NÃO precisam de nonce — injetam `<script src>` externo coberto por
  `'self'`/`https://va.vercel-scripts.com` (e a v2 nem aceita prop `nonce`).

  **Como o nonce chega no render (e por que report-only falhou na Vercel):** o Next deriva o
  nonce do `Content-Security-Policy` que ELE lê no REQUEST. Na Vercel, a plataforma injeta
  nesse request a CSP que vai no RESPONSE — então a CSP ENFORCED precisa SER a estrita. Uma
  CSP loose enforced (do `next.config` OU do proxy) faz o render ler "sem nonce" e não carimbar
  nada. Comprovado no Preview: com loose enforced + estrita em `Report-Only`, **todo** script
  acusava violação report-only (nonce nunca aplicado). No `next start` local o híbrido até
  funcionava, mas a Vercel se comporta diferente. Conclusão: **não existe "loose enforced +
  report-only limpo" na Vercel** — o caminho é enforced strict direto, validado no Preview.

  **Nonce exige render DINÂMICO (descoberto no Preview):** o nonce só é carimbado nos `<script>`
  de páginas renderizadas por request. Página ESTÁTICA (pré-renderada no build) tem os scripts
  inline congelados SEM nonce → sob CSP estrita eles são BLOQUEADOS e a página não hidrata.
  No Preview, as estáticas (`/entrar`, `/anuncios`, `/anunciar`, `/chat`, `/termos`,
  `/privacidade`, `/_not-found`) quebravam; as dinâmicas (home, `/anuncio/[id]`) funcionavam.
  (Nada a ver com Turbopack: tanto Turbopack quanto webpack carimbam nonce em página dinâmica.)
  **Fix:** `export const dynamic = 'force-dynamic'` no `app/layout.tsx` → todas as rotas viram
  dinâmicas e recebem nonce. **Trade-off aceito:** perde render estático/ISR (cada página bate
  no servidor por request). Verificado: 6–13/6–13 scripts com nonce em todas as antes-estáticas.

  **Estado:** `CSP_ENFORCE_STRICT = true` (`proxy.ts`); CSP removida do `next.config.mjs`;
  `force-dynamic` no layout raiz. CSP estrita (nonce, sem `'unsafe-inline'`) ENFORCED por
  request em prod; dev fica loose (Turbopack não aplica nonce em dev). De-risco = validar no
  Preview antes do merge. Notas de Preview: a home pode dar erro de Server Component se o escopo
  Preview não tiver `DATABASE_URL`/`SUPABASE_*` (não é CSP); e `https://vercel.live/.../feedback.js`
  (toolbar de Preview) é bloqueado pela CSP estrita — irrelevante pra prod (não injetado lá).
- **[BAIXA] CSP reporting — CÓDIGO APLICADO, falta ligar o env.** O `proxy.ts` já emite
  `report-uri`/`report-to` na CSP estrita + header `Reporting-Endpoints`, **gated em
  `CSP_REPORT_URI`**. Pra ativar: setar `CSP_REPORT_URI` (URL "Security Header" do Sentry,
  ver `.env.example`) na Vercel. Com a CSP enforced, vira telemetria de violação real.

### Itens INFO já resolvidos (2026-06-24)
- **[INFO] Timing de existência de conta** ✅ — dummy `bcrypt.compare` (cost 8) no caminho
  de e-mail inexistente em `otp/verify`, equalizando o custo de CPU (CWE-208).
- **[INFO] Dead code** ✅ — `confirmSale()` removido de `lib/deals.ts` (sem caller; referenciava
  modelo `Conversation` legado).

**Verificação (2026-06-24):** `tsc --noEmit` limpo, ESLint limpo, **141/141 testes** passando.

## Falsos-positivos descartados na verificação (não são bugs)
- Upload "DoS por buffer de 200 MB": a Vercel limita o body antes; não amplifica.
- "Content-type confia em `file.type`": o `sharp` re-encoda pra JPEG, neutralizando polyglot.
- "`clientIp` confia no 1º XFF": seguro atrás da Vercel (só vira risco se trocar de proxy).
