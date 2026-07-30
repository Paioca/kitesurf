# Runbook — Migrar as fotos do Supabase Storage para o Cloudflare R2

**Por quê:** o free do Supabase tem teto de egress (5 GB/mês). As fotos são servidas
direto pro browser, então o tráfego estourava a cota e as imagens sumiam do site. O
**Cloudflare R2 tem egress zero** (não cobra saída) + 10 GB de storage grátis — o problema
de custo/quebra deixa de existir. O banco (Postgres) continua no Supabase; só as **imagens**
saem de lá.

O código já aceita os dois hosts (R2 novo + Supabase legado) durante a transição, então
nada quebra no meio.

---

## Parte 1 — Criar o bucket no Cloudflare (só painel, ~10 min)

1. Criar conta em cloudflare.com (grátis) e abrir **R2** no menu. Ativar R2 (pede cartão
   como verificação, mas o uso fica dentro do free — egress zero, 10 GB storage grátis).
2. **Create bucket** → nome `listings` (ou outro; se mudar, setar `R2_BUCKET`).
3. Deixar o bucket **público** por um destes caminhos:
   - **Recomendado — domínio custom:** R2 > bucket > *Settings* > *Custom Domains* >
     conectar `img.kitetropos.com` (a Cloudflare cria o DNS se o domínio estiver nela).
     A base pública vira `https://img.kitetropos.com`.
   - **Rápido — r2.dev:** *Settings* > *Public access* > ativar `r2.dev`. A base vira
     `https://pub-XXХХ.r2.dev` (funciona, mas é rate-limited; ok pro beta).
4. **Manage API Tokens** (dentro de R2) > criar token com permissão *Object Read & Write*
   no bucket. Anotar: **Account ID**, **Access Key ID**, **Secret Access Key**.

## Parte 2 — Setar as env vars

**Na Vercel (Production + Preview)** e no seu `.env.prod` local pra rodar a migração:

```
R2_ACCOUNT_ID=<account id>
R2_ACCESS_KEY_ID=<access key id>
R2_SECRET_ACCESS_KEY=<secret access key>
R2_BUCKET=listings
R2_PUBLIC_BASE_URL=https://img.kitetropos.com   # ou o https://pub-xxxx.r2.dev, SEM barra no fim
```

Manter `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (a migração lê deles; podem sair depois).

## Parte 3 — As fotos ANTIGAS

> **Contexto (2026-07-30):** o projeto Supabase está `restricted` por egress e **bloqueia
> até a API com service_role** — não dá pra baixar as fotos de lá antes do reset do ciclo
> (20/ago) sem upgrade pago. Storage total = ~55 MB.

Duas formas de recuperar as fotos antigas:

- **Re-upload manual (recomendado no nosso caso):** como o volume é pequeno, basta editar
  cada anúncio no site (já com o código R2 no ar) e **re-subir as fotos** — elas vão direto
  pro R2. Não depende do Supabase nem de esperar 20/ago.
- **Migração em massa (só se um dia precisar):** com o Supabase servindo (após 20/ago ou com
  upgrade), rodar o script local — precisa das credenciais de prod num `.env.migration`:

```bash
cd apps/web
node --env-file=.env.migration scripts/migrate-images-to-r2.mjs            # dry-run
node --env-file=.env.migration scripts/migrate-images-to-r2.mjs --apply    # executa (idempotente)
```

## Parte 4 — Deploy e conferência

1. Merge do PR `feat/r2-image-storage` na `main` (deploy). **Antes:** validar o Vercel
   Preview no navegador (console sem erro de CSP — regra do projeto).
2. Abrir kitetropos.com: as fotos carregam do host do R2 (ver *Network* — `img.kitetropos.com`).
3. Publicar um anúncio novo com foto → confirmar que a URL salva já é do R2.

## Parte 5 — Depois de confirmado (limpeza opcional)

- Apagar o bucket `listings` do Supabase (libera o storage lá).
- Remover do código o host legado do Supabase na allowlist (`isOfficialImageUrl`,
  `next.config.mjs`) e as env `SUPABASE_*` de storage — quando tiver certeza que nenhuma
  URL antiga sobrou no banco.

---

**Rollback:** enquanto o bucket do Supabase existir e as env `SUPABASE_*` estiverem setadas,
reverter o deploy volta a servir as fotos antigas. A reescrita de URL no banco é o passo
menos reversível — por isso rodar o dry-run e conferir as contagens antes do `--apply`.
