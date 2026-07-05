# Plano — novas categorias (Wing, Prancha, Trapézio)

Preparação para expandir o catálogo além de kite/barra, **sem violar o gate do beta**
(`.claude/skills/kitetropos-liquidity-beta-playbook`): categoria nova só LIGA quando houver
sinal de demanda medido (busca sem resultado, pedido direto de vendedor âncora). Este plano
separa o que pode ser feito **agora sem expor nada** (preparação, tudo `active: false`) do
que espera o sinal (ativação).

## Decisões travadas (do dono, 2026-07-04)

1. **Trilhas separadas, item único por anúncio.** Nada do modelo kit dois-em-um (`hasBarra`/
   venda por componente) — aquilo é exceção do kite e fica só nele. Categoria nova nasce
   standalone (que já é o default do sistema — custo zero).
2. **Ordem por hora:** Wing → Prancha bidirecional (twin-tip) → Trapézio.
3. **Depois (fora deste plano):** prancha wave (surfboard), foil, prancha de foil/wing.
4. **Wing confirmado como primeira aposta** (tese: oceano azul — pouca oferta organizada de
   wing usado no BR). Catálogo marca/modelo de wing validado pelo dono (ver N2).
5. **Modelo de filtros: macro → micro.** Filtro primário é a categoria (chip); as fichas
   técnicas específicas (Reparo, Bladder, Mangueiras, tamanho) só aparecem com a categoria
   selecionada. Nada de ficha duplicada nem ficha ambígua na visão "Tudo" (ver seção
   "Filtros — análise de impacto" e ticket N-F).

## O que JÁ EXISTE (inventário verificado no código, não presumido)

| Peça | Estado |
|---|---|
| Categorias `twin-tip`, `surfboard`, `foil`, `trapezio`, `acessorios` | **Já criadas** no `prisma/seed.ts` com `attributeSchema`, todas `active: false` |
| Categoria `wing` | **Não existe** — precisa ser criada (ticket N1) |
| Dropdown de criação de anúncio | Dinâmico: `lib/queries.ts` lê `active: true` |
| Formulário de atributos | Dinâmico: `app/anunciar/page.tsx` renderiza campos do `attributeSchema` |
| **Seletor de TIPO em /anunciar** | **⚠ QUEBRA para 3ª categoria**: 3 botões hardcoded (kite/barra/kit), `type Kind` fixo (`anunciar/page.tsx:64-65,705-707`) — ver `docs/AUDITORIA-CATEGORIA-WING.md` (ticket N-C) |
| Ciclo de negociação (oferta→aceite→venda→review→reversão) | **Auditado 2026-07-04: funciona para categoria standalone SEM mudança** (ver auditoria) |
| Busca/vitrine | `lib/browse.ts` esconde categoria inativa (`category.active: true` no BASE where) |
| Card do anúncio | Fallback de rótulo já cobre outras categorias (`harness_size`/`length_cm`/nome da categoria) |
| Filtro de tamanho da busca | **Kite-only** (faixas sobre `size_m2`) — categorias novas lançam sem filtro de tamanho (ticket N5, depois) |
| Importador de anúncios reais (`seed-cumbuco.ts`) | **Travado em kite/barra** (linhas 104-105) — precisa coluna `categoria` (ticket N3) |
| Registro de busca sem resultado | **Não existe** — o sinal do gate não é medível hoje (ticket M0) |
| Catálogo marca/modelo por categoria | `Model.categoryId` já existe; faltam as listas de wing/prancha/trapézio (ticket N2) |

Conclusão do inventário: expandir categoria aqui é majoritariamente **dado, não código**.
O plano original superestimou o custo ("maior custo técnico da lista") — isso valia para o
modelo kit; a trilha standalone é barata. **A exceção é a busca/filtros** — ver abaixo.

---

## Filtros — análise de impacto (verificada no código, 2026-07-04)

Pergunta do dono: ao ativar Wing, a ficha "Reparo" (e afins) duplica? Fica ambígua
("reparo de quê?")? A resposta, olhando `lib/browse.ts` + `components/browse/`:

**Como funciona hoje:**
- As facetas são **contextuais** (cada dimensão conta aplicando os demais filtros ativos) e
  **orientadas a dados**: uma ficha aparece se `facets.X.length > 0` — ou seja, Bladder/
  Mangueiras/Reparo aparecem porque existem *kites* no resultado, não porque "kite" está
  selecionado.
