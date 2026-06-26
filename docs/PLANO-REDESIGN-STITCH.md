# Plano de redesign — trazer o "Lifestyle Edition" (Stitch) pro app

**Objetivo:** elevar o visual do app ao nível das telas do Stitch (projeto
*Kite Tropos Design System — Lifestyle Edition*) **sem mexer em backend, rotas, fluxo
ou lógica**. Só cor, componente e hierarquia.

**Status:** proposta. Verdade-terreno continua sendo o código (HANDOFF.md).

---

## 0. Princípio que rege tudo

O Stitch **não conhece nosso backend** — ele inventou telas e botões que não existem.
A paleta, porém, é idêntica à nossa (`lib/tokens.ts` já tem `#1f6b5c`, `#f6f3ec`,
`#d9a86b`, Archivo+Spectral, losango). Logo:

- **Token NÃO muda.** Nada de inventar cor nova. A fundação está travada e correta.
- **Trabalho = só presentation layer:** `components/*`, `lib/tokens.ts` (só se faltar
  um token de apoio), `app/globals.css`, e o JSX das páginas.
- **Cada botão/elemento do Stitch tem que mapear pra uma ação que JÁ existe.** O que
  não mapeia, a gente **descarta o comportamento e aproveita só o estilo**.

### ⚠️ O que o Stitch inventou e a gente NÃO implementa (só rouba o estilo)

| Tela Stitch | Inventou | Realidade no nosso backend | Decisão |
|---|---|---|---|
| "Negociações e Mensagens" | **chat em tempo real** (bolhas, composer "Escreva sua mensagem") | Não há chat. Contato é **estruturado (oferta/visita) + WhatsApp** | NÃO construir chat. Aproveitar só: layout 2-painéis, cabeçalho do thread, estilo das listas. Conteúdo = nossos pedidos/deals (`DealBox`, `RequestActions`). |
| Detalhe → "Tenho Interesse / WhatsApp" | rótulos novos | Já temos `ContactActions` (oferta/visita/WhatsApp) | Manter as ações atuais; só re-estilizar como o card de preço sticky do Stitch. |
| "Onde velejar no Cumbuco" (mini-mapa) | card de mapa | Não há feature de mapa | Opcional: virar card estático/decorativo do spot. Não criar mapa interativo. |
| "Impulsione seus anúncios" (perfil) | promo de boost pago | Não há monetização Fase 0 | Tratar como slot visual; só ligar se/quando existir. Por ora, placeholder ou ocultar. |

---

## 1. Diagnóstico — alvo Stitch × estado atual

| Área | Alvo Stitch (Lifestyle) | Estado atual | Gap |
|---|---|---|---|
| **Tokens/paleta** | sand/teal/gold, Archivo 900 + Spectral italic, losango | idêntico em `lib/tokens.ts` | nenhum |
| **Hero (home)** | foto full-bleed praia + gradiente escuro + kicker Spectral italic + headline Archivo 900 UPPERCASE gigante + barra de busca sobreposta | já tem `hero-beach.jpg` + Ken-Burns | refinar hierarquia/escala do título e a busca sobreposta |
| **Ritmo editorial** | toda seção abre com **kicker Spectral italic** → headline Archivo 900; gaps `xxxl`; seção foto+texto 2 colunas ("O DESTINO FINAL…") | seções existem, kicker inconsistente | padronizar par kicker→headline em todas as seções |
| **Contraste teatral** | seções escuras (`dark-stage`) alternando com sand ("Como Funciona", faixa de confiança) | `HowItWorks`/`ComoFunciona` existem | garantir 1–2 "palcos escuros" com texto branco/aqua |
| **Losango** | trilha de losangos como divisor; losango como bullet | `Diamond`/`DiamondTrail` em `ui.tsx` | usar como divisor de seção e bullet de listas |
| **Card de anúncio** | selo de tamanho escuro, condição por cor, preço dominante, vendedor verificado agrupado | `ListingCard` já faz tudo isso | quase pronto; só ajustar raio/sombra tintada |
| **Detalhe do anúncio** | mosaico de galeria (1 grande + 2 menores), **card de preço sticky** à direita, chips de confiança, card escuro "Vendedor Verificado", grid de specs 2-col com ícones | a verificar | alinhar layout do rail direito + specs em grid de ícones + card escuro do vendedor |
| **Anunciar** | rótulos de passo ("PASSO 01 / CATEGORIA"), cards de categoria com ícone circular, dropzone tracejado grande "Arraste as fotos aqui" com helper Spectral italic, ações rodapé ("Limpar rascunho" + pill "Próximo Passo →") | `EditForm`/`BarraPhotos` | re-skin do form: cards de categoria, dropzone, pills de passo |
| **Perfil** | avatar grande + "Bem-vindo de volta, Nome" (kicker italic), **rail de navegação vertical** com pill ativo, card "Dados da Conta" 2-col, card escuro "Próximo Vento", anúncios recentes | `AccountNav` + páginas `conta/*` | rail vertical estilizado + cards 2-col + header de perfil |
| **Sombra** | tintada verde-floresta `rgba(20,72,62,0.18)`, hover lift `-3px` | a verificar | padronizar sombra/hover em cards e botões |
| **Header/Footer** | header sticky sand 92% + blur; CTA "Anunciar" gold escasso; footer escuro com "Born in Cumbuco · Made for the world" | `SiteHeader`/`HeaderNav`/`Footer` | alinhar blur, o CTA gold único e o footer escuro |

