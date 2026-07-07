# Auditoria — adicionar a categoria Wing (pré-decisão)

Data: 2026-07-04. Método: 3 varreduras independentes de código (fluxo de domínio; criação/
edição de anúncio; vitrine/SEO/copy) + análise de busca/filtros feita à parte, com
divergências entre auditores re-verificadas no código antes de entrar aqui. Só leitura —
nada foi alterado. Complementa `docs/PLANO-CATEGORIAS-NOVAS.md`.

## Veredito

**GO, com correções delimitadas.** O motor do marketplace (ciclo de negociação) funciona
para Wing **sem tocar em nada**. O que precisa de trabalho está em 2 frentes de código
(porta de entrada do anúncio; busca/filtros) e 1 decisão de copy (posicionamento). Nenhuma
mudança de banco além do próprio seed da categoria.

## O que FUNCIONA sem mexer (verificado ponto a ponto)

| Área | Evidência |
|---|---|
| **Ciclo de negociação completo** — oferta/visita → aceite → venda → confirmação → avaliação → reversão/disputa → remoção | `sellables()` trata `hasBarra=false` como peça única `conjunto` (`lib/components.ts:30-41`); nenhuma etapa checa slug de categoria; `applyPieceSale`/`unmarkPieceSale` com `conjunto` não tocam colunas de kit (`lib/deals.ts:165-188`) |
| Validação server-side de criar/editar | 100% dirigida pelo `attributeSchema` da categoria (`api/listings/route.ts:118`, `[id]/route.ts:130`, `lib/attributes.ts` sem campo hardcoded) |
| Notificações in-app, SMS e WhatsApp | Copy neutra ("anúncio", "uma oferta") — `lib/notification-copy.ts`, `lib/notify.ts` |
| Detalhe do anúncio: metadados OG, JSON-LD Product, ficha | Dinâmicos via `category.namePt` (`anuncio/[id]/page.tsx:40,158,189`) |
| Card da busca (inclusive foto) | `pickPhoto` tem fallback pra 1ª imagem (`lib/browse.ts:58-61`) — card de wing renderiza foto normal |
| Perfil do vendedor, favoritos, regras de kit | Wing (`hasBarra=false`) nunca entra nos ramos de kit |

## O que QUEBRA (bloqueante técnico — sem isso não existe anúncio de wing)

1. **Seletor de tipo em /anunciar é hardcoded** — 3 botões fixos (Kite, Barra, Kite+Barra);
   `type Kind = '' | 'kite' | 'barra' | 'kit'` (`app/anunciar/page.tsx:64-65, 705-707`).
   O usuário não tem como escolher Wing mesmo com a categoria ativa. → **Ticket N-C**
2. **Busca/filtros**: chips de categoria hardcoded kite/barra; wing cairia na visão "Tudo"
   sem chip próprio; fichas kite-only (Reparo/Bladder/Mangueiras) ficariam ambíguas e
   excluiriam wings silenciosamente (`lib/browse.ts` `computeFacets`/`perspective`). →
   **Ticket N-F** (já especificado no plano)

## O que fica INCOERENTE (bloqueante de marketing — decisão de copy, código trivial)

3. **Hero desktop da home**: "Anuncie seu **kite**..." / CTA "Anunciar meu **kite**"
   (`app/page.tsx:28,30`). Detalhe: o texto **mobile JÁ diz "equipamentos de kitesurf &
   wing"** (`page.tsx:33,96`) — a direção de marca já estava meio decidida; falta alinhar
   o desktop.
4. **Title global**: "Kitetropos | equipamentos de **kitesurf**..." (`app/layout.tsx:32`).
   → **Ticket N-P** (decisão do dono + edição pequena)

## O que DEGRADA (cosmético — pode sair junto ou depois, não bloqueia)

