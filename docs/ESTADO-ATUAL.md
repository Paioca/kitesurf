# Estado atual — Kite Life (handoff entre janelas)

> Marketplace de equipamento de kitesurf, Cumbuco. **Fase 0 no ar.**
> Última atualização: jun/2026. Ponto de partida pra continuar. **LER inteiro antes de mexer.**

## Ciclo de negociação formalizado (2026-06-21)

Os caminhos de exceção (pausa, exclusão, desistência, "não comprei", concorrência) foram
fechados com transições **centralizadas e transacionais** em `lib/requests.ts`,
`lib/deals.ts`, `lib/lifecycle.ts`. A máquina de estados completa (Listing/Request/Deal +
eventos de notificação) está em **`docs/STATE-MACHINE.md`** — referência canônica. Resumo:
`sold` é terminal; excluir anúncio encerra pedidos como `listing_removed` e bloqueia se há
venda aguardando confirmação; comprador pode desistir (`withdrawn`) e responder "não comprei"
(`denyPurchase`); concluir venda invalida deals concorrentes (`voided`) e marca os outros
pedidos `sold_elsewhere` (não `declined`). Notificação in-app persistente (`Notification`)
emitida dentro das transações; badge da aba Pedidos = não-lidas (os dois lados). NOTA: a copy
de "Agendar visita" abaixo está desatualizada — o código já diz **"Pedir visita"**.
Onboarding/copy segue num passe separado do dono (ver `docs/COPY-CONTRATO.md`).

## Mudança mais importante (pivot de contato — jun/2026)

**Não existe mais chat livre.** O contato é **estruturado**:
- No anúncio o comprador tem **Fazer oferta** (valor) e **Agendar visita** (só o pedido, sem data).
- O **vendedor** vê os pedidos em **`/pedidos`** e **Aceita/Recusa**. **Aceitar libera o WhatsApp do
  vendedor pro comprador** (uma direção, só `wa.me`, 100% estruturado — sem texto livre). Preço, dia da
  visita e o resto eles combinam no WhatsApp.
- **Reputação por checagem cruzada:** num pedido aceito, o vendedor **marca "vendido"** e o comprador
  **confirma "comprei"** — **só quando as duas pontas batem** vira negócio fechado → anúncio "Vendido" →
  **avaliação mútua** → reputação no perfil.
- O `/chat` foi **aposentado** (redireciona `/pedidos`); o código morto do chat foi removido. As tabelas
  `Conversation`/`Message` ficam **dormentes** no schema (sem migration de drop).

## Outras mudanças recentes (jun/2026)

- **Banco em São Paulo.** Supabase `sa-east-1`, ref **`oycxkofylcofvvditjeg`**; função Vercel fixada em
  **`gru1`** (`apps/web/vercel.json`). Home TTFB ~1,1s → ~0,15s. Projeto antigo `vndzuhgshqdxqqbqtawn`
  (us-west-2) **órfão → deletar**.
- **Busca SQL** (`lib/browse.ts`): filtros + paginação no banco (sem teto de 500), facetas por agregação
  cacheadas; mobile tem chips de tamanho on-page + ordenação. **Imagens:** thumb 400px nos cards, resize
  no cliente antes do upload.
- **MVP = Kite + Barra** (`Category.active`). **Kit** (kite+barra no mesmo anúncio) = flag no kite
  (`hasBarra`, `kitePrice`, `barraPrice`, `barraAttributes`, foto por peça via `ListingImage.component`);
  busca **por perspectiva** (kit na busca de kite; barra avulsa também na de barra).
- **Auditoria UX/QA** aplicada (ver "Histórico"): conta/logout, ciclo de vida do anúncio, moderação,
  editar/excluir conta, favoritos, "Meus anúncios", **wizard de anunciar multi-step** (mantido por
  decisão — NÃO é tela única), e-mail opcional no cadastro, máscara de preço (bug), tamanho em chips.

> **Testar sempre no Vercel, não local** (o `.env` local tende a perder a `SERVICE_ROLE_KEY` → upload
> quebra com "Invalid Compact JWS"). Fluxo: editar em `apps/web` → `npm run build` → commit+push → redeploy.

## O que é / estratégia

