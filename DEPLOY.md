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

Setar no projeto (Settings > Environment Variables), ambiente **Production** **e**
**Preview** quando aplicável:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | pooler `:6543` + `?pgbouncer=true&connection_limit=1` (ver nota Prisma serverless abaixo) |
| `DIRECT_URL` | direct `:5432` **sem** `connection_limit` (só pra migration) |
| `SUPABASE_URL` | `https://PROJ.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | chave `service_role` (secreta) |
| `SUPABASE_BUCKET` | `listings` |
| `JWT_SECRET` | **forte, ≥32 chars** — o app não sobe em prod sem isso |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_SMS_FROM` | SMS do OTP (login depende disso em prod) |
| `RESEND_API_KEY` / `EMAIL_FROM` | e-mails de verificação/recuperação |
| `NEXT_PUBLIC_SENTRY_DSN` | observabilidade |
| `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` | release do Sentry no client; linkar ao system env `VERCEL_GIT_COMMIT_SHA` |
| `CRON_SECRET` | **obrigatório** — protege `/api/cron/*`; a Vercel injeta `Authorization: Bearer $CRON_SECRET` automaticamente nos crons quando esta env está setada |
| `APP_URL` | base dos links de notificação (ex: `https://kitetropos.com`) |
| `JWT_SECRETS` | CSV de chaves do JWT (primeira assina, todas verificam) — suporta rotação sem deslogar usuários. Ver [SECRETS.md](docs/SECRETS.md). Aceita `JWT_SECRET` legado se essa não existir. |
| `LOG_LEVEL` | (opcional) `debug` \| `info` \| `warn` \| `error`. Default: `info` em prod, `debug` em dev. |

`OTP_MOCK` e números de teste só valem fora de produção — em prod o login sempre
exige SMS real.

### Nota: `connection_limit=1` em DATABASE_URL (Prisma + Vercel serverless)

A Vercel sobe cada handler como um lambda independente; cada warm function instancia
o seu próprio pool do Prisma. Em pico, dezenas de lambdas × pool padrão estouram os
slots do pgbouncer transaction-mode e a app começa a devolver `Timed out fetching a
connection`. Padronize `?pgbouncer=true&connection_limit=1` no `DATABASE_URL`; o
`DIRECT_URL` (usado só pra `prisma migrate`) NÃO leva esse parâmetro.

## Crons (Vercel)

Definidos em `apps/web/vercel.json`. Ambos POST autenticados via `Authorization:
Bearer $CRON_SECRET` (a Vercel injeta o header automaticamente quando a env está
setada). Schedule em UTC, lembrar que `0 3` = 00:00 BRT no horário-padrão.

| Path | Schedule (UTC) | O que faz |
|---|---|---|
| `/api/cron/close-unconfirmed` | `0 3 * * *` | Encerra deals `seller_confirmed` com prazo de 72h vencido |
| `/api/cron/cleanup` | `0 4 * * *` | Purga OtpCode/EmailToken/RateHit velhos + apaga imagens órfãs no Storage (24h grace) |

Cada execução grava uma linha em `JobRun` (status, duração, resultado, erro), e
envia `Sentry.captureCheckIn` pro monitor slug `job-<nome>`. Lock por
`pg_try_advisory_lock` previne execução concorrente — se uma segunda invocação cair
em cima de outra rodando, ela retorna `{ok:true, skipped:true}` sem reprocessar.

Hobby plan da Vercel limita crons a 2 schedules diários. Já estamos em 2 — para
adicionar outro (ex: drain de outbox no Sprint 3), o projeto **precisa estar em Pro**.

## Logs estruturados (Pino → stdout → Vercel Log Drain → Better Stack)

A app escreve **logs JSON estruturados** via Pino em stdout (`lib/logger.ts`). Cada
linha carrega `service`, `env`, `release`, `correlationId` (injetado pelo middleware
em toda request) e os campos específicos do evento. PII e tokens são redatados pelo
próprio Pino antes da serialização.

Para reter e buscar (a retenção nativa da Vercel é curta), configurar **Log Drain**:

1. **Better Stack → Telemetry** → cria um **Source** do tipo "HTTP" ou "Vercel".
2. Copia a URL/token do source.
3. Vercel → seu projeto → Settings → **Log Drains** → **Add Log Drain**:
   - Sources: **Functions** (e opcionalmente **Edge**)
   - Delivery format: **JSON** (o Pino já manda JSON, então a Vercel só repassa)
   - URL: cola a URL do source do Better Stack
4. Save. Vai começar a popular o Telemetry em ~1 min.

Query útil no Better Stack: `correlationId="<id-do-cabecalho>"` reconstrói todos os
logs de uma única request. O cliente recebe esse id em `x-correlation-id` no
response e pode reportar em ticket de suporte.

> Log Drains exigem **Vercel Pro**.

## Monitor externo de uptime (login)

Há uma probe pública em `GET /api/health/login` que checa DB + Twilio (componentes
de que o fluxo de login DEPENDE) e devolve 200 ou 503. Configure um monitor externo
(Better Stack / UptimeRobot / Pingdom) batendo nesse endpoint a cada 1 min com
alerta no Slack/e-mail. Sem isso, o SPOF de Twilio só aparece quando o usuário
reclama. Uma resposta de exemplo verde:

```json
{ "ok": true, "components": {
  "db":     { "ok": true, "latencyMs": 12 },
  "twilio": { "ok": true, "latencyMs": 230 }
}}
```

## Manutenção on-demand (legado)

O endpoint legado `POST /api/maintenance/cleanup` continua funcionando (mesma auth
por `CRON_SECRET`) — útil pra trigger manual sem esperar o cron. Em produção,
prefira o cron automático.

## Notas

- **Source maps do Sentry**: setar `SENTRY_AUTH_TOKEN` + `SENTRY_PROJECT` no build pra
  stack traces legíveis (sem isso o Sentry funciona, só minificado).
- Cold start ocasional em rotas serverless é esperado e ok pro estágio.