| Item | Onde | Nota |
|---|---|---|
| Título automático do anúncio só entende `size_m2` de kite | `anunciar/page.tsx:407-415` | Título é editável; wing usa `size_m2` também, então na prática quase não degrada |
| "o kite" genérico na mensagem de WhatsApp e no detalhe | `lib/requests.ts:43`, `anuncio/[id]/page.tsx:119` | Fallback textual; trocar por `category.namePt` |
| Tag interna da foto vira 'kite'/null pra wing | `anunciar/page.tsx:461`, `EditForm.tsx:71` | Funciona via fallback; limpar junto do N-C |
| Breadcrumb "Kites" hardcoded | `anuncio/[id]/page.tsx:213` | Wing mostra o namePt certo; só o rótulo kite que é fixo |
| `/sobre` lista "kites, barras e kits" | `sobre/page.tsx:21` | Ajustar copy junto do N-P |
| Guia checklist é kite-only; páginas SEO `/comprar-kite-usado` etc. | `guias/`, `sitemap.ts` | Continuam corretas para kite; versões de wing são N5 (depois, com volume) |

## Custo da decisão (resumo executivo)

| Frente | Ticket | Tamanho | Banco? |
|---|---|---|---|
| Porta de entrada do anúncio (seletor dinâmico, Kind genérico, tag de foto por slug, título fallback, textos "o kite"→namePt) | **N-C** (novo) | PR médio | Não |
| Busca/filtros macro→micro | **N-F** (já no plano) | PR médio | Não |
| Copy/posicionamento (hero desktop, title global, /sobre) | **N-P** (novo) | PR pequeno | Não |
| Categoria + catálogo + importador | N1, N2, N3 (já no plano) | PRs pequenos | Não |

**Domínio/negociação: zero trabalho. Nenhuma migration.** Total estimado: 3 PRs de código
(N-C, N-F, N-P) + 3 de dados (N1–N3), todos executáveis por agente com revisão, tudo
testável em staging antes de ligar.

## Generalização — vale para board/trapézio/foil? (duas camadas)

Pergunta do dono: essa auditoria serve para qualquer categoria nova? Resposta: o
**framework** sim; o **conteúdo por categoria** não. Separe as duas camadas.

**Camada 1 — framework (vale para QUALQUER categoria standalone, hasBarra=false):**
- Motor de negociação (oferta→...→reversão): intocado, funciona para todas.
- N-C (seletor de tipo dinâmico), N-F (mecanismo de filtro macro→micro), N-P (padrão de
  copy sem "kite" hardcoded): resolvidos UMA vez = rampa de entrada para toda categoria
  futura. Se N-C/N-F forem escritos como "categoria genérica" (não hardcodar 'wing'), a 2ª
  e 3ª categoria não repetem esse trabalho.

**Camada 2 — conteúdo por categoria (NÃO transfere; cada uma é um mini-projeto de dados):**
attributeSchema próprio, catálogo marca/modelo, copy/SEO — e principalmente a **dimensão de
filtro**. O filtro de tamanho e o título automático são presos a `size_m2` hoje
(`lib/browse.ts:231`; `anunciar/page.tsx:413`). Cada categoria usa dimensão diferente:

| Categoria | Dimensão primária (schema) | Custo relativo p/ filtro/título/card |
|---|---|---|
| **Wing** | `size_m2` (igual ao kite) | **o mais barato** — reusa filtro de m² e título do kite |
| Prancha (twin-tip) | `length_cm` | precisa de faixa própria no N-F |
| Prancha wave (surfboard) | `length` | faixa própria + rótulo do card não coberto hoje |
| Trapézio | `harness_size` (S–XL) | filtro por enum, não por faixa numérica |
| Foil | `mast_length` | faixa própria + rótulo do card não coberto (`browse.ts:145` cobre harness/bar/length_cm, não mast) |

**Consequência estratégica:** Wing é a categoria **mais barata possível** justamente por ser
dimensionalmente um kite (m²). Board e trapézio rodam no MESMO motor (negociação zero
trabalho), mas exigem mais no N-F (dimensão própria) e no card/título. Portanto: fazer N-C e
N-F de forma genérica agora paga a rampa; cada categoria seguinte custa só o schema +
catálogo + as faixas do seu filtro. A auditoria de motor **não precisa ser repetida** por
categoria; a de conteúdo (schema/filtro/copy), sim — e é pequena.

## Condições de ativação (mantidas do plano)

≥5 anúncios âncora reais prontos antes do flip `active: true`; decisão de posicionamento
(N-P) tomada; N-C e N-F mergeados e validados em staging + Preview (CSP).