- Os chips de categoria são **hardcoded** kite/barra (`computeFacets` só gera esses dois).
- A busca tem "perspectiva" (`kite` | `barra` | `all`); qualquer `cat` desconhecido cai em
  `all`. A perspectiva barra já mostra menos fichas — **o padrão macro→micro já meio existe**.
- `FilterContent.tsx` é **compartilhado entre desktop e mobile** (`FilterSheet` é só o
  invólucro mobile) — a correção é num lugar só.

**O risco confirmado:** ligar Wing sem mexer na busca faria os anúncios de wing caírem na
visão "Tudo" SEM chip próprio para filtrá-los, e as fichas kite-only (Reparo/Bladder/
Mangueiras) continuariam visíveis nessa visão — usá-las excluiria os wings silenciosamente.
Exatamente a ambiguidade que o dono apontou.

**A decisão (travada, nº 5): macro → micro.**
- Sem categoria selecionada ("Tudo"): só filtros universais — preço, local (UF/cidade),
  entrega, marca, condição (o campo `condition` já é compartilhado entre categorias).
- Categoria selecionada: entram as fichas específicas dela. Kite: Reparo, Bladder,
  Mangueiras, faixas de m² de kite. Wing: faixas de m² de wing, boom/handles, janela.
  Trapézio: tamanho S–XL, tipo (seat/waist).
- Nenhuma ficha duplicada; nenhuma ficha órfã de contexto.

---

## Ticket M0 — Medir o sinal de demanda (PODE SER FEITO JÁ)

**Objetivo:** registrar buscas que retornam zero resultado (o termo digitado), para saber
o que as pessoas procuram e não encontram — é o gatilho oficial de ativação de categoria.

**Por que importa:** sem isso o gate do playbook ("buscas por categoria inativa") é
inauditável e a decisão de ligar Wing vira chute.

**Escopo:** no caminho da busca (`lib/browse.ts` / rota de listagem), quando o resultado for
vazio E houver termo de texto, gravar o termo + timestamp. Preferir a tabela `AuditEvent`
existente (sem migration) se o shape couber; senão, tabela mínima `SearchMiss` (migration
aditiva). Sem PII (não gravar userId; termo + data bastam). Exibição: bloco simples na aba
Funil do `/saude` ("termos sem resultado, últimos 30 dias, top 20") ou script `diag-search-miss.mjs`.

**Fora de escopo:** analytics de busca geral, tracking de clique.
**Banco:** Talvez (só se `AuditEvent` não couber — aí migration aditiva; fluxo de migration
está saudável, ver `docs/RUNBOOK-MIGRATION-DRIFT.md`).
**Aceite:** buscar "wing" em staging (zero resultado) gera 1 registro; termo aparece no /saude
ou no diag. Buscas com resultado não gravam nada.
**Quem:** Codex em staging; PR revisado pelo dono.

## Ticket N1 — Criar categoria Wing (active: false)

**Objetivo:** adicionar `wing` ao `CATEGORIES` do `prisma/seed.ts`, desligada.

**attributeSchema proposto** (revisar com quem vive o esporte):
- `size_m2` (number, 2–8.5, step 0.1, obrigatório) — reusa o mesmo campo do kite: o card,
  a busca por faixa (futura) e o título automático já entendem `size_m2`.
- `condition` (enum, obrigatório) — reusar `KITE_CONDITION` (estado do tecido é a mesma lógica).
- `boom_ou_handles` (enum: `boom`, `handles`, `ambos`) — opcional.
- `janela` (enum: `com_janela`, `sem_janela`) — opcional.

**Fora de escopo:** ativar; barra/estrutura de kit (não existe em wing — trilha única).
**Banco:** Não (Category é linha de dado; seed upsert idempotente).
**Aceite:** seed roda 2× limpo em staging; categoria existe com `active: false`; NADA muda
no site público (categoria inativa é invisível).
**Quem:** Codex.

## Ticket N2 — Catálogos marca/modelo (wing, twin-tip, trapézio)

**Objetivo:** popular `Brand`/`Model` (com `categoryId`) para as 3 categorias, no padrão
do `seedModels` existente. Marcas já existentes (Duotone, F-One, etc.) são reusadas pelo
upsert por nome — modelos novos apontam pra categoria nova.

