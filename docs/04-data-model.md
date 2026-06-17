# 04 — Modelo de dados

Postgres. Convenções: `id` UUID, `created_at` / `updated_at` timestamptz, `deleted_at` nullable (soft delete onde indicado).

> Mudança chave vs doc original: **a entidade `Transaction` vazia foi substituída por `Order`** (com dinheiro real, via PSP). Reviews ancoram em `Order`, não em transação fantasma. Atributos de anúncio variam por categoria via **JSONB**, não texto livre — é isso que torna "padronizado" verdadeiro.

---

## User

| campo | tipo | nota |
|---|---|---|
| id | uuid | |
| name | text | |
| email | text | verificado (nível 0) |
| phone | text | verificado via OTP (nível 1) — **antifake** |
| phone_country | text | suporte a gringo |
| locale | text | `pt` / `en` |
| country | text | |
| avatar_url | text | **obrigatório** (higiene) |
| instagram_handle | text | nullable, exibido — prova social |
| cpf | text | **nullable**; só vendedor BR que recebe payout PIX |
| payout_account_id | text | id da conta no PSP (vendedor) |
| role | enum | `individual` / `business` |
| status | enum | `active` / `blocked` |
| created_at / deleted_at | | |

## Category (referência)

`id, slug, name_pt, name_en, attribute_schema (jsonb)`
Define quais atributos o anúncio dessa categoria exige (ex.: kite → `size_m2`, `year`; trapézio → `harness_size`).
Categorias: Kite, Barra, Twin Tip, Surfboard, Foil, Trapézio, Acessórios.

## Brand / Model (referência — taxonomia controlada)

- **Brand:** `id, name` (Duotone, North, F-One, Cabrinha, Ozone, Core, Naish...).
- **Model:** `id, brand_id, name, category_id` (Rebel, Orbit, Bandit...).
- Alimentam dropdowns. Ver [reference/taxonomy](reference/taxonomy.md). Permitir "outro" com aprovação posterior.

## Listing

| campo | tipo | nota |
|---|---|---|
| id | uuid | |
| user_id | uuid | dono |
| category_id | uuid | |
| brand_id / model_id | uuid | nullable se "outro" |
| year | int | |
| attributes | jsonb | validado contra `Category.attribute_schema` (tamanho, estado, reparos, tempo de uso) |
| title | text | |
| description | text | |
| price | int | centavos |
| city / spot | text | **anúncio tem local próprio** (gear pode estar em Cumbuco com dono em SP) |
| shippable | bool | define fluxo: pagamento online (true) vs presencial (false) |
| status | enum | `draft / active / paused / sold / archived` |
| sold_to_user_id | uuid | nullable |
| last_confirmed_at | timestamptz | para limpeza automática (ping 30 dias) |
| created_at / deleted_at | | |

## ListingImage

`id, listing_id, url, position` — mín 3, máx 20. EXIF/GPS removido no upload.

## Conversation

`id, listing_id, buyer_id, seller_id, status (open/archived/blocked), created_at`
Múltiplas conversas por anúncio; cada uma com 1 comprador + 1 vendedor.

## Message

`id, conversation_id, sender_id, body, image_url (nullable), read_at, created_at`

## Order  ← substitui "Transaction"

| campo | tipo | nota |
|---|---|---|
| id | uuid | |
| listing_id / buyer_id / seller_id | uuid | |
| psp_transaction_id | text | id no PSP |
| amount | int | centavos |
| fee | int | nossa comissão (centavos) |
| payment_method | enum | `pix` / `card` |
| status | enum | `pending / held / shipped / released / refunded / disputed / cancelled` |
| shipping_carrier | text | nullable |
| tracking_code | text | nullable (vendedor informa manual) |
| shipped_at / confirmed_at / released_at | timestamptz | |
| created_at | | |

Máquina de estados em [05](05-payments-escrow.md).

## Review

`id, order_id, reviewer_id, reviewed_id, rating (1-5), comment, created_at`
**Só existe se há `Order` pago.** 1 review por par por order.

## Report

`id, reporter_id, target_type (user/listing/message), target_id, reason, status (open/reviewed/actioned), created_at`

## BusinessListing (anúncio de negócio local — receita)

`id, owner_user_id, type (school/lodging/cafe/store/event), name, description, contact, city/spot, plan, status, starts_at, ends_at`
Separado de `Listing` de gear. Ver [business-ads](modules/business-ads.md).

---

## Entidades adiadas (NÃO criar no MVP)

`EquipmentPassport`, `KiteScore`, `Offer`, `Shipment` (frete automatizado), `Escrow` próprio (o PSP é o escrow).