Marketplace responsivo (mobile + desktop), marca **"Kite Life"**. **Fase 0 = sem pagamento/checkout** — a
venda acontece fora (WhatsApp); a plataforma entrega **descoberta + contato estruturado + reputação**.
Norte: fricção mínima, crescer base, cobrar depois. Login só por **OTP de telefone — não há senha.**

## Onde tudo vive

| Coisa | Valor |
|---|---|
| Repo GitHub | https://github.com/Paioca/kitesurf (branch `main`) · deploy key SSH |
| App no ar | **https://kitesurf-web.vercel.app** (Vercel `kitesurf-web`, região `gru1`) |
| Supabase | **`oycxkofylcofvvditjeg` (sa-east-1 / São Paulo)** · bucket público `listings` |
| Supabase ANTIGO (DELETAR) | `vndzuhgshqdxqqbqtawn` (us-west-2) — órfão, creds vazadas |
| Vercel órfãos (DELETAR) | `kitesurf` e `kitesurf-api` |
| Dir local | `/Users/felipegalli/Downloads/Kitesurf app` (monorepo) |
| Bundle de design | `/Users/felipegalli/Downloads/_kite_handoff2/an-lise-e-prototipo-web/project/*.dc.html` |

## Stack

- **Next.js 14** (App Router) em `apps/web/` — Route Handlers `app/api/*` + Server Components com Prisma.
- **Prisma → Supabase Postgres** (pooled 6543 runtime + direct 5432 migrations). **Storage** bucket `listings`.
- **Sessão** cookie httpOnly JWT 30d (`lib/session.ts`). `requireUser()` / `requireAdmin()`.
- `apps/api/` (NestJS) legado **removido** (repo é app único `apps/web`).

## Env (no Vercel `kitesurf-web`)

`DATABASE_URL · DIRECT_URL · SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY · SUPABASE_BUCKET=listings ·
JWT_SECRET · OTP_MOCK=true`. (Local em `apps/web/.env`.)

## Rodar local

```bash
cd "/Users/felipegalli/Downloads/Kitesurf app/apps/web"
npm install
npm run dev            # http://localhost:3000 (Supabase SP remoto)
npm run db:deploy      # migrations (migrate deploy — sem shadow DB)
npm run db:seed        # taxonomia (Kite/Barra ativos)
```

## Telas (no design system Kite Life)

| Tela | Rota | Notas |
|---|---|---|
| Início / Busca | `/` | SQL paginado, facetas, perspectiva kite/barra; mobile: chips de tamanho + ordenação on-page |
| Cadastro | `/entrar` | OTP telefone (mock, auto-submit) + **foto obrigatória** + nome; **e-mail opcional**; `?next=` pós-login |
| Detalhe | `/anuncio/[id]` | Galeria, ficha, **Fazer oferta / Agendar visita** (+ WhatsApp quando liberado), favoritar, denunciar; **dono**: Editar/Pausar/Excluir + banner de status |
| Criar | `/anunciar` | **Tela única**: tipo (Kite/Barra/Kit) + ficha (tamanho em chips) + fotos por peça (remover ✕) + preços |
| Editar | `/anuncio/[id]/editar` | Form pré-preenchido, só o dono |
| Pedidos | `/pedidos` | Recebidos (vendedor: Aceitar/Recusar → libera WhatsApp; marcar vendido) + Enviados (comprador: status, WhatsApp, confirmar compra, avaliar). **Substitui o chat.** |
| Meus anúncios | `/conta/anuncios` | Gerenciar os próprios listings (inclui pausados); Editar/Pausar/Excluir inline |
| Perfil público | `/perfil/[id]` | Reputação (média, vendas, compras, ativos) + avaliações |
| Conta | `/conta` | Hub: meus anúncios, favoritos, perfil, editar perfil, anunciar, pedidos, **Sair** |
| Editar perfil | `/conta/editar` | Foto/nome/IG/idioma + **excluir conta** (soft) |
| Moderação | `/moderacao` | Denúncias; **só admin** (`User.admin`), senão 404 |
| Favoritos | `/favoritos` | Anúncios salvos |
| ~~Chat~~ | `/chat` | **Aposentado** → redireciona `/pedidos` |

## Backend (`app/api/`)

