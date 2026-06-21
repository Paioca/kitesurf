# SETUP — rodar localmente

App único **Next.js** (App Router + API routes + Prisma) em `apps/web`. O banco e o
storage são o Supabase (mesmo de produção, no MVP — sem banco de staging ainda).

## Pré-requisitos

- Node 20+
- Acesso ao Supabase do projeto (as URLs do banco)

## 1. Variáveis de ambiente

```bash
cp .env.example apps/web/.env
```

Preencha `apps/web/.env` com as credenciais do Supabase (ver `.env.example`). No
local o OTP é **mockado** (`OTP_MOCK=true`): o código aparece no log, sem SMS, e os
números de teste (`+5585991000…`, `+5500…`) recebem o código direto na resposta.

> Em produção `OTP_MOCK` e números de teste são ignorados — login exige SMS real
> (Twilio).

## 2. Instalar dependências

```bash
npm install          # workspaces (só apps/web)
```

## 3. Migrar + semear o banco

```bash
cd apps/web
npm run db:deploy    # aplica migrations (prod-safe) — ou db:migrate em dev
npm run db:seed      # popula taxonomia + dados de exemplo
```

## 4. Rodar

```bash
npm run dev          # http://localhost:3000  (da raiz ou de apps/web)
```

> `next dev` roda em modo development (o JWT usa fallback de dev). Já `npm run build`
> roda como produção e **exige** `JWT_SECRET` forte no `.env` — senão trava no boot.

## Testar o fluxo de login

1. http://localhost:3000 → busca com anúncios semeados aparece.
2. **Entrar** → telefone de teste `+5585991000001` (conta de demo seedada).
3. O código OTP aparece no **log do dev server** (ou na resposta, p/ número de teste).
4. Cole o código → logado.

## Notas de decisão

- **npm workspaces** + **Prisma** (JSONB nativo pros `attributes` por categoria).
- Sem chat/pagamento na plataforma (Fase 0): contato estruturado (oferta/visita) +
  WhatsApp. `PSP_PROVIDER=mock`.
- Deploy e variáveis de produção: ver [DEPLOY.md](DEPLOY.md).