**Resumo:** ~70% já está lá. O gap é **consistência de hierarquia** (kicker→headline),
**3 telas internas** (detalhe, anunciar, perfil) e **micro-polish** (sombra tintada,
pills, dropzone).

---

## 2. Camadas de trabalho (do mais barato/global pro mais específico)

### Camada A — Primitivos compartilhados (`components/ui.tsx`, `lib/tokens.ts`, `globals.css`)
Mexer aqui propaga pro app inteiro. Fazer primeiro.

1. **`<Kicker>`** — novo primitivo: Spectral italic, tamanho `kicker-editorial`, cor `inkMute`.
   Padroniza o "abre-seção" do Stitch. (Hoje cada seção faz inline.)
2. **`<SectionHead>`** — kicker + headline Archivo 900 uppercase, centralizado, com gap fixo.
3. **Sombra tintada** — adicionar token `shadow.card = '0 6px 24px rgba(20,72,62,0.10)'` e
   `shadow.hover` (lift `-3px`). Aplicar em `card`/`Button`.
4. **`Button` pill** — variante `pill` (raio `full`) pro CTA "Próximo Passo →" e similares.
5. **`<DarkStage>`** — wrapper de seção fundo `color.dark`, texto branco/aqua, com losango decorativo.

### Camada B — Chrome (header, footer, busca)
6. `SiteHeader`/`HeaderNav` — sticky sand 92% + `backdrop-filter: blur(12px)`; **um** CTA gold "Anunciar".
7. `Footer` — fundo `dark`, wordmark dois tons, "Born in Cumbuco · Made for the world".
8. `SearchBox` — caixa sobreposta ao hero (estilo do alvo).

### Camada C — Home / landing (`app/page.tsx`, `HomeIntro`, `HowItWorks`)
9. Hero: escala do título (`headline-lg` 56px desktop / 38px mobile) + kicker.
10. Seção editorial foto+texto 2 colunas (reusar `HomeIntro`).
11. `HowItWorks` em `DarkStage`.
12. Faixa de confiança ("Mais confiança em cada etapa") com 4 ícones.
13. Divisores `DiamondTrail` entre blocos.

### Camada D — Card de anúncio (`ListingCard`)
14. Já maduro — só aplicar sombra tintada/hover e conferir raios (`card` 16).

### Camada E — Telas internas (re-skin, sem tocar lógica)
15. **Detalhe** (`app/anuncio/[id]`, `Gallery`, `ContactActions`, `DealBox`): mosaico de
    galeria + card de preço **sticky** no rail direito (mantendo as ações reais) + specs
    grid 2-col com ícones + card escuro "Vendedor Verificado".
