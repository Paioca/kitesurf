# Fase 0 — Lançamento rápido (vitrine + confiança, sem pagamento)

> **Norte:** fricção mínima + crescer base de usuários em Cumbuco. **Monetização vem depois**
> ("vou cobrar depois"). Toda decisão de escopo serve a *mais cadastros e mais anúncios*, não a receita agora.

Substitui, para o Fase 0, o plano de pagamento/escrow dos docs originais. O escrow/PSP
**não** é construído agora — é o plano B já previsto na doc ("lança vitrine + chat, liga escrow depois").

---

## 1. Escopo

### Entra
- **Busca** (descoberta + filtros) — sem login
- **Criar anúncio** (taxonomia controlada + fotos guiadas)
- **Anúncio** (detalhe + perfil do vendedor)
- **Home** (Kite Life)
- **Entrar** (OTP telefone + email)
- **Chat interno** (comprador ↔ vendedor)
- **Confirmação de venda + compra** → anúncio vira `sold` + **habilita avaliação**
- **Perfil** do vendedor (público)
- **Favoritos**

### Fica fora (de propósito)
- ❌ Checkout / **PIX** / **escrow** / **PSP** — não passa dinheiro pela plataforma
- ❌ Parceiros / negócios locais (telas Negocio, CadastroLoja, Business Ads) — *é a monetização → depois*
- ❌ Login social (Google) — só OTP no Fase 0 (telefone = trava antifake)
- ❌ Frete automatizado, payout, KYC documental

### Marca
"Kite Marketplace" no código por ora. Troca para **"Kite Life"** (design) é mudança de 1 ponto
(header + metadata + textos) quando decidido.

---

## 2. Stack de confiança (o "antifraude sem escrow")

Enquanto não há pagamento protegido, a confiança vem de 4 sinais:

| Sinal | Regra |
|---|---|
| **Foto de perfil** | **Obrigatória** no onboarding (rosto = confiança) |
| **Telefone verificado (OTP)** | **Obrigatório** — 1 número = 1 conta (antifake) |
| **@Instagram** | **Opcional**, exibido como bônus quando conectado (prova social do nicho) |
| **Avaliação** | Atrelada a uma **venda confirmada** (reputação real, não-gameável) |

> Fricção que **constrói confiança** (foto, telefone) fica. Fricção burocrática (KYC, CPF no
> cadastro, login antecipado pra navegar) sai.

---

## 3. Modelo de dados — mudanças vs estado atual

Hoje existem (Bloco 0–1): `User`, `Listing`, `ListingImage`, `Category`, `Brand`, `Model`, `OtpCode`.

A máquina de `Order`/escrow **nunca foi construída** — em vez dela, entram peças leves:

### `Conversation`
`id, listingId, buyerId, sellerId, status (open/archived/blocked), createdAt`
Múltiplas conversas por anúncio; cada uma = 1 comprador + 1 vendedor. Ownership: só os 2 veem.

### `Message`
`id, conversationId, senderId, body, imageUrl (nullable), readAt, createdAt`
Texto + imagem. MVP: **polling** (evoluir pra WebSocket depois).

### `Deal` — substitui `Order` (sem dinheiro)
`id, listingId, sellerId, buyerId, status, sellerConfirmedAt, buyerConfirmedAt, createdAt`

Estados:
```
proposed         → criado (a partir de uma conversa)
seller_confirmed → vendedor confirmou a venda e escolheu o comprador
completed        → comprador confirmou a compra → listing.status = sold, soldToUserId = buyer
cancelled        → qualquer lado cancelou antes de completar
```
- `completed` é o gatilho que libera **review** dos dois lados.
- Sem rastreio, sem auto-liberação, sem disputa monetária (não há dinheiro retido).

### `Review`
`id, dealId, reviewerId, reviewedId, rating (1-5), comment, createdAt`
**Só existe se há `Deal` `completed`.** 1 review por par por deal.

### `Favorite`
`id, userId, listingId, createdAt` · unique(userId, listingId).

### Campos ociosos (mantidos, não usados no Fase 0)
`User.cpf`, `User.payoutAccountId` — ficam nullable para quando o pagamento entrar.

