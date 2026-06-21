# Contexto pra auditoria — leia ANTES de auditar

**Última atualização:** 2026-06-20

Este documento existe pra que toda auditoria seja **justa e alinhada com a realidade
atual**. Antes de apontar um problema, confronte com o que está aqui: muita coisa que
parece pendência **já foi resolvida**, e alguns "achados" **contradizem decisões
travadas do dono**. Confirme sempre no código (não no histórico nem na memória).

> Verdade-terreno do código vence qualquer doc. Se este doc divergir do código, o
> código está certo — corrija o doc.

---

## TL;DR — estado de lançamento

> ⚠️ **Correção (auditoria v3):** versões anteriores deste doc diziam "pronto pra
> lançar". **Não está pronto para lançamento amplo.** Uma 3ª auditoria achou bloqueios
> reais de domínio/segurança. Estado correto: **pronto pra beta privado após uma rodada
> curta de correções; não pra lançamento amplo.** O plano definitivo (fases, esforço,
> trade-offs) está em **[PLANO-LANCAMENTO.md](PLANO-LANCAMENTO.md)** — é a fonte de
> verdade pro que falta.

Bloqueios reais (resumo — detalhe no plano): venda por componente quebrada (vender 1
peça marca o anúncio inteiro vendido); Next 14.2.x com advisories *high* (precisa
migração major); `sold→active` via API; telefone não normalizado; preço inconsistente
card↔filtro; categorias inativas/dados de teste no browse; copy prometendo segurança
absoluta. + rotação de credenciais (ação do dono).

Arquitetura: **app único** Next.js (App Router + API routes) em `apps/web`, Prisma +
Supabase (Postgres + Storage), deploy push-to-`main` → Vercel. **Não há mais API
separada** (`apps/api` NestJS foi removido).

---

## 🔒 Decisões travadas — NÃO pontuar como bug

Estas são escolhas deliberadas do dono. Auditoria que pede o contrário está errada;
no máximo, corrija o doc que as descreve.

1. **Publicação é um wizard multi-step**, de propósito. NÃO é "tela única" e não deve
   virar. (Se um doc disser "tela única", o doc é que está errado.)
2. **Cadastro/ficha 100% obrigatório**; foto de perfil obrigatória — pode trocar, não
   remover (decisão de segurança/confiança).
3. **Avaliação** é liberada quando o `Deal` existe (`seller_confirmed`) e fica
   **pública só em `completed`**. Avaliar antes da confirmação final é by-design.
4. **Fase 0 sem**: chat livre, pagamento na plataforma, agendamento com calendário/
   data-hora. Contato é estruturado (oferta/visita) + WhatsApp.
5. **Sem busca por texto livre** — removida de propósito. (O GET `/api/listings` /
   `searchListings` é resíduo; não reintroduzir busca textual.)
6. **Cards de anúncio usam `background-image`, não `next/image`** — decisão de custo:
   os thumbs já são 400px e servir direto do Supabase evita a cota de otimização de
   imagem da Vercel (Hobby). NÃO reverter pra next/image nos cards. (O hero usa
   next/image porque é 1 imagem grande, LCP.)
7. **"Árvore única" (dedup mobile/desktop da home)** deixada de fora de propósito —
   os layouts são genuinamente distintos; unificar é um redesign de risco.
8. **Múltiplos `Deal` em `seller_confirmed`** pro mesmo anúncio são by-design (o
   vendedor pondera entre compradores). A unicidade só é garantida em `completed`.

---

## ✅ O que foi feito (sessão 2026-06-20, commits `6b838a6`→`4cb63de`)

### Segurança / integridade (P0 da 1ª auditoria)
- **JWT_SECRET** sem fallback adivinhável; o app **trava no boot em produção** se a
  chave for fraca/ausente (`lib/session.ts`). _(`6b838a6`)_
- **Venda atômica**: `confirmPurchase` usa `updateMany` condicional (`status in
  [active,paused]`) dentro de transação; aborta se outro comprador já fechou. Reforçado
  por **índice único parcial** `Deal(listingId) WHERE status='completed'` (migration
  `20260620000000_deal_unique_completed`). _(`6b838a6`)_
