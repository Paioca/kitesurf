# Estado atual — Kite Life (handoff entre janelas)

> Marketplace de equipamento de kitesurf, Cumbuco. **Fase 0 completo e no ar.**
> Última atualização: jun/2026. Este doc é o ponto de partida pra continuar.

## O que é / estratégia

Marketplace web responsivo (mobile + desktop), marca **"Kite Life"**. **Fase 0 = sem
pagamento/checkout** — vender acontece fora; a plataforma entrega descoberta + contato (chat) +
reputação. Norte: **fricção mínima, crescer base de usuários, cobrar depois.** Detalhe em
[fase-0.md](fase-0.md).

## Onde tudo vive

| Coisa | Valor |
|---|---|
| Repo GitHub | https://github.com/Paioca/kitesurf (branch `main`) · auth via deploy key SSH |
| App no ar | **https://kitesurf-web.vercel.app** (projeto Vercel `kitesurf-web`) |
| Vercel órfãos (DELETAR) | `kitesurf` e `kitesurf-api` — sobras das tentativas; o app é só o `kitesurf-web` |
| Supabase | projeto ref `vndzuhgshqdxqqbqtawn` (região us-west-2) · bucket público `listings` |
| Dir local | `/Users/felipegalli/Downloads/Kitesurf app` (monorepo) |
| Bundle de design | `/Users/felipegalli/Downloads/_kite_handoff2/an-lise-e-prototipo-web/project/*.dc.html` |

## Stack / arquitetura

- **App único Next.js 14** (App Router, consolidado) em `apps/web/` — backend e frontend juntos
  (Route Handlers em `app/api/*` + Server Components com Prisma direto). **Sem hop extra, sem CORS.**
- **Prisma** → **Supabase Postgres** (pooled 6543 runtime + direct 5432 migrations).
- **Supabase Storage** (bucket `listings`) pras fotos (EXIF/GPS removido no upload via sharp).
- **Sessão em cookie httpOnly** (`lib/session.ts`) — NÃO localStorage.
- `apps/api/` = NestJS legado, **não usado** (pode deletar; a lógica migrou pro `apps/web`).

## Variáveis de ambiente (no projeto Vercel `kitesurf-web`)

`DATABASE_URL` · `DIRECT_URL` · `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` · `SUPABASE_BUCKET=listings`
· `JWT_SECRET` · `OTP_MOCK=true`. (Local: já estão em `apps/web/.env`.)

## Rodar local

```bash
cd "/Users/felipegalli/Downloads/Kitesurf app"
npm install
cd apps/web
npm run dev            # http://localhost:3000 (usa o Supabase remoto; não precisa DB local)
# migrations/seed (apontam pro Supabase):
npm run db:migrate
npm run db:seed        # taxonomia (categorias/marcas)
```

## O que está PRONTO (jornada Fase 0 completa, testada e2e)

Todas as telas no design **Kite Life**, responsivas, no design system:

| Tela | Rota | Notas |
|---|---|---|
| Início / Busca | `/` | Server-rendered, filtros na URL, facetas (chips Tamanho/Categoria), esconde count 0 |
| Cadastro | `/entrar` | OTP telefone (mock) + foto obrigatória (upload real) + IG opcional; cookie |
| Detalhe | `/anuncio/[id]` | Galeria, ficha, vendedor, "Conversar", "Ver perfil", denunciar. Sem escrow |
| Criar | `/anunciar` | Wizard 4 passos (categoria/fotos/preço/revisão), gate de login |
| Chat | `/chat` | Lista + thread, polling 4s, ownership. Confirmação venda/compra + avaliação no thread |
| Perfil | `/perfil/[id]` | Reputação real (média, vendas, compras, ativos) + avaliações |

Backend (Route Handlers em `apps/web/app/api/`): auth (otp request/verify/me/logout),
catalog, listings (GET busca / POST criar), uploads (image/avatar), conversations + messages,
deals (confirm sale/purchase) + review, reports.

**Segurança:** cookie httpOnly · ownership checks em tudo · **rate limiting** (DB, `lib/ratelimit.ts`)
em OTP/avatar/listing/messages/report · **RLS** habilitado em todas as tabelas (anon bloqueado;
app via owner) · EXIF strip · validação zod.

## Modelo de dados (Prisma, `apps/web/prisma/schema.prisma`)

`User · OtpCode · Category · Brand · Model · Listing · ListingImage · Conversation · Message ·
Deal · Review · RateHit · Report`. Migrations: init, chat, deal_review, ratelimit_report, enable_rls.
**Fora (cortado no Fase 0):** Order/escrow, PSP, BusinessListing (parceiros).

## Design system (REGRA IMPORTANTE)

Tudo deriva do bundle Claude Design. Tokens em `apps/web/lib/tokens.ts`; primitivos em
`apps/web/components/ui.tsx` (Logo, Button, Field, TextInput, Chip, etc.) + `ListingCard`,
`Footer`, `SiteHeader`, `MobileChrome`. **NÃO inventar elemento/copy/emoji fora do `.dc.html`
correspondente** (regra na memória `kitelife-design-system`). Afordância de dev fica invisível.

## Adaptações Fase 0 aplicadas (vs design original)

- Sem "Comprar com escrow"/checkout → CTA é "Conversar"; confirmação venda/compra substitui o Pedido.
- Sem rating falso onde não há reviews; "Enviável · escrow" → só "Enviável".
- Telas Checkout/Pedido (escrow) e Negocio/CadastroLoja (parceiros) **não construídas** (fora do escopo).
- Tabs Favoritos não construída (backend é futuro).

## PENDÊNCIAS antes de lançar pra gente real (operacional)

1. **SMS real** — OTP ainda é mock (`OTP_MOCK=true`; código volta no `devCode` e auto-preenche).
   Plugar Zenvia/Twilio em `lib/otp.ts` (`send`) + `OTP_MOCK=false`.
2. **Resetar senha do banco** no Supabase (vazou no chat: `OzziOsbourne1313*`) + atualizar
   `DATABASE_URL`/`DIRECT_URL` (local e Vercel).
3. **Limpar dados de teste** — usuários/anúncios fake dos testes e2e ("Colete teste", "Leash teste").
4. **LGPD** — Política de Privacidade + Termos (link no cadastro/rodapé).
5. **Domínio próprio** + **seeding de Cumbuco** (50 anúncios — trilha operacional, ver
   [reference/seeding-plan.md](reference/seeding-plan.md)).
6. **Deletar projetos Vercel órfãos** (`kitesurf`, `kitesurf-api`) e a pasta `apps/api`.

## Como continuar

Próximos candidatos: plugar SMS real; script de seed de Cumbuco + limpar testes; telas fora do
Fase 0 se quiser (Favoritos). Fluxo de trabalho: editar em `apps/web`, `npm run build` pra validar,
commit + push → Vercel redeploya o `kitesurf-web` automático. Sempre derivar UI do design system.
