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

## O que JÁ EXISTE (inventário verificado no código, não presumido)

| Peça | Estado |
|---|---|
| Categorias `twin-tip`, `surfboard`, `foil`, `trapezio`, `acessorios` | **Já criadas** no `prisma/seed.ts` com `attributeSchema`, todas `active: false` |
| Categoria `wing` | **Não existe** — precisa ser criada (ticket N1) |
| Dropdown de criação de anúncio | Dinâmico: `lib/queries.ts` lê `active: true` |
| Formulário de atributos | Dinâmico: `app/anunciar/page.tsx` renderiza campos do `attributeSchema` |
| Busca/vitrine | `lib/browse.ts` esconde categoria inativa (`category.active: true` no BASE where) |
| Card do anúncio | Fallback de rótulo já cobre outras categorias (`harness_size`/`length_cm`/nome da categoria) |
| Filtro de tamanho da busca | **Kite-only** (faixas sobre `size_m2`) — categorias novas lançam sem filtro de tamanho (ticket N5, depois) |
| Importador de anúncios reais (`seed-cumbuco.ts`) | **Travado em kite/barra** (linhas 104-105) — precisa coluna `categoria` (ticket N3) |
| Registro de busca sem resultado | **Não existe** — o sinal do gate não é medível hoje (ticket M0) |
| Catálogo marca/modelo por categoria | `Model.categoryId` já existe; faltam as listas de wing/prancha/trapézio (ticket N2) |

Conclusão do inventário: expandir categoria aqui é majoritariamente **dado, não código**.
O plano original superestimou o custo ("maior custo técnico da lista") — isso valia para o
modelo kit; a trilha standalone é barata.

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

**Proposta inicial (rascunho para o dono validar com vendedores âncora — NÃO é lista final):**
- **Wing:** Duotone (Unit, Slick, Ventis), F-One (Strike, Swing, Origin), Ozone (Wasp, Flux),
  Cabrinha (Mantis, Crosswing, Vision), North (Nova, Mode), Naish (Wing-Surfer, MK4, ADX),
  Slingshot (SlingWing), Armstrong (A-Wing), AK/Airush (Ahi), Ensis (Score, Spin), Reedin (SuperWing).
- **Twin-tip:** Duotone (Jaime, Select, Team Series, Gonzales), North (Atmos, Prime, Trace),
  Cabrinha (Ace, Xcaliber, Spectrum), CORE (Fusion, Choice, Bolt), F-One (Trax, Magnet),
  Slingshot (Misfit, Refraction), Naish (Motion, Orbit), Ozone (Base, Code), Nobile, Mystic? (não — Mystic é acessório).
- **Trapézio:** Mystic (Majestic, Stealth, Warrior, Star), ION (Riot, Apex, Nova), Ride Engine
  (Elite, Prime, Saber), Manera (Exo, Union), NP/Neilpryde, Dakine (Pyro, C-1), Prolimit, Brunotti.

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
AGORA (não expõe nada):        M0 → N1 → N2 → N3
QUANDO O SINAL CHEGAR:         N4 (Wing primeiro, depois Prancha, depois Trapézio — 1 por vez)
QUANDO TIVER VOLUME:           N5
```

M0 é o mais valioso: começa a acumular dado de demanda hoje, e é ele que diz QUAL categoria
ligar primeiro de verdade (pode surpreender — talvez seja trapézio, não wing).

## Perguntas abertas (dono)

1. **Posicionamento de marca:** o site fala "equipamentos de kitesurf". Wing é outro esporte
   (wing foil). Ao ativar Wing: vira "equipamentos de kite e wing"? Muda tagline/SEO? Decisão
   de copy antes do N4 do Wing.
2. **"Prancha"** = twin-tip (bidirecional) primeiro, correto? Wave (surfboard) fica pra fase
   seguinte, junto de foil.
3. As listas de marca/modelo do N2 precisam do seu corte (o rascunho é chute educado).

## O que explicitamente NÃO fazer

- Ativar categoria sem âncoras prontas (prateleira vazia mata a categoria no nascimento).
- Reproduzir o modelo kit (dois-em-um) em qualquer categoria nova.
- Construir filtros/SEO/destaques (N5) antes de Requests reais na categoria.
- Criar importador novo — estender o `seed-cumbuco.ts`.