- **Gate de anúncio ativo** em `createRequest` / `setRequestStatus` / `confirmSaleFromRequest`. _(`6b838a6`)_
- **Recusa os outros pedidos** do anúncio ao concluir a venda. _(`6b838a6`)_

### Login / OTP
- **OTP com `crypto.randomInt`** (CSPRNG). _(`6b838a6`)_
- **Mock / devCode / números de teste só fora de produção** — em prod o login exige
  SMS real (Twilio configurado e verificado). _(`6b838a6`)_
- **Twilio fail-closed**: lança se não conseguir enviar (não responde "enviado" sem
  enviar); **timeout de 4s** em notify e OTP. _(`6b838a6`, `b730ccc`)_

### Allowlist de imagem / catálogo
- **`isOfficialImageUrl`**: imagem/avatar só do host oficial do Supabase, no caminho
  público, sem caracteres que quebrem o `url()` do CSS (anti CSS-injection). Aplicado
  no criar/editar anúncio e no avatar (cadastro + editar perfil). _(`d11e38a`)_
- **Validação de catálogo** no criar: categoria precisa estar `active`; marca/modelo
  precisam existir e casar entre si e com a categoria. _(`87a8f71`)_

### Headers / observabilidade
- **Headers de segurança + CSP** (`next.config.mjs`): `frame-ancestors 'none'`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS em prod. _(`6b838a6`)_
- **Sentry** nos 3 runtimes (server/edge/client) + `global-error` + tunnel
  `/monitoring`. Validado em prod. _(`6b838a6`)_

### Correção de dados / UX (P1)
- **Sort por preço efetivo da perspectiva** (barra usa `barraPrice`, kite usa
  `kitePrice`) — feito em memória sobre select leve (o `orderBy` do Prisma não
  expressa `COALESCE`); decisão consciente. _(`3384c46`)_
- **Contadores do perfil** via `aggregate`/`count` (antes capavam em `take` 30/12). _(`2070444`)_
- **Galeria mostra todas as fotos** (antes `slice(0,6)`). _(`c244e7c`)_
- **Confirmação inline** nas ações irreversíveis + **cancelar venda** (`cancelSale`). _(`a323c10`)_
- **Oferta não reenvia sozinha após login** — restaura o formulário em vez de
  re-submeter. _(`5c8087e`)_

### P2 (lote A/B + polimento)
- **`PublicError` + `errorResponse`**: erro inesperado vira mensagem genérica +
  `Sentry.captureException` (não vaza Prisma/Supabase). _(`f0d9e6b`)_
- **Rate-limit por usuário** no `/api/uploads/image`; **comprador cancela a própria
  oferta** pendente; **paginação defensiva** (`?page=abc` não gera `skip=NaN`). _(`f0d9e6b`)_
- **Endpoint de manutenção** `/api/maintenance/cleanup` (protegido por `CRON_SECRET`):
  purga `OtpCode`/`RateHit` velhos + reporta/apaga imagens órfãs (`?purgeOrphans=true`,
  carência 24h). _(`f30145f`)_
- **Índices** `Listing.userId` e `(status, deletedAt)`. _(`f30145f`)_
- **Home**: next/image no hero, next/link na navegação (e no link do card). _(`7eafb48`, `3a36eb5`)_
- **Toast global + `router.refresh` + skeleton de loading**. _(`d64a76b`)_
- **`apps/api` legado removido**; `.gitignore` do `tsbuildinfo`; DEPLOY/SETUP reescritos
  pro app único. _(`0dbf75a`, `c49393a`)_

### 2ª auditoria — Bloco 1 (guardas + honestidade)
- **`setRequestStatus` exige `pending`** (sem flip-flop nem re-revelar WhatsApp). _(`b730ccc`)_
- **`ContactActions` gateado por `status==='active'`** na página do anúncio —
  pausado/vendido mostra "indisponível" em vez de deixar preencher oferta que falha. _(`b730ccc`)_
