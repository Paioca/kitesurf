# Plano — categoria Prancha (twin-tip)

Segunda categoria da expansão (decisão de 2026-07-04: Wing → **Prancha bidirecional** →
Trapézio; wave/foil depois). O Wing pagou a rampa: motor de negociação, seletor de tipo,
filtros macro→micro e importador já são **genéricos** — nada disso precisa de auditoria nem
código novo (ver `docs/AUDITORIA-CATEGORIA-WING.md`, seção "Generalização"). Este plano
cobre só a **camada de conteúdo** da prancha, auditada em 2026-07-07.

## Auditoria da camada de conteúdo (verificada no código/banco, 2026-07-07)

| Ponto | Resultado |
|---|---|
| Categoria `twin-tip` | **Já existe** no seed (inativa), schema: length_cm*, width_cm, condition (vocabulário legado, com `com_reparos` — bom p/ prancha), with_fins, with_pads |
| Campos boolean (quilhas/straps) no formulário | **Renderizam** (`anunciar/page.tsx:985` trata `type === 'boolean'`) — mas ver armadilha abaixo |
| ⚠ Armadilha 1 — validação exige TODOS os campos do schema | `fichaOk` (anunciar:559) bloqueia publicar com campo vazio — o mesmo que travou o wing com janela/controle. width/fins/pads travariam a publicação → **ficha enxuta (P1)** |
| ⚠ Armadilha 2 — importador assume m² | O caminho standalone do `seed-cumbuco.ts` monta `attributes.size_m2 = Number(r.size_m2)` incondicionalmente → categoria sem m² grava `NaN` (JSON inválido) e o título sai sem tamanho → **fix P3 antes de importar pranchas** |
| ⚠ Armadilha 3 — colisão de nome de modelo | `seedModels` faz upsert por (marca, nome) e **re-aponta a categoria** de modelo homônimo — um "Code" de prancha roubaria um "Code" de kite da mesma marca. **Rascunho atual: zero colisões** (verificado contra o catálogo em staging). Regra: nunca repetir nome de modelo dentro da mesma marca entre categorias |
| Card da busca | `sizeLabel` já tem fallback p/ `length_cm` (`browse.ts:145`) — mostra "140" **sem unidade** (cosmético, P4) |
| Título automático / importador | Montados sobre `size_m2` → prancha sai sem tamanho no título (editável; fix no P3/P4) |
| Filtros | Prancha estreia como o wing: chip próprio + filtros universais (preço/local/condição/marca). Faixas de comprimento = N5, só com volume |
| Motor (oferta→aceite→venda→review) | Genérico, já auditado — **zero trabalho** |

## Tickets

### P1 — Ficha enxuta + nome (seed; espelha a decisão do wing)
Schema da twin-tip vira **length_cm + condition** (width/fins/pads saem — detalhe vai na
descrição livre; era o que travava a publicação). Decidir o **rótulo** (ver Pergunta 1):
`namePt` hoje é "Twin Tip". Slug `twin-tip` não muda (interno/URL).
**Banco:** não (seed upsert; prod via SQL na ativação). **Aceite:** seed 2× limpo em
staging; form da prancha (ativada de teste) publica só com comprimento + condição.

### P2 — Catálogo marcas/modelos (dono valida o corte)
Rascunho verificado sem colisão: Duotone (Jaime, Select, Team Series, Gonzales), North
Kiteboarding (Atmos, Prime, Trace), Cabrinha (Ace, Xcaliber, Spectrum), CORE (Fusion,
Choice, Bolt), F-One (Trax, Magnet), Slingshot (Misfit, Refraction), Naish (Motion, Orbit),
Ozone (Base, Code), Nobile (NHP, Flying Carpet, Fifty50). **Mesmo formato do wing**
(`TWIN_TIP_BRANDS` + `seedModels`), mesma regra CORE≠Core / North Kiteboarding.
**Banco:** não. **Aceite:** seed 2× limpo; zero marca duplicada; re-verificar colisões se o
dono adicionar modelos.

### P3 — Importador: atributos por categoria (fix do NaN)
No caminho standalone do `seed-cumbuco.ts`: montar `attributes` só com colunas presentes
(`size_m2` OU `length_cm`, + condition), e título usar a dimensão que existir
("… · 140 cm · …"). Genérico — vale pra trapézio (harness_size) depois.
**Banco:** não. **Aceite:** CSV de prancha (`type=twin-tip`, `length_cm=140`) importa em
staging com atributos corretos e título "Marca · Modelo · 140 cm · ano"; CSV de wing/kite
continua idêntico.

### P4 — Cosméticos (junto do P1 ou depois; não bloqueiam)
Card: "140 cm" com unidade (`browse.ts:145`); título automático do form com length_cm.

### P5 — Ativação (mesmo ritual do wing, já ensaiado)
1. Decisões da Pergunta 1–3 tomadas; P1–P3 mergeados.
2. Gerar SQL do catálogo a partir de staging (mesmo gerador do wing) → SQL Editor prod.
3. Flip `active=true` (SQL de 1 linha) — form ganha o botão na hora; chip da busca nasce
   com o 1º anúncio.
4. 1º anúncio pela UI (conta Kitetropos ou âncora real); meta ≥5 âncoras.
5. Copy: ver Pergunta 3.

## Perguntas ao dono (travam o P1/P5, nada mais)

1. **Rótulo da categoria:** "Prancha", "Twin Tip" ou "Prancha (twin-tip)"? Lembrando que a
   wave virá depois como categoria separada — se esta chamar só "Prancha", a wave precisará
   de outro nome ("Prancha de wave"?). Recomendação: **"Prancha twin-tip"** evita conflito
   futuro; **"Prancha"** é mais simples se a wave puder esperar um rótulo próprio.
2. **Vocabulário de condição:** manter o legado (novo/seminovo/bom/usado/**com_reparos**) —
   recomendado, pois "com reparos" descreve bem prancha — ou migrar pro vocabulário do
   kite/wing? (Recomendação: manter.)
3. **Copy:** o site diz "kite e wing". Ao ativar prancha: vira "kite, wing e prancha"? Ou o
   guarda-chuva "equipamentos de kitesurf e wing" já cobre (prancha é equipamento de kite)?
   (Recomendação: não mexer na copy — prancha é acessório natural do kitesurf; revisitar
   quando houver volume.)

## Sequência e custo

```
AGORA (invisível):   P1 + P2 + P3 num PR (código+dados, sem migration) · P4 carona
NA ATIVAÇÃO:         P5 (SQL catálogo + flip + 1º anúncio) — ritual já ensaiado no wing
```

Custo total: **1 PR pequeno** + 1 sessão de SQL/anúncio na ativação. O grosso foi pago pelo
Wing; a prancha herda os trilhos.
