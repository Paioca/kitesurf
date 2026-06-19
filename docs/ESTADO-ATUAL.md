# Estado atual — Kite Life (handoff entre janelas)

> Marketplace de equipamento de kitesurf, Cumbuco. **Fase 0 no ar.**
> Última atualização: jun/2026. Este doc é o ponto de partida pra continuar.

## Mudanças recentes (jun/2026) — LER

- **Banco em São Paulo.** Supabase migrado pra `sa-east-1`, ref novo **`oycxkofylcofvvditjeg`**; função
  Vercel fixada em **`gru1`** (`apps/web/vercel.json`). Compute e banco os dois no Brasil → home TTFB
  ~1,1s → ~0,15s. Projeto antigo `vndzuhgshqdxqqbqtawn` (us-west-2) está **órfão → deletar**.
- **Busca reescrita em SQL** (`lib/browse.ts`): filtros + paginação no banco (`PAGE_SIZE 24`, Anterior/
  Próxima via URL) — **sem o antigo teto de 500**; facetas por agregação SQL (groupBy + raw no JSONB),
  cacheadas (`unstable_cache` 60s, `revalidateTag('listings')` no publish). Prisma `relationJoins`.
- **Imagens otimizadas.** `ListingImage.thumbUrl` (400px) gravado e usado nos cards; `url` (1600px) no
  detalhe. Upload **reduz a imagem no cliente** antes de enviar (`lib/resizeImage.ts`) — rápido no 4G,
  sem estourar o limite de 4,5MB do serverless, e tira EXIF/GPS no aparelho.
- **MVP = só Kite + Barra** (`Category.active`; as outras 5 categorias estão `active:false`). O **kit
  (kite + barra no mesmo anúncio)** é modelado como flag no kite: `Listing.hasBarra` + `kitePrice` +
  `barraPrice` + `barraAttributes`, fotos marcadas por peça (`ListingImage.component`). Busca **por
  perspectiva**: kit aparece na busca de kite (badge "+ Barra", preço do kite avulso quando houver) e,
  **só se a barra é vendável avulsa**, também na de barra (cara da barra, badge "do kit").
- **Conta/logout + ciclo de vida do anúncio** (resultado da auditoria UX/QA — ver seção no fim).

> **Testar sempre no Vercel, não local** (o `.env` local tende a perder a `SERVICE_ROLE_KEY` → upload
> quebra com "Invalid Compact JWS"). Fluxo: editar em `apps/web` → `npm run build` valida → commit+push
> → Vercel redeploya o `kitesurf-web` sozinho.

## O que é / estratégia

Marketplace web responsivo (mobile + desktop), marca **"Kite Life"**. **Fase 0 = sem pagamento/checkout**
— vender acontece fora; a plataforma entrega descoberta + contato (chat) + reputação. Norte: **fricção
mínima, crescer base, cobrar depois.** Detalhe em [fase-0.md](fase-0.md).

## Onde tudo vive

| Coisa | Valor |
|---|---|
| Repo GitHub | https://github.com/Paioca/kitesurf (branch `main`) · auth via deploy key SSH |
| App no ar | **https://kitesurf-web.vercel.app** (projeto Vercel `kitesurf-web`, região `gru1`) |
| Supabase | **`oycxkofylcofvvditjeg` (sa-east-1 / São Paulo)** · bucket público `listings` |
| Supabase ANTIGO (DELETAR) | `vndzuhgshqdxqqbqtawn` (us-west-2) — órfão, carrega creds vazadas |
| Vercel órfãos (DELETAR) | `kitesurf` e `kitesurf-api` — o app é só o `kitesurf-web` |
| Dir local | `/Users/felipegalli/Downloads/Kitesurf app` (monorepo) |
| Bundle de design | `/Users/felipegalli/Downloads/_kite_handoff2/an-lise-e-prototipo-web/project/*.dc.html` |

## Stack / arquitetura

- **App único Next.js 14** (App Router) em `apps/web/` — Route Handlers em `app/api/*` + Server
  Components com Prisma direto. Sem hop extra, sem CORS.
- **Prisma** → **Supabase Postgres** (pooled 6543 runtime + direct 5432 migrations).
- **Supabase Storage** (bucket `listings`); EXIF/GPS removido no cliente (resize) + sharp no servidor.
- **Sessão em cookie httpOnly** (`lib/session.ts`), JWT 30d. Login só por **OTP de telefone — não há senha.**
- `apps/api/` = NestJS legado, **não usado** (deletar).

## Variáveis de ambiente (no projeto Vercel `kitesurf-web`)

`DATABASE_URL` · `DIRECT_URL` · `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` · `SUPABASE_BUCKET=listings`
· `JWT_SECRET` · `OTP_MOCK=true`. (Local: em `apps/web/.env`.)

## Rodar local

```bash
cd "/Users/felipegalli/Downloads/Kitesurf app/apps/web"
npm install
npm run dev            # http://localhost:3000 (usa o Supabase SP remoto)
npm run db:deploy      # aplica migrations (migrate deploy — sem shadow DB)
npm run db:seed        # taxonomia (Kite/Barra ativos; resto active:false)
```

## Telas PRONTAS (no design system Kite Life)

