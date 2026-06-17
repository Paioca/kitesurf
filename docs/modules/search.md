# Módulo — Busca

## Objetivo

O "aha" do produto: **filtrar por tamanho de kite** e categoria — o que o Facebook não tem.

## Regra de ouro

**Busca e browse funcionam SEM login.** Pedir conta só ao mensagear/anunciar/comprar.
Cada tela de login antecipada mata 20–40% do topo do funil.

## Filtros (MVP)

- Categoria
- **Tamanho** (m² pra kite; tamanho relevante por categoria) ← prioridade nº 1
- Cidade / spot
- Faixa de preço
- Marca / modelo
- Estado de conservação
- `shippable` (sim/não)

## Ordenação

- Mais recentes (default)
- Preço
- (futuro) relevância/proximidade

## Implementação

- MVP: query Postgres com índices nos campos de filtro + GIN no `attributes` jsonb.
- Busca textual simples (ILIKE / full-text PT) — não trazer Elastic no MVP.

## Empty state

Crítico em marketplace cold-start. "Nenhum anúncio em Cumbuco ainda" mata o usuário.
**Por isso o seeding manual** ([reference/seeding-plan](../reference/seeding-plan.md)) garante
que a busca nunca volte vazia no launch.