**Catálogo de WING — VALIDADO PELO DONO (2026-07-04), usar como está:**

| Marca | Modelos |
|---|---|
| Duotone | Unit, Unit SLS, Unit D/Lab, Slick, Slick SLS, Slick D/Lab, Ventis, Ventis D/Lab, Float, Echo |
| North | Nova, Nova Pro, Mode Pro, Mode Ultra, Loft Pro |
| Cabrinha | Mantis, Mantis Apex, Vision, Crosswing |
| F-One | Strike, Strike CWC, Strike Aluula, Swing, Origin |
| Slingshot | SlingWing, SlingWing NXT, Javelin, Blaster, Dart |
| Naish | ADX, ADX Nvision, Atom, Neutron, Matador, Wing-Surfer |
| Ozone | Fly, Flow, Flux, Flux Ultra-X, Liteforce, Wasp |
| **CORE** ⚠ | Halo, Halo Pro, Halo Pro LW |
| Reedin | SuperNatural, SuperNatural SSD, SuperWing, SuperWing X |
| Ensis | Score, Spin, Top Spin, Drive |
| Armstrong | A-Wing, A-Wing XPS, A-Wing XPS Mk II, X-Wing |
| Takoon | Wing, Wing Pro, Wing Ultra, VX, VX Pro |
| FreeWing | Air, Air Team, Nitro, Pro, N-Team |
| GONG | Droid, Neutra, Pulse, SuperPower, Plus |
| KT | Wing Air, Wing Air DD |
| Eleveight | WFS |
| Harlem | Pace |
| NeilPryde | Fly, Fly Pro, Fly SL, FireFly, FireFly Pro |
| RRD | Wind Wing, Air Wing, Air Wing School, Evolution Wing, Evolution Gold Wing, Pocket Wing |
| PPC | M1, M1-X, M1-L, M2, Vortex SDS, Sonic FDS |
| Ocean Rodeo | Glide, Glide A-Series, Glide HL-Series, Glide Pro Dacron |

> ⚠ **CORE, não "Core":** a lista original do dono grafa "Core", mas a marca canônica no
> banco é **`CORE`** (maiúscula). Semear como "Core" recriaria a duplicata que a fusão de
> 2026-07-04 eliminou (`prisma/merge-brand-core.mjs`). Usar `CORE` sempre.
> Marcas já existentes no banco (Duotone, North, Cabrinha, F-One, Slingshot, Naish, Ozone,
> CORE, Reedin, Eleveight, Harlem, RRD, Ocean Rodeo) são reusadas pelo upsert por nome;
> as demais (Ensis, Armstrong, Takoon, FreeWing, GONG, KT, NeilPryde, PPC) são novas.

**Twin-tip e Trapézio — rascunho para o dono validar depois (NÃO é lista final):**
- **Twin-tip:** Duotone (Jaime, Select, Team Series, Gonzales), North (Atmos, Prime, Trace),
  Cabrinha (Ace, Xcaliber, Spectrum), CORE (Fusion, Choice, Bolt), F-One (Trax, Magnet),
  Slingshot (Misfit, Refraction), Naish (Motion, Orbit), Ozone (Base, Code), Nobile.
- **Trapézio:** Mystic (Majestic, Stealth, Warrior, Star), ION (Riot, Apex, Nova), Ride Engine
  (Elite, Prime, Saber), Manera (Exo, Union), NeilPryde, Dakine (Pyro, C-1), Prolimit, Brunotti.

**Fora de escopo:** fotos de catálogo, anos por modelo.
**Banco:** Não (dados via seed).
**Aceite:** seed 2× limpo em staging; `diag-counts` mostra os modelos nas categorias certas;
nenhuma duplicata de marca (caso Core/CORE já corrigido — upsert por nome).
**Quem:** Codex propõe; dono corta/adiciona modelos antes do merge.

## Ticket N3 — Coluna `categoria` no importador (seed-cumbuco)

**Objetivo:** o CSV de anúncios reais ganhar coluna `categoria` (slug; default `kite` para
compatibilidade), destravando importar wing/prancha/trapézio dos vendedores âncora.