| Tela | Rota | Notas |
|---|---|---|
| Início / Busca | `/` | SQL paginado (Anterior/Próxima), facetas, perspectiva kite/barra |
| Cadastro | `/entrar` | OTP telefone (mock) + foto obrigatória + IG opcional; cookie |
| Detalhe | `/anuncio/[id]` | Galeria, ficha, "Conversar", denunciar; **kit** (barra + opções de preço); **controles do dono** (Editar/Pausar/Excluir) + banner de status |
| Criar | `/anunciar` | Wizard: Kite / Barra / **Kite+Barra**; ficha+fotos por peça; 3 preços; remover foto (✕) |
| Editar | `/anuncio/[id]/editar` | Form pré-preenchido, só o dono; ficha+fotos add/remove+preços+entrega |
| Chat | `/chat` | Lista + thread, polling 4s. Confirmação venda→compra + avaliação no thread |
| Perfil público | `/perfil/[id]` | Reputação (média, vendas, compras, ativos) + avaliações |
| Conta | `/conta` | Hub do logado: perfil público, anunciar, mensagens, **Sair** (logout). Redireciona /entrar se deslogado |

Backend (`app/api/`): auth (otp request/verify/me/logout) · catalog · listings (**GET** busca · **POST**
criar · **PATCH** editar+status · **DELETE** soft) · uploads (image/avatar) · conversations + messages ·
deals (confirm) + review · reports. **Segurança:** cookie httpOnly · ownership (criar/editar/excluir
anúncio = dono; conversa/deal/review) · rate limiting (DB, `lib/ratelimit.ts`) · RLS · resize+EXIF strip
· zod.

## Modelo de dados (`apps/web/prisma/schema.prisma`)

`User · OtpCode · Category(+active) · Brand · Model · Listing · ListingImage · Conversation · Message ·
Deal · Review · RateHit · Report`.
- **Listing** novos campos: `hasBarra`, `kitePrice`, `barraPrice`, `barraAttributes`; `status`
  (draft/active/paused/sold/archived), `deletedAt` (soft).
- **ListingImage**: `thumbUrl`, `component` ('kite'|'barra').
- Migrations: init · chat · deal_review · ratelimit_report · enable_rls · **listing_image_thumb** ·
  **category_active** · **kit_kite_barra**.
- Enums prontos mas **não usados ainda** (espaço pros próximos batches): `ConversationStatus.blocked`,
  `DealStatus.cancelled`. **Fora (Fase 0):** Order/escrow, PSP, BusinessListing.

## Design system (REGRA)

Tudo deriva do bundle Claude Design. Tokens em `lib/tokens.ts`; primitivos em `components/ui.tsx` +
`ListingCard`, `Footer`, `SiteHeader`, `MobileChrome`. **NÃO inventar elemento/copy/emoji fora do
`.dc.html`** (memória `kitelife-design-system`). Afordância de dev fica invisível.

## Auditoria UX/QA (jun/2026) — batches

Auditoria completa identificou que o **eixo de transação** (descobrir→conversar→fechar→avaliar) está
completo, mas faltava **pós-criação e autogestão**. Plano em 5 batches:

- **Batch 1 (FEITO):** logout + `/conta` (hub) + AccountNav no header; aba Perfil ligada; remover foto no
  wizard; corrigida a dica falsa "dá pra editar depois".
- **Batch 2 (FEITO):** ciclo de vida do anúncio — `PATCH/DELETE /api/listings/[id]` (ownership 403),
  editar/pausar/reativar/excluir (soft), controles do dono no detalhe, `/anuncio/[id]/editar`.
- **Batch 3 (PENDENTE):** segurança/moderação — **bloquear usuário** no chat (`Conversation.blocked` já
  existe) + tela mínima de moderação de `Report` (hoje a denúncia cai num buraco; moderação = SQL na mão).
- **Batch 4 (PENDENTE):** conta/LGPD — **editar perfil** (`PATCH /api/auth/me`) + **excluir conta** (soft).
- **Batch 5 (PENDENTE):** engajamento — feedback de erro no chat (hoje falha silencioso); **favoritos**
  (não existe model nem rota; aba mobile "♡" desabilitada); notificações (só polling 4s).

## PENDÊNCIAS operacionais (antes de gente real)

1. **SMS real** — OTP é mock (`OTP_MOCK=true`). Plugar Zenvia/Twilio em `lib/otp.ts` + `OTP_MOCK=false`.
2. **Segurança** — senha `OzziOsbourne1313*` foi **reusada** no projeto SP e **continua vazada**. Trocar
   no Supabase + atualizar env (local+Vercel); rotacionar `service_role`; **deletar o projeto antigo** (Oregon).
3. ~~Dados de teste~~ — RESOLVIDA (banco SP nasceu zerado).
4. **LGPD** — Política de Privacidade + Termos (link no cadastro/rodapé) + excluir conta (Batch 4).
5. **Domínio próprio** + **seeding de Cumbuco** ([reference/seeding-plan.md](reference/seeding-plan.md)).
6. **Deletar** Vercel órfãos + pasta `apps/api`.
7. ~~Otimizar imagens~~ — RESOLVIDA (thumb 400px gravado e usado; resize no cliente).
8. **Cron de limpeza** de `RateHit`/`OtpCode` (acumulam linhas; sem TTL).

## Como continuar

Candidatos: **Batch 3** (bloquear/moderação) → **Batch 4** (perfil/LGPD) → **Batch 5** (favoritos/
notificação); operacional: SMS real, seeding de Cumbuco, segurança #2. Fluxo: editar em `apps/web`,
`npm run build`, commit+push → redeploy. Sempre derivar UI do design system. Verificar no Vercel.
