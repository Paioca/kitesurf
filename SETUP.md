# SETUP — rodar o Bloco 0 localmente

Fundação do MVP: **monorepo npm workspaces** com `apps/api` (NestJS + Prisma) e
`apps/web` (Next.js + Tailwind). Entrega do Bloco 0: **login OTP funciona + banco de pé**.

## Pré-requisitos

- Node 20+ (você tem v25 ✅)
- Postgres rodando localmente — duas opções abaixo.

## 1. Subir o Postgres

### Opção A — Docker (recomendado)
```bash
npm run db:up        # sobe Postgres via docker-compose
```
> Precisa do Docker Desktop instalado.

### Opção B — Postgres.app (sem Docker, mais simples no Mac)
1. Baixe https://postgresapp.com → inicie.
2. Crie o banco: `createdb kite`
3. Ajuste a `DATABASE_URL` no `.env` para o seu usuário:
   `postgresql://SEU_USER@localhost:5432/kite?schema=public`

## 2. Variáveis de ambiente

```bash
cp .env.example .env
cp .env.example apps/api/.env     # Prisma lê o .env da pasta da API
```
No MVP o OTP é **mockado**: o código aparece no log da API (`OTP_MOCK=true`).

## 3. Instalar dependências

```bash
npm install          # instala todos os workspaces
```

## 4. Migrar + semear o banco

```bash
npm run db:migrate   # cria as tabelas (Prisma)
npm run db:seed      # popula taxonomia: 7 categorias + marcas/modelos
```

## 5. Rodar

```bash
npm run dev:api      # API em http://localhost:3001/api
npm run dev:web      # Web em http://localhost:3000
```
(ou `npm run dev` pra subir os dois)

## Testar o fluxo do Bloco 0

1. Abra http://localhost:3000 → categorias aparecem (banco semeado ✅).
2. Clique **Entrar** → informe um telefone com DDI (`+5585999999999`).
3. Veja o código OTP no **log da API** → cole na tela.
4. Conta nova → preenche nome/email/foto → conta criada, telefone verificado ✅.

### Health check
```bash
curl http://localhost:3001/api/health    # {"status":"ok","db":"up"}
```

---

## Onde isto está no roadmap

Bloco 0 (Semanas 1–2) de [docs/02-roadmap-12-semanas.md](docs/02-roadmap-12-semanas.md).
Próximo: **Bloco 1 — Anúncios + Busca** (criação com taxonomia, upload com strip de
EXIF/GPS, browse sem login, busca por tamanho).

## Notas de decisão (defaults adotados)

- **npm workspaces** em vez de pnpm (zero install extra).
- **Prisma** como ORM (JSONB nativo pros `attributes` por categoria).
- **PSP abstraído** — `PSP_PROVIDER=mock` até a escolha (Asaas/Pagar.me). O Bloco 3 pluga
  o provider real sem reescrever o fluxo.
