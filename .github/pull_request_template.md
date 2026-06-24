## O quê

<!-- 1-2 linhas: o que esta PR muda e por quê -->

## Alvo

- [ ] Esta PR vai para `staging` (feature) — não para `main` direto
- [ ] É hotfix de produção (sai de `main`, volta pra `staging` depois)

## Banco de dados

- [ ] Sem mudança de schema
- [ ] Tem migration nova em `apps/web/prisma/migrations/`
- [ ] A migration é **retrocompatível** (expand → migrate → contract; nada que quebre o código atual durante o rollout)
- [ ] Sou o **único** com mudança de banco em andamento neste ciclo

## Verificação

- [ ] CI verde (tsc + vitest + build + lint)
- [ ] Testado no Preview da Vercel (banco de staging, nunca prod)
- [ ] Sem segredo commitado (`.env`, chaves, tokens)

## Notas de deploy

<!-- Ordem de aplicação se houver migration + código com ordem oposta; passos manuais; rollback -->
