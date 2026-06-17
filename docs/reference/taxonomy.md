# Referência — Taxonomia controlada

O ativo mais barato e defensável do produto. Dropdowns, não texto livre.
Alimenta `Category`, `Brand`, `Model` e `Category.attribute_schema`.

## Categorias + atributos (schema por categoria)

| Categoria | Atributos obrigatórios (`attributes` jsonb) |
|---|---|
| **Kite** | `size_m2`, `year`, `condition`, `repairs_count`, `usage_time` |
| **Barra** | `compatible_brand`, `bar_size`, `condition`, `lines_state` |
| **Twin Tip** | `length_cm`, `width_cm`, `condition`, `with_fins`, `with_pads` |
| **Surfboard (Wave)** | `length`, `volume`, `condition`, `repairs_count` |
| **Foil** | `mast_length`, `front_wing_cm2`, `condition`, `type` (race/freeride) |
| **Trapézio** | `harness_size` (S/M/L/XL), `type` (seat/waist), `condition` |
| **Acessórios** | `subtype` (colete, leash, bomba, gancho...), `condition` |

`condition` (estado de conservação) — enum padrão: `novo / seminovo / bom / usado / com reparos`.

## Marcas (semente inicial — expandir)

Duotone, North, F-One, Cabrinha, Ozone, Core, Naish, Slingshot, Airush, Eleveight,
Mystic (trapézio/colete), ION (trapézio/colete), Reedin, Flysurfer.

## Modelos (exemplos por marca — preencher na ingestão)

- Duotone: Rebel, Evo, Neo, Dice, Juice
- North: Orbit, Reach, Carve
- F-One: Bandit, Breeze
- Cabrinha: Switchblade, Moto, Drifter
- Ozone: Enduro, Edge, Reo

> Permitir **"outro"** (texto) quando faltar marca/modelo, com aprovação posterior pra manter
> a taxonomia limpa. Revisar periodicamente os "outros" e promover a entradas oficiais.

## Por que isso importa

- Padronização real → comparabilidade → busca por tamanho/modelo funciona.
- É o que separa o produto de "OLX com mais campos".
