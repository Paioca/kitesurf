# DEPLOY — GitHub + Supabase + Vercel

App único **Next.js** (App Router + API routes) em `apps/web`, deployado num projeto
Vercel; **Postgres + Storage** no Supabase. Não há mais API separada.

```
GitHub (Paioca/kitesurf)
 └── Vercel (Root Directory: apps/web)   ← push em main → deploy automático
Supabase
 ├── Postgres  (DATABASE_URL + DIRECT_URL)
 └── Storage bucket "listings" (público)
```

---

## Fluxo de deploy

`git push origin main` → o Vercel detecta e rebuilda sozinho. Não há comando manual
de deploy. **Atenção:** o build NÃO roda migrations (ver abaixo).

## Supabase

1. **Database > Connection string**: as duas URLs (Transaction pooler `:6543` com
   `?pgbouncer=true` e Direct `:5432`).
2. **Storage > New bucket**: nome `listings`, **Public**.
3. **Project Settings > API**: `Project URL` e a chave `service_role` (secreta).

### Migrations (à mão, apontando pro Supabase)

O build da Vercel não aplica migrations. Rode do seu Mac (o `.env` local aponta pro
banco de prod) sempre que houver migration nova:

```bash
cd apps/web && npx prisma migrate deploy
```

## Variáveis de ambiente na Vercel

Setar no projeto (Settings > Environment Variables), ambiente **Production**:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | pooler `:6543` + `?pgbouncer=true` |
| `DIRECT_URL` | direct `:5432` |
| `SUPABASE_URL` | `https://PROJ.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | chave `service_role` (secreta) |
| `SUPABASE_BUCKET` | `listings` |
| `JWT_SECRET` | **forte, ≥32 chars** — o app não sobe em prod sem isso |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_SMS_FROM` | SMS do OTP (login depende disso em prod) |
| `NEXT_PUBLIC_SENTRY_DSN` | observabilidade |
| `CRON_SECRET` | protege `/api/maintenance/cleanup` (opcional) |
| `APP_URL` | base dos links de notificação (ex: `https://kitetropos.com`) |

`OTP_MOCK` e números de teste só valem fora de produção — em prod o login sempre
exige SMS real.

## Manutenção (opcional, agendável)

`POST /api/maintenance/cleanup` (header `Authorization: Bearer $CRON_SECRET`): purga
OtpCode/RateHit velhos e reporta imagens órfãs no storage (`?purgeOrphans=true` pra
apagar de fato, com carência de 24h). Pode ser ligado num cron da Vercel.

## Notas

- **Source maps do Sentry**: setar `SENTRY_AUTH_TOKEN` + `SENTRY_PROJECT` no build pra
  stack traces legíveis (sem isso o Sentry funciona, só minificado).
- Cold start ocasional em rotas serverless é esperado e ok pro estágio.