16. **Anunciar** (`app/anunciar`, `EditForm`, `BarraPhotos`): pills de passo, cards de
    categoria com ícone circular, dropzone tracejado grande, ações de rodapé.
17. **Perfil/Conta** (`app/conta/*`, `app/perfil/[id]`, `AccountNav`): header de perfil
    com avatar+kicker, rail vertical com pill ativo, cards 2-col, anúncios recentes.
18. **Negociações** (`app/pedidos`, `app/chat`, `DealBox`, `RequestActions`): **só** o
    shell 2-painéis e o estilo de lista/thread do Stitch — conteúdo = nossos pedidos/deals,
    **sem composer de chat**.

### Camada F — Mobile
19. Conferir cada re-skin no breakpoint (`MobileChrome`, tab bar com FAB gold "Anunciar").

---

## 3. Ordem de execução sugerida (PRs pequenos, verificáveis)

> Cada passo passa pelo gate da casa: `tsc --noEmit` + `test:run` + `lint` + `build`.
> Nenhum passo altera Prisma/migrations/rotas/API.

1. **PR1 — Primitivos (Camada A).** `Kicker`, `SectionHead`, sombra tintada, `Button pill`,
   `DarkStage`. Baixo risco, alto alcance.
2. **PR2 — Chrome (Camada B).** Header/Footer/SearchBox.
3. **PR3 — Home (Camada C).** Hero + seções editoriais + palco escuro. É a tela mais vista.
4. **PR4 — Card + grid (Camada D).** Polish do `ListingCard`.
5. **PR5 — Detalhe (E.15).**
6. **PR6 — Anunciar (E.16).**
7. **PR7 — Perfil/Conta (E.17).**
8. **PR8 — Negociações shell (E.18).**
9. **PR9 — Passada mobile (Camada F).**

---

## 4. Guarda-corpos (o que NÃO fazer)

- ❌ Não criar chat/composer de mensagens (não existe no backend).
- ❌ Não criar mapa interativo, boost pago, ou qualquer feature que o Stitch sugeriu.
- ❌ Não alterar rotas, nomes de rota, params de busca, contratos de API, state machine,
  regras de `lib/components.ts` (sellables/reservas), ou fluxo de contato/WhatsApp.
- ❌ Não trocar valores de token "no olho" — `lib/tokens.ts` é fonte única.
- ✅ Mudança permitida = JSX/estilo/hierarquia + novos primitivos visuais em `ui.tsx`.

---

## 4b. Padrões extraídos do código Stitch (ground-truth dos exports .zip)

> Os 3 zips trazem o **HTML/CSS real** das telas Lifestyle. Tokens batem 1:1 com
> `lib/tokens.ts`. Material Symbols é a fonte de ícone do Stitch — no app, traduzir
> pra nosso vocabulário (losango/emoji/SVG) ou adotar Material Symbols se quisermos.

### Estado real × alvo (telas internas)
- **Home / Detalhe / Chrome / Card:** já no alvo (ver §1). Nada estrutural a fazer.
- **Detalhe → card "Vendedor verificado":** ✅ FEITO (card escuro, verificado em preview).

### Anunciar — `anunciar_tipo_e_ficha_lifestyle` (mantendo NOSSO wizard/lógica)
Aproveitar só o vocabulário visual:
- **Pill de passo no header:** `bg-surface-container rounded-full` + losango + label-caps "PASSO 1 DE 4".
- **Par kicker→headline:** kicker italic "Compartilhe o vento" (cor `primary`) → "O QUE VOCÊ ESTÁ VENDENDO?" (Archivo 900 uppercase, `headline-lg` 56px/38px mobile).
- **Cards de categoria:** botão `bg-surface border-1.5 border-line-card rounded-[16px]`, ícone 40px (`ink-faint`→`primary` no hover/ativo) + label-caps; hover `-translate-y-1`; ativo `.active-category` = borda `#005245` + `box-shadow: 0 10px 25px -5px rgba(20,72,62,0.18)`.
- **Inputs:** label-caps 11px + `h-[52px] border-1.5 border-line-input rounded-[11px]`, focus `ring-4 ring-primary-fixed border-primary`.
- **CTA:** "Próximo Passo →" — `Button pill`/12px, `shadow`, ícone seta. (Camada A já tem `pill`.)
- **Sidebar editorial sticky (col-5):** foto `rounded-[24px]` + gradiente `from-dark-stage/80`, kicker gold + headline + bullets losango-gold. Opcional/decorativo.

