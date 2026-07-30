# Runbook — fundir marca legada "Core" em "CORE" (PROD)

Corrige a duplicata de marca `Core` (legada, vazia) vs `CORE` (canônica) no banco de
**produção**. Já validado em staging (fusão + seed 2× limpo). Script: `apps/web/prisma/merge-brand-core.mjs`.

> **Quem executa:** o dono. Agente não roda contra prod.
> **Pré-requisito:** backup do Supabase de prod confirmado (débito #4 do plano). Sem backup, não rode.

## Contexto

- PROD = Supabase ref **`oycxkofylcofvvditjeg`** (São Paulo). STAGING = `otuqhjatkdtmazvfnjrw`.
- O script usa `prisma.$transaction` **interativa** → precisa de conexão **de sessão (porta 5432, `DIRECT_URL`)**, nunca o pooler pgbouncer (6543, transaction-mode) — advisory/interactive transaction quebra no pooler.
- Idempotente: se `Core` não existe, é no-op. Reaponta `Model.brandId`, `Listing.brandId`, `Listing.barraBrandId` de `Core` → `CORE`, trata colisão do unique `Model(brandId,name)`, apaga `Core`. Loga os IDs alterados.

## 1. Pré-check (guardar a saída)

Com o ambiente de PROD carregado (via `vercel env pull` num arquivo temporário, ou export manual — **use a `DIRECT_URL`, porta 5432, como `DATABASE_URL` do script**):

```bash
cd apps/web
# GUARD: confirme que é PROD e porta 5432 antes de qualquer coisa
node -r dotenv/config -e "const u=process.env.DATABASE_URL||''; console.log('ref', (u.match(/postgres\.([a-z0-9]+)/)||[])[1], 'porta', (u.match(/:(\d+)\//)||[])[1]);"
# esperado: ref oycxkofylcofvvditjeg  porta 5432
```

Estado atual das marcas (para comparar depois):

```bash
node -r dotenv/config --input-type=module -e "import {PrismaClient} from '@prisma/client'; const p=new PrismaClient(); const bs=await p.brand.findMany({where:{name:{in:['Core','CORE']}},select:{id:true,name:true}}); for(const b of bs){const m=await p.model.count({where:{brandId:b.id}}); const l1=await p.listing.count({where:{brandId:b.id}}); const l2=await p.listing.count({where:{barraBrandId:b.id}}); console.log(b.name, b.id, 'models='+m, 'listBrand='+l1, 'listBarra='+l2);} await p.\$disconnect();"
```

## 2. Executar

```bash
cd apps/web
node -r dotenv/config prisma/merge-brand-core.mjs
```

**Guarde a saída** — ela imprime os IDs da marca legada removida, da canônica, dos modelos
reapontados/removidos e a contagem de anúncios reapontados (necessário para reversão manual).

## 3. Verificação pós

```bash
# deve existir só CORE, zero Core:
node -r dotenv/config --input-type=module -e "import {PrismaClient} from '@prisma/client'; const p=new PrismaClient(); const bs=await p.brand.findMany({where:{name:{in:['Core','CORE']}},select:{id:true,name:true}}); console.log(bs); await p.\$disconnect();"
# rodar o script de novo → 'Nada a fundir ... (no-op idempotente)'
node -r dotenv/config prisma/merge-brand-core.mjs
```

Smoke manual: abrir a busca/detalhe no site de prod e confirmar que anúncios da marca CORE
aparecem normalmente.

## 4. Rollback

- A fusão é reversível pelos IDs logados no passo 2: recriar a marca `Core` e reapontar de
  volta os modelos/anúncios listados. Na prática raramente necessário (a legada é vazia/quase).
- Pior caso: restore do backup confirmado no pré-requisito.

## Depois

O fix no `seed.ts` (e `seed-journey.ts`) impede a recorrência: seeds futuros não recriam `Core`.
Follow-up opcional (fase T4, precisa de migration): unique **case-insensitive** em `Brand.name`
para blindar de vez contra duplicata por caixa.
