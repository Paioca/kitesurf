# Status — Migração de fotos para Cloudflare R2 (2026-07-30)

Contexto completo e passo a passo em [RUNBOOK-MIGRACAO-IMAGENS-R2.md](./RUNBOOK-MIGRACAO-IMAGENS-R2.md).

## O que foi feito

- **Storage de fotos migrado do Supabase Storage → Cloudflare R2** (egress zero). Código em
  produção (PR #58, merge na `main`). Uploads novos vão pro R2; `isOfficialImageUrl` e o
  `next.config` aceitam host do R2 (atual) e do Supabase (legado) durante a transição.
- **Infra R2 pronta:** bucket `listings`, acesso público via r2.dev
  (`pub-5736769b3fe04646909d43a8d4e9e431.r2.dev`), chaves S3 e as 5 env `R2_*` na Vercel.
- **Fotos antigas:** ficaram presas no Supabase restrito (egress estourado; 402 até o reset
  do ciclo em 20/ago). Recuperação grátis inviável (sem cache no Wayback/Google/CDN; API
  bloqueada até com service_role). **Decisão:** não recuperar — os 11 anúncios ativos foram
  removidos (soft-delete via SQL, replicando a ação "Remover" da moderação) e os vendedores
  re-postam (foto nova já nasce no R2).

## O que falta (operacional, lado do dono)

- Avisar os vendedores pra re-postarem os anúncios.
- Ao re-postar o 1º, conferir no navegador que a foto aparece (host `r2.dev`) = R2 redondo
  ponta a ponta.

## Limpeza futura (depois de confirmado / após 20/ago)

- Apagar o bucket `listings` do Supabase (libera storage lá).
- Remover o host legado do Supabase da allowlist (`isOfficialImageUrl`, `next.config.mjs`) e
  as env `SUPABASE_*` de storage, quando não houver mais URL antiga no banco.

## E o problema de custo?

- **Egress das fotos (o que quebrava tudo): resolvido.** No R2 o tráfego de saída é gratuito
  e ilimitado — foto nunca mais cai por cota, independente de acesso ou bot.
- **Restrição atual do Supabase:** continua até o ciclo resetar (20/ago), porque o egress
  deste ciclo já foi queimado. O banco (Postgres) segue servindo; como as fotos não saem
  mais de lá, o egress do Supabase para de crescer.
- **Supabase free daqui pra frente:** ainda tem limites (egress ~5 GB/mês de API/banco,
  storage 1 GB, DB 500 MB). Sem as imagens pesando no egress, deve ficar folgado no grátis.
  Vigiar o egress de banco se o tráfego/bots dispararem.
- **Custo de crawler na Vercel** é um vetor SEPARADO (função force-dynamic + bots), já
  mitigado por robots restritivo + Attack Challenge Mode. A migração pro R2 não muda isso.