- **Cópia honesta**: "Agendar visita"→"Pedir visita"; promessa de SMS suavizada;
  "Instagram conectado"→"informado" (não há verificação); favoritos não prometem
  alerta de preço. _(`b730ccc`)_
- **`ESTADO-ATUAL.md` des-driftado**. _(`b730ccc`)_

### 2ª auditoria — Bloco 2 (rede de segurança)
- **Vitest — 40 testes** do funil de venda (`apps/web/test/`, `db` mockado): guardas de
  `createRequest`, `setRequestStatus`, `cancelRequest`, `confirmPurchase` (incl. abort
  atômico), `cancelSale`, `createReview`, `confirmSaleFromRequest` + validadores
  `isOfficialImageUrl`/`validateAttributes`. _(`4cb63de`)_
- **GitHub Actions CI** (`.github/workflows/ci.yml`): `npm ci` + `tsc` + `vitest` +
  `next build` + `lint` em PR/push. Verde no Linux. _(`4cb63de`)_
- **ESLint** (`next/core-web-vitals`) passando limpo. _(`4cb63de`)_

### Infra
- Domínio `kitetropos.com` na Vercel (3 domínios "Valid Configuration"); `APP_URL`
  apontando pra ele. Twilio + `CRON_SECRET` setados na Vercel.

---

## 🔴 Pendências honestas

1. **Rotação de credenciais (P0 — único bloqueio de lançamento amplo).** Senha do DB
   e `service_role` do Supabase foram **expostas**. Rotacionar ambas, **deletar
   Supabase/Vercel órfãos**, conferir histórico Git com secret scanning. **Ação manual
   do dono.**
2. **Confirmar entrega de SMS real** num celular comum (não-trial) — Twilio está
   plugado e o endpoint responde "enviado", falta só o teste de recebimento.
3. **Texto de LGPD** (Política/Termos) — a exclusão de conta já existe; falta o texto.
4. **Seeding de Cumbuco** (~50 anúncios reais) — produto, não código.

### Backlog técnico (válido, mas NÃO bloqueia 1 hub)
- Máquina de estados de **pedido** mais formal (o guard de `pending` já cobre o pior caso).
- **Filtros de barra** (hoje a perspectiva de barra esconde marca/preço/condição/comprimento).
- Remover **código morto do chat** (`Conversation`/`Message` no schema, `confirmSale`/
  `dealForConversation` em `deals.ts`).
- **Unificar buscas** (`searchListings` em `queries.ts` é resíduo do GET `/api/listings`).
- Escala: facetas em SQL, reputação materializada, ISR da home, upload paralelo,
  ratelimit atômico/fail-closed. Só importam acima de milhares de anúncios.
- Restaurar anúncio **arquivado** (estado hoje não-alcançável pela UI).
- Dividir componentes grandes, tipar `any`.

---

## Como verificar

```bash
cd apps/web
npx tsc --noEmit          # types
npm run test:run          # 40 testes (vitest, sem banco)
npm run lint              # eslint limpo
JWT_SECRET=<32+ chars> npm run build   # build de produção
```
O CI (`.github/workflows/ci.yml`) roda os quatro em todo PR/push.

## ⚠️ Armadilhas conhecidas

- **`next build` LOCAL** falha sem `JWT_SECRET` forte no `.env` (trava P0 +
  `NODE_ENV=production`). `next dev` funciona com fallback. Vercel tem secret forte.
- **Lockfile cross-plataforma**: NÃO regenerar `package-lock.json` no Mac com
  `rm + npm install` sem conferir — pode sair só-darwin (faltar `@next/swc-linux-*` /
  `@img/sharp-linux-*` como pacotes resolvidos) e **quebrar o build da Vercel**.
  Conferir: `packages` map tem `node_modules/@img/sharp-linux-x64`. O CI pega isso.
- **Domínio `kitetropos.com`** pode dar "self-signed cert" em redes com firewall de
  inspeção SSL (ex: Fortinet de hospital) — é a rede interceptando um domínio novo,
  não a Vercel. Testar fora dessa rede (4G).