### Entidades NÃO criadas
`Order`/escrow, `BusinessListing` (parceiros), `EquipmentPassport`, `KiteScore`.

---

## 4. Adaptações design ↔ backend (por tela)

Telas do bundle `docs`/handoff vs o que o backend suporta.

| Tela | Rota | Adaptação necessária |
|---|---|---|
| **Busca** | `/anuncios` | Filtros facetados **client-side** sobre anúncios reais (categoria, tamanho, modelo, marca, cidade, preço, entrega, reparo). **Remover "Micro furo"** (não existe no schema). **Sem rating nos cards** (sem reviews ainda) → trocar por selo "Telefone verificado". |
| **Criar** | `/anunciar` | Já conecta. Título **auto-gerado** (marca+modelo+tamanho), edição opcional. |
| **Anúncio** | `/anuncio/[id]` | Botão **"Conversar"** → abre conversa (Chat). **Sem "Comprar com escrow"** (vira "Tenho interesse"/conversar). **Sem seção "Parceiros"**. Rating do vendedor só quando houver reviews. |
| **Entrar** | `/entrar` | Trocar campo de **URL de foto** por **upload real** (reusa endpoint de uploads). Contador "reenviar" = UI. i18n EN fica scaffold. |
| **Home** | `/` | Conecta categorias. Remover blocos de parceiro/ecossistema pago. |
| **Chat** | `/chat` | Construir backend (`Conversation`/`Message`) + polling. |
| **Pedido** | `/negocio/[dealId]` (pós-venda) | Vira **confirmação de venda/compra** sem pagamento: estados do `Deal` + avaliação. Remover rastreio/escrow. |
| **Perfil** | `/perfil/[id]` | Adicionar rota + endpoint público (dados já existem no `User`). |
| **Favoritos** | `/favoritos` | Backend `Favorite`. |
| ~~Checkout~~ | — | **Cortado** (sem PIX/escrow). |
| ~~Negocio / CadastroLoja~~ | — | **Cortado** (monetização → depois). |

### Adaptação transversal: **mobile-first**
O handoff entrega **só layouts desktop** (1320px, sidebars). O produto é **mobile-first/PWA** —
precisamos **derivar o mobile de cada tela** (sidebar de filtros → drawer/bottom-sheet, grid 3→1
coluna, header compacto). Não vem pronto no bundle; é trabalho nosso sobre o design.

---

## 5. Plano de execução (por push — cada um deixa algo navegável)

Deploy automático na Vercel a cada push na `main`.

| Push | Entrega | Backend |
|---|---|---|
| **1. Design system** | Tokens (Archivo/Spectral, paleta creme/verde), header + footer compartilhados, base responsiva | — |
| **2. Home + Busca** | Home "Kite Life" + Busca com filtros facetados conectada aos anúncios reais | usa API atual |
| **3. Anúncio + Criar** | Detalhe + criação no visual novo, upload de fotos | usa API atual |
| **4. Entrar** | Login OTP no visual novo + **upload de foto de perfil** | ajuste no onboarding |
| **5. Chat** | Conversa comprador↔vendedor (polling) | + `Conversation`, `Message` |
| **6. Confirmação + Reputação** | `Deal` (confirma venda/compra) → `sold` + **avaliação**; Perfil público; Favoritos | + `Deal`, `Review`, `Favorite` |
| **7. Polish** | Empty states, microcopy de confiança, responsivo mobile, LGPD mínimo, rate limiting | hardening |

**Ordem de prioridade do lançamento:** Pushes 1–4 já entregam uma **vitrine navegável e
anunciável** (o suficiente pra começar o seeding de Cumbuco). Chat (5) e Confirmação (6) fecham
o ciclo de transação sem dinheiro. Push 7 é acabamento pré-divulgação.

---

## 6. O que NÃO muda dos docs originais
- Taxonomia controlada (`reference/taxonomy.md`) — o ativo defensável.
- Seeding manual de Cumbuco (`reference/seeding-plan.md`) — roda em paralelo.
- Strip de EXIF/GPS, ownership checks, rate limiting (`06-trust-safety.md`).
- Princípio: navegar/buscar **sem login**; conta só pra anunciar, favoritar ou conversar.
