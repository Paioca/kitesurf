# 03 — Arquitetura

## Princípio: web responsivo com cara de mobile. NÃO app nativo.

PWA (instalável, push web). Toda a UX é desenhada mobile-first; desktop é consequência.

## Frontend

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS**
- **PWA** (manifest + service worker; push web via Web Push API)
- **i18n PT/EN** desde o MVP (next-intl ou equivalente)
- Mobile-first sempre. Componentes pensados pro polegar.

## Backend

- **Node.js + NestJS** (modular: um módulo por unidade de `docs/modules/`)
- REST no MVP (GraphQL é overkill aqui)
- Auth via JWT + OTP

## Banco

- **PostgreSQL**
- Atributos por categoria (kite tem tamanho em m², trapézio tem tamanho de cinta) → **JSONB com schema validado por categoria** (não criar tabela por categoria). Ver [04](04-data-model.md).

## Arquivos / imagens

- **S3** ou **Cloudflare R2**
- Upload server-side com: validação de tipo/tamanho, **strip de EXIF/GPS** (segurança do vendedor — anti-roubo), reprocessamento (resize/thumbnail).

## Chat

- **MVP: polling** (intervalo curto) — simples, suficiente pra volume inicial.
- Evoluir pra **WebSocket / Socket.IO** só quando o volume justificar. Não comece sofisticado.

## Pagamento — via PSP, nunca direto

> **Regra de ouro: o dinheiro NUNCA passa pela sua conta.** Você é marketplace, não instituição de pagamento.

PSP com split/escrow nativo de marketplace. Candidatos:

| PSP | Notas |
|---|---|
| **Asaas** | Split, escrow/saldo retido, PIX, BR-friendly, onboarding simples. |
| **Pagar.me** | Split maduro, marketplace, PIX + cartão. |
| **Mercado Pago Marketplace** | Split, alcance, mas regras próprias. |
| **Stripe Connect** | Ótimo pra cartão internacional (gringo), PIX mais limitado no BR. |

Decisão de PSP é o **primeiro spike técnico do Bloco 3**. Ver [05](05-payments-escrow.md).

O PSP cuida de: PCI, split automático da sua comissão, **PIX MED**, chargeback, payout pro vendedor.

## Notificações

- **Push web** (PWA) + **Email** (provider transacional: Resend / SES / Postmark)
- In-app (badge/contador)

## Infra / deploy

- Frontend: Vercel (Next) ou similar.
- Backend + Postgres: Railway / Render / Fly.io / AWS — escolher pelo que o time domina. Não otimizar custo de infra num MVP de 1 hub.
- Observabilidade mínima: logs estruturados + Sentry.

## Segurança (mínimo viável — detalhe em 06)

- **Ownership checks** em tudo: só o dono edita/apaga o próprio anúncio; conversa só visível aos 2 participantes. (Falha de autorização é o bug nº 1 de marketplace júnior.)
- Rate limiting em cadastro, mensagens e criação de anúncio.
- Strip de EXIF/GPS nas imagens.
- Hash de credenciais; preferir OTP/magic link a senha.

## Admin no MVP

Sem painel CRUD. **SQL client + scripts** para: banir usuário/telefone, remover anúncio, ver denúncias, resolver disputa. Painel só quando o volume doer. Ver [admin](modules/admin.md).