**Regra do playbook:** ESTENDER o importador existente, nunca criar seed paralelo.
**Escopo:** aceitar o slug, validar contra Category existente, validar atributos contra o
`attributeSchema` da categoria (o pipeline de foto/telefone/idempotência não muda).
**Banco:** Não.
**Aceite:** CSV de teste com 1 wing importa em staging (`--dry` primeiro); CSV antigo sem a
coluna continua funcionando idêntico.
**Quem:** Codex.

## Ticket N-C — Porta de entrada do anúncio multi-categoria (da auditoria)

**Objetivo:** o usuário conseguir CRIAR um anúncio de categoria nova. Hoje é impossível:
o seletor de tipo do /anunciar tem 3 botões fixos (kite/barra/kit).

**Escopo (pontos da auditoria, `docs/AUDITORIA-CATEGORIA-WING.md`):**
1. `app/anunciar/page.tsx:705-707` + `type Kind` (linha 64-65): seletor de tipo dinâmico a
   partir das categorias ativas (mantendo o botão especial "Kite + Barra" como variação do
   kite). Com só kite/barra ativas, renderiza idêntico ao atual.
2. Tag de foto (`pickPhotos`/`upload`, linha 461/504; `EditForm.tsx:71`): `component` da
   foto por slug da categoria (ou null para standalone) em vez de 'kite' fixo.
3. Título automático (linha 407-415): fallback genérico quando a categoria não tem `size_m2`
   (wing tem, então o impacto real é para trapézio/prancha depois).
4. Textos "o kite" genéricos → `category.namePt` (`lib/requests.ts:43`,
   `anuncio/[id]/page.tsx:119`, breadcrumb linha 213).

**Banco:** Não. **Aceite (staging, wing ativa de teste):** criar anúncio de wing pela UI de
ponta a ponta (tipo → ficha → fotos → publicar); editar depois; com só kite/barra ativas o
/anunciar fica visualmente idêntico ao atual. **Quem:** Codex; Preview (CSP) antes do merge.

## Ticket N-P — Posicionamento e copy (decisão do dono + edição pequena)

**Contexto da auditoria:** o texto MOBILE da home **já diz "equipamentos de kitesurf &
wing"** (`app/page.tsx:33,96`); o desktop ("Anuncie seu kite", CTA "Anunciar meu kite",
linhas 28/30) e o title global (`app/layout.tsx:32`) ficaram para trás.

**Escopo:** dono decide a fórmula (ex.: "kitesurf & wing"); alinhar hero desktop, CTA,
title global e a lista do `/sobre` ("kites, barras e kits" → incluir wings). Páginas SEO
novas (`/comprar-wing-usado`) ficam no N5.
**Banco:** Não. **Aceite:** nenhuma superfície pública contradiz a existência de wing no ar.
**Quem:** copy é do dono; aplicação é edição trivial (Codex).

## Ticket N-F — Busca e filtros multi-categoria (macro → micro)

**Objetivo:** implementar a decisão nº 5. É o único trabalho de código de verdade da
expansão — e é pré-requisito da ativação do Wing (N4 depende dele).

**Escopo (pontos exatos, verificados):**
1. `lib/browse.ts` `computeFacets`: gerar os chips de categoria **dinamicamente** a partir
   das categorias ativas com anúncio (hoje hardcoded kite/barra). Enquanto só kite/barra
   estiverem ativas, o resultado visual é idêntico ao atual.
2. `lib/browse.ts` `perspective()`/`buildWhere`: caso genérico para categoria standalone —
   `f.cat === '<slug>'` filtra `category.slug`. Sem lógica de reserva por componente
   (isso é exclusivo do kite/barra; wing não tem).
3. `computeFacets` `inPersp`: perspectiva de categoria standalone = `catSlug === f.cat`.
4. **Gate das fichas por categoria** (`components/browse/FilterContent.tsx` — serve desktop
   E mobile): Reparo/Bladder/Mangueiras só com `cat=kite`; fichas do wing (boom/handles,
   janela) só com `cat=wing`; na visão "Tudo" só universais (preço, local, entrega, marca,
   condição). Resolve a ambiguidade "Reparo de quê?".
5. Faixas de tamanho por perspectiva: as atuais (`sizeBucket`: <7, 7-9, 9-11, 11-13, ≥13)
   são de kite; wing (2–8.5 m²) precisa das dele (ex.: <3.5, 3.5-4.5, 4.5-5.5, 5.5-6.5, ≥6.5).
   Trapézio usa `harness_size` (S–XL), não faixa numérica.
