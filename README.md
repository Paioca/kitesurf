# Kite Life — Marketplace de kitesurf

> 🚀 **Fase 0 construído e no ar:** https://kitesurf-web.vercel.app
> 👉 **Para continuar o trabalho, leia primeiro [docs/ESTADO-ATUAL.md](docs/ESTADO-ATUAL.md)** —
> estado, stack, deploy, env vars e pendências.

Marketplace web (mobile-first) especializado em compra e venda de equipamento de kitesurf,
focado nos hubs brasileiros, começando por **Cumbuco**.

> **Não é um app nativo.** É web responsivo com cara de mobile (PWA). Ver [architecture](docs/03-architecture.md).

## Objetivo do negócio (régua honesta)

Lifestyle business. **Meta: o projeto se pagar + gerar ~R$5k/mês (R$60k/ano) de lucro.**
Não é venture-scale. Toda decisão de escopo serve a essa meta, não a "crescer pra valuation".

## Os 3 furos que este MVP resolve (e que classificados/grupo de Facebook não resolvem)

1. **Golpe** → pagamento com **escrow** (dinheiro retido até o comprador confirmar). O escrow é o antifraude, não KYC.
2. **Anúncio bagunçado** → **taxonomia controlada** (marca/modelo/ano/tamanho em dropdown) + fotos guiadas.
3. **Falta de filtro** → busca por **tamanho de kite** e categoria — o "aha" que o Facebook não tem.

## Como ler esta documentação

Ordem sugerida:

1. [00-vision](docs/00-vision.md) — visão, meta, não-objetivos
2. [01-mvp-scope](docs/01-mvp-scope.md) — o que entra e o que NÃO entra (ruthless)
3. [02-roadmap-12-semanas](docs/02-roadmap-12-semanas.md) — plano semana a semana
4. [03-architecture](docs/03-architecture.md) — stack e infra
5. [04-data-model](docs/04-data-model.md) — entidades
6. [05-payments-escrow](docs/05-payments-escrow.md) — **leia com atenção; é o módulo mais pesado**
7. [06-trust-safety](docs/06-trust-safety.md) — antifraude
8. [07-monetization](docs/07-monetization.md) — take rate + anúncios locais

Depois: `docs/modules/` (unidades de build), `docs/user-flows/` (fluxos), `docs/reference/` (taxonomia, seeding, LGPD).

## Princípios de produto (não negociáveis)

1. **UX First** — navegar e buscar sem login. Pedir telefone só no chat ou ao anunciar.
2. **Design First** — o app precisa comunicar confiança visualmente.
3. **Trust & Safety First** — escrow + telefone + Instagram + reviews pagas.
4. **Marketplace Liquidity First** — semear oferta à mão em 1 hub antes de qualquer usuário.
5. **MVP First** — toda feature que não aumenta transação ou confiança fica fora.

## Stack resumida

NextJS · Tailwind · PWA · NodeJS/NestJS · PostgreSQL · S3/Cloudflare R2 · PSP com split/escrow (Asaas / Pagar.me / Mercado Pago Marketplace / Stripe Connect).

> **Regra de ouro de pagamento:** você NUNCA toca no dinheiro. O PSP segura, faz o split, lida com PIX MED e chargeback. Ver [05-payments-escrow](docs/05-payments-escrow.md).