### Perfil — `meu_perfil_e_configura_es_lifestyle` (DECISÃO DE ARQUITETURA ABERTA)
Bento dashboard que **não mapeia 1:1** com nossas páginas (`/conta` admin estreito +
`/perfil/[id]` público). Padrões reutilizáveis sem virar redesign de arquitetura:
- **Header de perfil:** avatar grande (128–160px, `border-4 border-white shadow-lg`) +
  kicker italic "Bem-vindo de volta," (cor `secondary`/gold) + nome em `headline-lg`
  cor `primary` + losango "Membro desde…".
- **Rail de nav (se adotarmos layout 2-col em `/conta`):** card branco `rounded-[16px]`,
  item ativo = `bg-primary text-white` com losango branco girado; inativos hover `sand-bg`.
- **Card "Dados da Conta":** `rounded-[16px] border-line-card`, header com diamond-trail +
  "Editar", campos em **grid 2-col** (`gap-px bg-line`) — label-caps 10px uppercase +
  valor `font-bold` + ícone Material (verified/location_on/public).
- **Card escuro "Próximo Vento / Temporada":** `bg-dark-stage rounded-[16px]` com foto
  `opacity-60` + gradiente + kicker `tertiary-fixed` + headline. (= nosso `DarkStage`.)
- ⚠️ "Impulsione seus anúncios" (boost) e contadores de visualização = **features
  inexistentes**. Só estilo/placeholder; não ligar comportamento.

**Recomendação Perfil:** trazer só o **header de perfil** (avatar grande + kicker) e o
**card "Dados da Conta" 2-col** pro `/conta` atual — ganho visual alto, sem mudar
arquitetura/rotas. Deixar o rail/bento completo como fase futura se o Felipe quiser
unificar `/conta` + `/perfil`.

### Mobile (Camada F) — padrões extra dos exports mobile
- **Anunciar mobile — dropzone de fotos (bento tracejado):** grade onde o 1º slot é
  `col-span-2 row-span-2` (principal) + slots `aspect-square`; todos
  `border-2 border-dashed border-line-input rounded-xl bg-white` com hover
  `surface-container-low`. Mapeia nos slots atuais (`KITE_SLOTS`/`BARRA_SLOTS`,
  `BarraPhotos`) — só estilo, sem mudar upload.
- **Perfil+Favoritos mobile — abas:** "Favoritos" / "Meus anúncios" com ativo
  `border-b-2 border-primary` + label-caps. ⚠️ No app são **rotas separadas**
  (`/favoritos`, `/conta/anuncios`) — não fundir. Reusar só o estilo de aba se útil.

### Negociações — DUAS telas Stitch diferentes (cuidado pra não confundir)
- ❌ **"Negociações e Mensagens"** — chat inventado (composer/bolhas). NÃO existe backend. Descartar.
- ✅ **"Minhas Negociações Lifestyle"** — **lista** de negócios: kicker "Gestão de
  Equipamentos" → "Minhas Negociações" (`headline-lg`), cards com `price-display` +
  CTA "Conversar no WhatsApp". **Mapeia limpo no `/pedidos`** (estruturado + WhatsApp,
  sem chat). Este é o alvo bom pra `/pedidos`/`RequestActions`/`DealBox`.

## 5. Referências

- Telas-alvo: projeto Stitch `Kite Tropos Design System` (13648828891852244242),
  variantes **"- Lifestyle"** (são as boas; ignorar as `image.png` soltas).
- Design book atual: `docs/DESIGN-BOOK.md`, `docs/HANDOFF-CLAUDE-DESIGN.md`.
- Tokens: `apps/web/lib/tokens.ts`. Primitivos: `apps/web/components/ui.tsx`.
