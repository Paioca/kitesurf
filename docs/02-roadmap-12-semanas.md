# 02 — Roadmap (12 semanas)

3 meses ≈ 12 semanas. Plano semana a semana. **Seeding manual roda em paralelo desde a semana 1** —
liquidez não espera o código ficar pronto.

> Regra: ao fim de cada bloco existe algo navegável. Nada de "integra tudo no fim".

---

## Bloco 0 — Fundação (Semanas 1–2)

- Setup do repo, NextJS + Tailwind + PWA shell, NestJS, PostgreSQL, S3/R2.
- Modelo de dados base ([04](04-data-model.md)): `User`, `Listing`, `ListingImage`, `Category`, `Brand`, `Model`.
- Auth telefone OTP (provider de SMS) + email. i18n PT/EN scaffold.
- **Seeding (paralelo):** mapear 50 anúncios reais de Cumbuco em planilha (grupos de FB/IG). Fotografar/coletar.

**Entrega:** login funciona; banco de pé; lista de seeding pronta.

---

## Bloco 1 — Anúncios + Busca (Semanas 3–5)

- Criação de anúncio com **taxonomia controlada** + upload de fotos guiadas (strip de EXIF/GPS).
- Status do anúncio: `draft / active / paused / sold / archived`.
- Browse + busca por categoria / tamanho / cidade, **sem login**.
- Cards de anúncio e página de detalhe (design de confiança — ver [03](03-architecture.md) e referências).
- **Seeding (paralelo):** publicar os 50 anúncios reais no ambiente de staging.

**Entrega:** dá pra navegar um marketplace cheio (semeado) e filtrar por tamanho.

---

## Bloco 2 — Chat + Notificações (Semanas 6–7)

- Chat interno (texto + imagem), polling no MVP.
- Conversa atrelada a anúncio: 1 comprador + 1 vendedor.
- Notificações: push web + email para nova mensagem.
- Report/denúncia (botão → fila).

**Entrega:** comprador conversa com vendedor e é notificado.

---

## Bloco 3 — Pagamento + Escrow (Semanas 8–10) ⚠️ bloco mais pesado

- Integração com PSP (split/escrow) — ver [05](05-payments-escrow.md).
- Fluxo de compra de **acessório enviável**: checkout PIX/cartão → escrow → vendedor informa rastreio → comprador confirma → liberação + split.
- Janela de auto-liberação (X dias após "enviado").
- Estado de disputa básico (manual). Ver [user-flows/dispute](user-flows/dispute.md).
- "Marcar como vendido" para equipamento grande (local, sem pagamento online obrigatório).

**Entrega:** compra real de acessório paga e liberada via escrow.

---

## Bloco 4 — Reputação + Negócios locais + Polish (Semanas 11–12)

- Review pós-transação-paga (1 estrela + comentário, atrelada a `order_id`).
- Selo/anúncio de **negócio local** (escola, pousada) — primeira receita.
- Limpeza automática (ping de 30 dias).
- Empty states, microcopy de confiança, LGPD mínimo (política + base legal). Ver [reference/lgpd](reference/lgpd.md).
- QA, hardening de autorização (ownership checks), rate limiting.

**Entrega:** MVP completo conforme [definição de pronto](01-mvp-scope.md).

---

## Seeding — trilha paralela (semanas 1–12)

Sem isso o MVP morre no empty state. Detalhe em [reference/seeding-plan](reference/seeding-plan.md).

- Semanas 1–2: mapear 50 anúncios + 5 escolas/pousadas de Cumbuco.
- Semanas 3–5: publicar oferta semeada.
- Semanas 6–10: recrutar 10–20 vendedores reais beta + 3 negócios locais pagantes.
- Semanas 11–12: soft launch no hub (grupos de WhatsApp/IG de Cumbuco).

## Riscos do cronograma

- **Bloco 3 (pagamento) é o que pode estourar.** Se atrasar, lance os Blocos 0–2 como "vitrine + chat" e ative escrow logo depois. Não atrase o launch inteiro por causa do pagamento.
- Aprovação de conta no PSP (KYC do PSP sobre você/empresa) pode levar dias — **inicie na Semana 6**, não na 8.
