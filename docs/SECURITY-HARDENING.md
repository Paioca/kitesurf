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

- **[ALTA] CSP `script-src 'unsafe-inline'` → nonce — FASE 1 APLICADA (flip pendente).**
  O nonce por request é gerado em `proxy.ts` (ex-`middleware.ts`; Next 16 renomeou a
  convenção) e propagado pro Next via override do header de REQUEST `Content-Security-Policy`,
  que faz o App Router carimbar o atributo `nonce` em TODOS os seus `<script>` de hidratação
  (verificado: 58/58 inline + 12/12 externos no build de prod). Os componentes Vercel
  (Analytics/Speed Insights) NÃO precisam de nonce — injetam `<script src>` externo coberto
  por `'self'`/`https://va.vercel-scripts.com` (e a v2 nem aceita prop `nonce`).

  Descoberta que mudou o plano: o Next deriva o nonce do `Content-Security-Policy` que ELE
  lê no request, e o `resolve-routes` copia todo header de RESPONSE do proxy de volta pro
  request. Logo, se a CSP ENFORCED (loose) for setada no response do proxy, ela sobrescreve
  o override estrito e o nonce some. Por isso o de-risco usa um **híbrido**:
  - **Fase 1 (atual):** ENFORCED loose vem ESTÁTICA do `next.config.mjs` (não passa pelo
    merge); o `proxy.ts` injeta o nonce via override de request e publica a estrita em
    `Content-Security-Policy-Report-Only` (só prod). Como o nonce É aplicado, o report-only
    reporta **zero violação** — sinal limpo. Dev fica sempre loose (Turbopack não aplica nonce).
  - **Fase 2 (flip):** confirme zero violação report-only em prod por 1 release, REMOVA a
    entrada de CSP do `next.config.mjs` e vire `CSP_ENFORCE_STRICT = true` no `proxy.ts`.
    (Fase 2 já validada localmente: enforced estrita sem `'unsafe-inline'`, hidratação OK,
    zero violação.)
- **[BAIXA] CSP reporting** — adicionar `report-to`/`Reporting-Endpoints` apontando pro
  Sentry pra ter telemetria de violação antes de apertar a `script-src`.
- **[INFO] Timing de existência de conta** no `otp/verify` por email — dummy `bcrypt.compare`
  no caminho negativo. Sinal abaixo do jitter de rede + rate-limit; baixíssimo valor.
- **[INFO] Dead code** — `confirmSale()` em `lib/deals.ts` não tem caller; remover.

## Falsos-positivos descartados na verificação (não são bugs)
- Upload "DoS por buffer de 200 MB": a Vercel limita o body antes; não amplifica.
- "Content-type confia em `file.type`": o `sharp` re-encoda pra JPEG, neutralizando polyglot.
- "`clientIp` confia no 1º XFF": seguro atrás da Vercel (só vira risco se trocar de proxy).
