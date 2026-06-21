# HANDOFF — Kitetropos (comece por aqui)

**Atualizado:** 2026-06-20 · **Commit:** `da9ff44` · **Branch:** `main`

Documento de passagem de bastão para um novo chat/dev. Leia isto primeiro, depois os
docs canônicos referenciados. **Verdade-terreno é o código** — se um doc divergir, o
código manda; corrija o doc.

---

## O que é

Marketplace de equipamento de **kitesurf** (Cumbuco/CE), Fase 0, 1 hub. **App único**
Next.js 14 (App Router + API routes) em `apps/web`, Prisma + **Supabase** (Postgres +
Storage). Sem chat/pagamento/escrow na plataforma: contato estruturado (oferta/visita)
+ WhatsApp. Não existe mais `apps/api` (NestJS legado, removido).

## Como o projeto trabalha

- **Deploy:** `git push origin main` → GitHub `Paioca/kitesurf` → **Vercel deploya
  sozinho**. Não há comando de deploy. Domínio `kitetropos.com` (apex 308→www).
- **Migrations NÃO rodam no build.** Aplicar à mão, **ANTES** de fazer push do código
  que usa as colunas novas (o `.env` local aponta pro banco de PROD):
  `cd apps/web && npx prisma migrate deploy`
- **Verificação (= o que o CI roda):**
  ```bash
  cd apps/web
  npx tsc --noEmit            # types
  npm run test:run            # Vitest (59 testes, sem banco — db mockado)
  npm run lint                # ESLint (next/core-web-vitals), tem que ficar limpo
  JWT_SECRET=<32+ chars> npm run build   # build de produção
  ```
  CI em `.github/workflows/ci.yml` (npm ci + os 4 acima) roda em todo PR/push, verde no
  Linux. Use a API do GitHub Actions pra conferir o run (não há `gh` instalado).

## Docs canônicos (no repo)

| Doc | Pra quê |
|---|---|
| `docs/AUDITORIA-CONTEXTO.md` | **Decisões TRAVADAS** (não pontuar como bug) + o que já foi feito |
| `docs/PLANO-LANCAMENTO.md` | **Plano por fases da auditoria v3** — o backlog que falta, com esforço |
| `docs/PLANO-VENDA-COMPONENTE.md` | Design da venda por componente (já implementada) |
| `docs/ESTADO-ATUAL.md` | Estado geral (parcialmente des-driftado; pode ainda ter trechos velhos) |
| `DEPLOY.md` / `SETUP.md` | Deploy e setup local |

---

## Estado atual (o que já está no ar)

Sessão extensa endureceu segurança/integridade e entregou uma feature grande. **No ar:**

- **P0/P1/P2** (auditorias anteriores): JWT trava em prod; venda concluída atômica +
  índice único parcial; gate de anúncio ativo; OTP real fail-closed + timeout Twilio;
  allowlist de host de imagem; validação de catálogo no criar; PublicError/errorResponse
  (não vaza Prisma); rate-limit; paginação defensiva; Sentry (3 runtimes); CSP/headers;
  cancelar oferta/venda; toast/skeletons/router.refresh; `apps/api` removido.
- **Rede de segurança:** **Vitest (59 testes, `apps/web/test/`) + GitHub Actions CI +
  ESLint limpo.** Antes não havia teste/CI nenhum.
- **Venda por componente (`da9ff44`):** kit vende kite/barra avulsos sem marcar o anúncio
  inteiro vendido. enum `Component`, `kiteSoldAt`/`barraSoldAt` no Listing, helper puro
  `lib/components.ts`, `confirmPurchase` atômico por peça. Migration `20260621000000`
  **já aplicada na prod**. Resolveu o achado CRÍTICO da auditoria v3.
- **Infra:** Twilio (SMS/OTP) e `CRON_SECRET` setados na Vercel; `APP_URL=kitetropos.com`;
  `/api/maintenance/cleanup` (purga OtpCode/RateHit + imagens órfãs).

## O que falta — backlog da auditoria v3 (detalhe em `docs/PLANO-LANCAMENTO.md`)

**Veredito:** pronto pra **beta privado** após uma rodada curta; **não** pra lançamento
amplo. Em ordem recomendada:

### 🔴 Fase 0 — ação do DONO (fora de código), bloqueia até beta
1. **Rotacionar credenciais** (senha do DB + `service_role` do Supabase vazadas; deletar
   Supabase/Vercel órfãos; secret scanning no histórico Git).
2. Confirmar que `seed-journey`/`seed-cumbuco` **nunca** rodam contra prod (gravam
   picsum/pravatar + telefones fake, sem guarda de `NODE_ENV`).

### 🔴 Fase 1 — código, caminho até beta seguro (tudo baixo/médio)
3. **`sold` terminal + bloquear edição de vendido** — `PATCH /api/listings/[id]` grava
   `status` sem checar o atual → `sold→active` ressuscita item vendido, e dá pra editar
   campos de um vendido. Fix: `canTransition(from,to)` (ou fallback: 409 se `status==='sold'`).
4. **Normalizar telefone E.164 no servidor** — `+5585…` ≠ `5585…` viram 2 contas + 2
   buckets de rate-limit. `lib/phone.ts` aplicado IDÊNTICO em request/verify/generateOtp/
   verifyOtp (se normalizar em um só ponto, OTP nunca valida). Fallback: só o fluxo novo.
