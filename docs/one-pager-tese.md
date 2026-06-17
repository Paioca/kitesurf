# Kite Marketplace — Tese (one-pager)

*Para alinhamento com sócio e contador.*

---

## O que é

Marketplace web (mobile-first, sem app nativo) especializado em **compra e venda de equipamento
de kitesurf**, com pagamento protegido por **escrow**. Começa local, em **Cumbuco**, e expande
por hub (Taíba, Jeri).

## O problema

Hoje a negociação acontece em grupos de Facebook, WhatsApp e OLX: **golpe de PIX, anúncio
bagunçado, sem filtro, sem reputação real.** Equipamento de kite é caro e fácil de revender —
o medo de golpe trava o mercado.

## O diferencial (3 coisas que o Facebook não faz)

1. **Pagamento com escrow** — dinheiro fica retido até o comprador confirmar o recebimento. Mata o golpe do PIX. *É o antifraude — não KYC.*
2. **Anúncios padronizados** — marca/modelo/ano/tamanho em dropdown (taxonomia controlada).
3. **Busca por tamanho de kite** — o filtro que ninguém tem.

## Meta de negócio (régua honesta)

**Lifestyle business: o projeto se pagar + ~R$5k/mês (R$60k/ano) de lucro.** Não é venture-scale.
Toda decisão de escopo serve a essa meta.

## De onde vem o dinheiro

| Fonte | Quando chega | Potencial |
|---|---|---|
| **Anúncios de negócios locais** (escola, pousada, café) | **Rápido** — não depende de transação | ~R$60k/ano recorrente, margem alta |
| **Take rate** transacional (8–12% acessório · 3–5% gear grande) | Cresce com a liquidez | Complementar |

> Insight central: o "ecossistema" (aula/pousada/café) **paga a conta primeiro** — antes do
> marketplace de gear esquentar.

## Dois marketplaces dentro de um

- **Acessórios enviáveis** (R$80–500, alta frequência) → pagamento online + escrow → motor de hábito.
- **Equipamento grande** (R$1,5–8k, baixa frequência) → presencial/local → ticket alto.

## MVP — 3 meses, 1 hub (Cumbuco)

Cadastro com telefone verificado · anúncio padronizado · busca por tamanho · chat interno ·
**pagamento com escrow** · reputação atrelada a venda paga · selo de negócio local.
Seeding manual de 50 anúncios + 3 negócios pagantes roda em paralelo desde a semana 1.

**Fora do MVP (de propósito):** KYC documental, app nativo, frete automatizado, passaporte de
equipamento, payout internacional, painel admin completo.

## Pontos para o contador / sócio (atenção)

1. **O dinheiro nunca passa pela nossa conta.** Usamos PSP com split/escrow (Asaas, Pagar.me,
   Mercado Pago, Stripe) → evita virar instituição de pagamento (risco BACEN) e offload de
   PCI/chargeback/PIX MED.
2. **Nota fiscal sobre a comissão** (o `fee`) é responsabilidade nossa — precisa de contador desde o início.
3. **Onboarding no PSP demora** (eles fazem KYC sobre a empresa) — iniciar cedo.
4. **LGPD mínimo:** coletamos o mínimo (telefone, email, foto); CPF só opcional pra payout;
   sem documento/selfie. Política de privacidade + termos no launch.

## Principais riscos

- **Cold-start / liquidez** → mitigado por seeding manual em 1 hub só.
- **Disintermediação pro WhatsApp** no gear grande → aceito; escrow segura o acessório enviável.
- **Pagamento estoura o cronograma** → se atrasar, lança vitrine+chat e liga escrow logo depois.
- **Nicho pequeno** → ok, porque a meta é R$60k/ano, não escala de VC.

## Veredito

Para a meta declarada (lifestyle, R$60k/ano), com disciplina de escopo e o guardrail de PSP:
**vale fazer.** Score geral ~6,5–7/10 nessa régua.

## O pedido

Validar: (1) constituição/CNPJ e enquadramento fiscal da comissão com o contador; (2) escolha
do PSP; (3) orçamento de build de 3 meses. Depois, começar pelos Blocos 0–2 enquanto o seeding
de Cumbuco roda em paralelo.
