# Prontidão para lançamento — Kitetropos

Estado em **2026-06-29**, após a sessão de hardening pré-lançamento. Documento durável pra você/o time: o que está pronto, o que resta, e em que ordem.

## Veredito

🟢 **GO para beta privado profissional.** O app é maduro e bem construído. A frente de segurança fechou, o SEO entrou, e a base (escala, erros, observabilidade) já era sólida. **Nenhum bloqueador de código.** O que resta é operacional (painel) ou foi adiado de propósito — nada disso trava o beta.

> Achado-chave da sessão: cada "gap" investigado já estava coberto (OG, escala, páginas de erro). Isso é sinal de um app maduro — você está mais pronto que a maioria dos apps que lançam. O maior ganho agora **não é mais código** — é soltar o beta e deixar o tráfego real guiar o que afinar.

## ✅ Feito

### Segurança (fechado em 28-29/jun)
- **Rotação completa dos 3 segredos (29/jun):** JWT, chave de serviço Supabase (migrada pro sistema novo `sb_secret_`, legacy JWT-based **desativada**), senha do Postgres. Fonte da verdade = Vercel env vars.
- **`npm audit`:** a "crítica" (vitest) e a "alta" (vite) eram toolchain de teste, não-exploráveis; bump do vitest 2→4 → **0 crítica / 0 alta**. Restam 2 moderadas (`postcss` dentro do Next, não-explorável, sem fix seguro).
- **Da auditoria anterior:** 0 P0/P1, sem IDOR (36 rotas), PII protegida, CSP estrita com nonce, EXIF removido, rate-limit nas mutações.

### Descoberta / SEO (PR #28)
- `robots.txt`, `sitemap.xml` (anúncios ativos + perfis), JSON-LD **Product/Offer** (rich results) + **Organization/WebSite**. O OG/unfurl já existia.

### Produto / UX (esta sessão)
- Home mobile enxuta — anúncios na dobra (#24) · botão **Compartilhar** no anúncio (#25) · filtros duplicados desktop + label microfuros (#22) · cauda P2 (#16) · pré-lançamento: rate-limit/flicker/teclado (#15).

### Base já madura (verificado, não precisou mexer)
- **Escala:** `connection_limit=3` + `pool_timeout=20` (`db-url.ts`); cache de facetas (TTL 30s + coalescência); cache de reputação; rotas quentes serializadas (#19); APIs de catálogo com CDN cache.
- **Erros:** páginas on-brand (404, error 500, global-error, loading).
- **Observabilidade:** Sentry + 3 crons monitorados (#18, flush dos check-ins #21).

## ⏳ Resta (nada bloqueia o beta)

### Operacional (você, no painel)
- Ligar **alerta de cron-parado** no Sentry (os monitores já registraram pós-#18).
- Confirmar **backup do Supabase** + testar **1 restore**.

### Adiado de propósito
- **Higiene de dados:** marca `Core`/`CORE` duplicada (trava o `seed.ts`) + drift de migrations. Cirurgia em prod — fazer com fôlego. Detalhes: `kitetropos-prod-db-state` (memória).
- **`.env.prod` stale:** tem a senha antiga do banco + a service key morta. **NÃO rodar `source .env.prod`** pra script de prod até atualizar/apagar (re-dispara o circuit breaker do Supabase).
- **`JWT_SECRET` legado no Vercel:** apagar ~30 dias após a rotação.

### Futuro (escala real, pós-beta)
- Teste de carga formal (preview→staging + token de bypass — não bater na prod).
- KV (Redis) nos caches de processo (só compensa em alta concorrência).
- Anti-scrape (lançamento público).
- Cache do detalhe do anúncio (só se o beta revelar hotspot).

## Ordem recomendada
1. **Soltar o beta privado** — o app está pronto.
2. **Acompanhar o Sentry** (latência + erros de pool) sob tráfego real.
3. **Em paralelo:** alerta de cron + confirmar backup.
4. **Pós-beta / conforme crescer:** higiene de dados, `.env.prod`, e otimizações de escala guiadas por **dado real**, não no chute.

## Referências
- Auditoria: `docs/AUDIT-RUN-CLAUDE-2026-06-28.md`
- Resumo dos PRs base: `docs/RESUMO-EXECUTIVO-2026-06-28.md`
- Rotação: `docs/ROTACAO-CHECKLIST.md`
- PRs desta sessão: #15, #16, #18, #19, #21, #22, #24, #25, #26, #28.