6. `ActiveChips.tsx`: rótulo dos chips ativos das fichas novas.

**Fora de escopo:** SEO pages, ordenação, destaque na home (N5).
**Banco:** Não (só leitura; nenhuma coluna nova).
**Aceite (staging, com wing ativa de teste):** visão "Tudo" mostra chips Kite/Barra/Wing e
NENHUMA ficha técnica ambígua; selecionar Wing mostra faixas de wing e esconde Reparo/
Bladder; selecionar Kite fica idêntico ao hoje; mobile (FilterSheet) espelha o desktop sem
trabalho extra; buscar com filtro de bladder na visão Tudo não "some" com wings (a ficha
nem aparece lá).
**Risco:** regressão na busca atual de kite — mitigar comparando resultados antes/depois em
staging com os `diag-search-*`.
**Quem:** Codex; validar Preview (CSP) antes do merge, como sempre.

## Ticket N4 — Ativação (por categoria; ESPERA O SINAL)

**Gatilho (um dos dois, medido):** (a) termos da categoria aparecendo em M0 com recorrência;
ou (b) ≥3 vendedores âncora com equipamento real da categoria prontos pra anunciar.

**Checklist repetível de ativação (1 categoria por vez):**
1. Anúncios âncora prontos ANTES de ligar (≥5 por categoria, regra anti-prateleira-vazia:
   vendedor real, foto real, telefone real — as regras do playbook valem aqui).
2. Flip `active: true` no seed + rodar em staging → smoke: criar anúncio da categoria,
   buscar, abrir detalhe, favoritar.
3. Revisar copy onde diz "kitesurf" (páginas de entidade, llms.txt, tagline) — decisão de
   posicionamento do dono (ver Pergunta aberta 1).
4. Deploy + rodar seed em prod (dono) + importar âncoras via N3.
5. Semana 1: acompanhar no /saude (Funil) os Requests da categoria nova.

**Banco:** Não.
**Quem:** Codex prepara; dono decide o momento e roda em prod.

## Ticket N5 — Refinamentos (DEPOIS, só com volume)

Filtro de tamanho por categoria na busca (faixas de wing, tamanho de trapézio S–XL),
páginas SEO (`comprar-wing-usado` etc.), destaque na home. Nada disso antes de a categoria
provar Requests reais. Explicitamente fora do escopo atual.

---

## Sequência

```
AGORA (não expõe nada):        M0 → N1 → N2 → N3 → N-C → N-F   (+ decisão N-P do dono em paralelo)
QUANDO O SINAL/ÂNCORAS:        N-P aplicado → N4 (Wing — decisão travada; depois Prancha, Trapézio — 1 por vez)
QUANDO TIVER VOLUME:           N5
```

N-C e N-F podem ser feitos antes da ativação sem expor nada: com só kite/barra ativas,
seletor e chips dinâmicos renderizam idêntico ao atual. M0 continua valioso mesmo com Wing
decidido — mede se Prancha/Trapézio merecem ser as próximas e em que ordem.

**Auditoria pré-decisão (2026-07-04):** `docs/AUDITORIA-CATEGORIA-WING.md` — veredito GO
com correções; ciclo de negociação funciona sem mudança; bloqueios = N-C (criar anúncio) e
N-F (filtros); incoerência de copy = N-P. Zero migration.

## Perguntas abertas (dono)

1. **Posicionamento de marca:** o site fala "equipamentos de kitesurf". Wing é outro esporte
   (wing foil). Ao ativar Wing: vira "equipamentos de kite e wing"? Muda tagline/SEO? Decisão
   de copy antes do N4 do Wing.
2. **"Prancha"** = twin-tip (bidirecional) primeiro, correto? Wave (surfboard) fica pra fase
   seguinte, junto de foil.
3. ~~Lista de marcas do Wing~~ **respondida** (catálogo validado no N2). Faltam os cortes de
   twin-tip e trapézio quando chegar a vez deles.

## O que explicitamente NÃO fazer

- Ativar categoria sem âncoras prontas (prateleira vazia mata a categoria no nascimento).
- Reproduzir o modelo kit (dois-em-um) em qualquer categoria nova.
- Construir filtros/SEO/destaques (N5) antes de Requests reais na categoria.
- Criar importador novo — estender o `seed-cumbuco.ts`.