auth (otp · me **GET/PATCH/DELETE** · logout) · catalog · listings (**GET** busca · **POST** criar ·
**PATCH** editar+status · **DELETE** soft · **POST `[id]/request`** oferta/visita · **POST `[id]/favorite`** ·
**`[id]/sold`** vendedor marca venda) · **requests/[id]** (PATCH aceitar/recusar) · deals (`[id]/confirm`
comprador · `[id]/review`) · uploads (image/avatar) · reports (POST denunciar · **GET/PATCH** admin).
**Segurança:** ownership em tudo · rate limiting (DB) · RLS · resize+EXIF strip · zod.

## Modelo de dados (`prisma/schema.prisma`)

`User(+admin) · OtpCode · Category(+active) · Brand · Model · Listing · ListingImage · Deal · Review ·
RateHit · Report · Favorite · **Request** · ~~Conversation~~ · ~~Message~~ (dormentes)`.
- **Listing:** `hasBarra/kitePrice/barraPrice/barraAttributes`, `status` (draft/active/paused/sold/archived),
  `deletedAt`. **ListingImage:** `thumbUrl`, `component`. **User:** `admin`, `email` agora **nullable**.
- **Request** (contato): `type` (offer/visit), `amount?`, `status` (pending/accepted/declined),
  listing+buyer+seller; `@@unique([listingId,buyerId,type])`.
- **Deal** rehomeado: criado por `confirmSaleFromRequest` (vendedor) a partir de um Request aceito
  (`conversationId` agora null); comprador confirma → completed → `Review`.
- Migrations recentes: listing_image_thumb · category_active · kit_kite_barra · user_admin · favorite ·
  email_optional · **request**. **Fora (Fase 0):** Order/escrow, PSP, BusinessListing.

## Design system (REGRA)

Tudo deriva do bundle Claude Design. Tokens em `lib/tokens.ts`; primitivos em `components/ui.tsx` +
`ListingCard`, `Footer`, `SiteHeader`, `MobileChrome`. **NÃO inventar elemento/copy/emoji fora do `.dc.html`**
(memória `kitelife-design-system`). Afordância de dev fica invisível.

## Histórico (tudo FEITO e no ar)

- **Auditoria funcional (5 batches):** logout + `/conta`; ciclo de vida do anúncio (editar/pausar/excluir);
  moderação (`/moderacao`, `User.admin`); editar/excluir conta (LGPD); favoritos.
- **Auditoria de fricção UX:** e-mail opcional, máscara de preço (bug), tamanho em chips, wizard → **tela
  única**, ordenação/tamanho on-page no mobile, quick wins de navegação, `?next=` pós-login, "Meus anúncios".
- **Pivot de contato (fases 1+2):** oferta/visita + libera WhatsApp; checagem cruzada venda/compra +
  avaliação; chat removido.

## PENDÊNCIAS (antes de gente real)

1. 🔴 **Segurança (P0 — único bloqueio de lançamento)** — senha de banco e `service_role`
   **vazadas** (a própria senha aparecia neste doc). Rotacionar senha do DB + `service_role`,
   **deletar Supabase/Vercel órfãos**, conferir histórico Git com secret scanning.
2. **LGPD** — falta o *texto* de Política/Termos (exclusão de conta já existe).
3. **Seeding de Cumbuco** (≈50 anúncios — [reference/seeding-plan.md](reference/seeding-plan.md)).
4. **Confirmar entrega de SMS real** — Twilio plugado e verificado (endpoint responde "enviado");
   falta só confirmar que entrega pra número comum (não-trial) num celular real.
5. **Virar admin** (pra usar `/moderacao`): `UPDATE "User" SET admin=true WHERE phone='+55...'` no Supabase SQL.

**JÁ FEITO** (era pendência, hoje no ar): OTP real via Twilio (mock só fora de prod); notificação de
pedido novo (`lib/notify.ts`, SMS/WhatsApp); endpoint de manutenção `/api/maintenance/cleanup`
(purga RateHit/OtpCode + imagens órfãs); domínio `kitetropos.com` + `APP_URL`; Sentry; headers/CSP.

## Como continuar

Próximo crítico: **rotacionar credenciais (#1)** — único bloqueio de lançamento. Depois: seeding de
Cumbuco, confirmar entrega de SMS num celular real, texto de LGPD. Backlog técnico (não bloqueia 1 hub):
ESLint + CI + smoke-test do funil de venda; máquina de estados de pedido; filtros de barra. Fluxo:
editar em `apps/web`, `npm run build`, commit+push → redeploy. Sempre derivar UI do design system.