5. **Copy honesta de confiança** — landing promete "golpista não circula / sem medo do
   golpe / Identidade verificada / CPF verificado" (FALSO — só telefone via OTP). Varrer
   `app/page.tsx` (~22,25,60,203,204,247 — inclui OG indexável) + `perfil/[id]/page.tsx`.
6. **Mitigar Image Optimizer do Next** (beta privado não-indexável) — restringir
   `images.remotePatterns`, mover avatares de seed pro storage. NÃO fecha os advisories
   de smuggling/SSRF (esses só com upgrade major).
7. **Categoria inativa no browse** — `BASE` em `lib/browse.ts` não filtra `category.active`
   → add `category:{is:{active:true}}` (replicar em `lib/profile.ts`). + purgar dados de
   teste do banco (prefixo telefone `+558599100000…`, ordem FK review→deal→request→favorite→listing→user).
8. **Preço inconsistente (kit)** — card/sort usam preço efetivo, mas **filtro e facetas de
   preço usam `Listing.price` (conjunto)**. Card R$4.800 não casa filtro "até R$5.000".
   (Não foi resolvido pela venda-por-componente; é item separado.) Tornar o "preço de
   busca" = efetivo da perspectiva em card+filtro+faceta+sort.

### 🔴 bloqueia AMPLO (alto esforço)
9. **Upgrade Next 14.2.35 → 15.5.x + React 18→19** — advisories *high* (DoS Image
   Optimizer via `remotePatterns` que usamos, HTTP smuggling, cache poisoning, XSS CSP
   nonce). `14.2.35` é o topo da linha; **não tem fix em patch 14.2.x** → é major. Validar:
   `cookies()`/`headers()` viram async (afeta `session.ts`, `ratelimit`), caching default,
   matriz Sentry, CSP, build.

### 🟡 Fase 2 — antes de divulgar amplo
- Jurídico final (Termos/Privacidade hoje "provisórios") + validar EXIF/anonimização.
- **Moderação com ação real** — hoje PATCH de report só muda status; não bloqueia user
  nem derruba anúncio. **Atômico:** `User.status='blocked'` + `Listing.status='archived'`
  juntos (browse não filtra por status do dono → bloquear sem arquivar deixa o golpista no ar).
- E2E do funil; paralelizar upload de fotos (hoje sequencial); reconciliar `ESTADO-ATUAL.md`.

### ⚪ Fase 3 — escala/dívida (pós-lançamento)
Facetas em SQL (`loadActiveRows` faz scan sem `take`); ISR; cache de catálogo (`getBrands`
sem cache — barato); `next/font` (LCP); gate do Sentry Replay; i18n real (toggle "English"
é no-op); restaurar arquivado; dividir componentes grandes / tipar ~43 `any`.

## Itens NÃO feitos dentro da venda-por-componente (follow-ups menores)
- `DealBox` não diz qual peça na confirmação ("Confirmar que vendeu…") — `/pedidos` já
  mostra o rótulo do componente, então é só polimento.
- `ListingCard` não mostra selo "peça vendida" na aba "meus anúncios" (perspectiva `all`).
- Fluxo de venda via conversa (`confirmSale` em `deals.ts`) cai em `conjunto` (default) —
  ok, o fluxo ativo é via Request.

---

## ⚠️ Armadilhas (já mordemos, anota)

- **Lockfile cross-plataforma:** NÃO regenerar `package-lock.json` no Mac com `rm + npm
  install` sem conferir — pode sair só-darwin (faltar `@next/swc-linux-*`/`@img/sharp-linux-*`
  como pacotes RESOLVIDOS) e **quebrar o build da Vercel**. Conferir: o `packages` map tem
  `node_modules/@img/sharp-linux-x64`. O CI pega. (Quebrou a prod uma vez, commit `9539ab9`.)
- **`next build` LOCAL** falha sem `JWT_SECRET` forte (≥32) no `.env` (trava P0 +
  `NODE_ENV=production`). `next dev` funciona (fallback). Vercel tem secret forte.
- **Prisma `@@unique` é índice, não constraint** — em migration manual usar `DROP INDEX`,
  não `DROP CONSTRAINT` (a migration `20260621000000` falhou nisso; foi reescrita
  idempotente + `prisma migrate resolve --rolled-back` + redeploy).
- **`.env` local aponta pro banco de PROD.** Cuidado com scripts/migrations. Preview
  (`npm run dev`) também usa prod. Sem banco de staging ainda.
- **Domínio `kitetropos.com`** pode dar "self-signed cert" em rede com firewall Fortinet
  (ex: rede de hospital do Felipe) interceptando domínio novo — é a rede, não a Vercel.
  Testar fora dela (4G).
- **Ordem de deploy de feature com migration:** migration na prod PRIMEIRO (aditiva +
  defaults cobrem o código velho na janela), DEPOIS push do código.

## Ação aberta do dono (lembrar)
Rotação de credenciais (Fase 0) é o **único bloqueio duro** pra abrir o beta. Confirmar
também a entrega real de SMS num celular comum (Twilio pode estar em trial).
