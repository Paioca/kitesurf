# DEPLOY — GitHub + Supabase + Vercel

Arquitetura na nuvem: **web (Next.js)** e **API (NestJS serverless)** em dois projetos
Vercel a partir do mesmo monorepo; **Postgres + Storage** no Supabase.

```
GitHub (1 repo)
 ├── Vercel projeto "kite-web"  ← Root Directory: apps/web
 └── Vercel projeto "kite-api"  ← Root Directory: apps/api  (serverless)
Supabase
 ├── Postgres  (DATABASE_URL + DIRECT_URL)
 └── Storage bucket "listings" (público)
```

---

## 1. GitHub

Crie um repo vazio (ex.: `kite-marketplace`) e me passe a URL, **ou** rode:

```bash
git add -A && git commit -m "MVP blocos 0-1 + deploy config"
git branch -M main
git remote add origin git@github.com:SEU_USER/kite-marketplace.git
git push -u origin main
```

## 2. Supabase

1. Crie um projeto (anote a senha do banco).
2. **Database > Connection string**: copie as duas URLs (Transaction pooler `:6543` e Direct `:5432`).
3. **Storage > New bucket**: nome `listings`, marque **Public**.
4. **Project Settings > API**: copie `Project URL` e a chave `service_role`.

### Rodar migrations + seed (do seu Mac, apontando pro Supabase)

No `apps/api/.env`, preencha `DATABASE_URL` e `DIRECT_URL` (passo 2 acima) e:

```bash
npm run db:migrate    # cria as tabelas no Supabase
npm run db:seed       # popula a taxonomia
```

## 3. Vercel — projeto da API (`kite-api`)

- **Import** o repo do GitHub → **Root Directory: `apps/api`**.
- **Environment Variables** (cole as do Supabase):

| Variável | Valor |
|---|---|
| `DATABASE_URL` | pooler `:6543` + `?pgbouncer=true` |
| `DIRECT_URL` | direct `:5432` |
| `SUPABASE_URL` | `https://PROJ.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | chave `service_role` (secreta) |
| `SUPABASE_BUCKET` | `listings` |
| `JWT_SECRET` | um segredo forte |
| `OTP_MOCK` | `true` |

- Deploy. A API fica em `https://kite-api-xxx.vercel.app` → teste `…/api/health`.

## 4. Vercel — projeto da Web (`kite-web`)

- **Import** o mesmo repo → **Root Directory: `apps/web`**.
- **Environment Variables**:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | a URL da API do passo 3 (sem `/api` no fim) |

- Deploy. Pronto: web pública consumindo a API.

---

## Checklist do que preciso de você (cole aqui no chat)

Pra eu validar a config / preencher o `.env`, me passe:

1. `DATABASE_URL` e `DIRECT_URL` do Supabase
2. `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
3. URL do repositório GitHub
4. (depois do 1º deploy da API) a URL `https://kite-api-….vercel.app`

> ⚠️ A `service_role` key é secreta — se preferir, cole só as 2 URLs do banco e configure
> as chaves de Storage direto no painel da Vercel; o código já lê das env vars.

## Notas

- **Migrations** rodam do seu Mac (ou de um CI), não no runtime serverless.
- O `vercel.json` da API já inclui os arquivos do Prisma no bundle. Se o deploy reclamar de
  Prisma Client não gerado, defina o **Build Command** do projeto da API para
  `npx prisma generate`.
- Cold start ocasional na API serverless é esperado e ok pro MVP de 1 hub.
