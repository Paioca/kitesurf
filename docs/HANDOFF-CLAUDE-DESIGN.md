# Handoff de Redesign — Vaya (para Claude Design)

> **Para que serve este documento:** guiar um redesign **somente de UX/visual** sem
> quebrar o backend. Aqui está o que cada botão faz, a lógica de cada fluxo e — o
> mais importante — **o que pode mudar (estilo) e o que NÃO pode mudar (contrato com
> a API)**. Leia a seção "Regras de ouro" antes de tocar em qualquer tela.

Stack: Next.js 14 (App Router) · Server Components + Route Handlers · Prisma/Supabase ·
deploy Vercel. Marketplace de equipamento de kitesurf (Fase 0 — sem pagamento/checkout).

---

## Regras de ouro (o contrato)

**PODE mudar livremente (é o objetivo do redesign):**
- Cores, espaçamento, tipografia, raios, sombras, ícones, ilustração.
- Composição e layout dos cards, grids, hierarquia visual, estados vazios.
- Ordem e agrupamento visual dos campos de um formulário (desde que os mesmos campos continuem existindo e enviando os mesmos valores).
- Microanimações, transições, skeletons.
- Layout mobile vs desktop.

**NÃO pode mudar (quebra o backend / a regra de produto):**
1. **Rotas e `href`s.** Não renomear caminhos (`/anunciar`, `/pedidos`, `/anuncio/[id]`, etc.).
2. **Nomes de campo e valores enviados às APIs.** O que o formulário manda no corpo da requisição é contrato (ver "Contratos de API" abaixo). Ex.: a condição do kite envia `semi_otimo`, não "Semi novo" — o rótulo é visual, o **value** é fixo.
3. **Vocabulário controlado (taxonomia).** Dropdowns e chips de ficha (tamanho, condição, bladder, mangueiras, spot) são listas fechadas vindas do banco. **Não transformar em texto livre** e não inventar opções novas.
4. **Campos obrigatórios.** O que tem `*` é exigido pela API. Foto é obrigatória (mín. 3). Não tornar opcional.
5. **Passos de confirmação.** Antes de enviar **oferta** ou **visita** existe um passo "Estou ciente… + aviso anti-spam". **Não remover** (é regra de produto, anti-spam/anti-fake).
6. **Sem campo de descrição livre.** Decisão de produto: o anúncio é 100% estruturado. Não adicionar textarea de "descrição".
7. **Login sem senha.** Auth é telefone + código (OTP). Não adicionar campo de senha.
8. **Classes utilitárias e ids com lógica:** `only-mobile`, `only-desktop`, `kl-input`, `kl-select`, `kl-scroll` (CSS); `id="otp-0..5"` (foco automático do código). Manter.
9. **Acessibilidade — não reintroduzir interativo aninhado.** No card de anúncio, o botão **Favoritar** fica **fora** do `<a>` do card (são irmãos, não aninhados). Não voltar a colocar `<button>` dentro de `<a>`. Manter os `aria-label` da galeria e do favorito.

Quando em dúvida se algo é "só visual" ou "load-bearing", trate como load-bearing e pergunte.

---

## Onde mora o estilo

- **Tokens:** `apps/web/lib/tokens.ts` — `color`, `font`, `radius`, `heroGradient`. **Mudar o visual começa aqui.**
- **Primitivos:** `apps/web/components/ui.tsx` — `Logo`, `Button`, `Field`, `TextInput`, `Chip`, `SectionLabel`, `Diamond`.
- **CSS global / classes utilitárias:** `apps/web/app/globals.css` (inclui `.kl-input`, `.kl-select`, breakpoints `.only-mobile`/`.only-desktop` em 900px).
- A maior parte das telas usa **estilos inline** + tokens. Redesign = trocar tokens e os inline styles, mantendo a estrutura de dados.

---

## Mapa de rotas

| Rota | O que é | Render |
|---|---|---|
| `/` | Home = marketplace (busca + faixa "Como funciona") | Server |
| `/entrar` | Login **e** cadastro (mesmo fluxo, OTP) | Client |
| `/anunciar` | Criar anúncio (tela única) | Client |
| `/anuncio/[id]` | Detalhe do anúncio + contato | Server |
| `/anuncio/[id]/editar` | Editar anúncio (dono) | Client |
| `/pedidos` | Caixa de ofertas/visitas (recebidas e enviadas) + negócio | Server |
| `/conta` | **Administrativa** — dados da conta + menu | Server |
| `/conta/anuncios` | Meus anúncios (gerenciar) | Server |
| `/conta/editar` | Editar perfil (foto, nome, e-mail, IG, idioma) + excluir conta | Client |
| `/favoritos` | Anúncios salvos | Server |
| `/perfil/[id]` | Perfil público (reputação, avaliações) | Server |
| `/termos` · `/privacidade` | Páginas legais (versão inicial) — linkadas no `/entrar` | Server |
| `/moderacao` | Fila de denúncias (admin) | Server |

> **Rotas protegidas** (`/favoritos`, `/pedidos`, `/conta*`) redirecionam o deslogado para `/entrar?next=<rota>` e o login volta ao destino. Não remover o `?next=`.

Navegação fixa: **header desktop** (`SiteHeader`) tem Logo + atalhos (Anúncios/Pedidos/Favoritos quando logado) + Anunciar. **Mobile** usa barra inferior (`MobileTabBar`): Início · Favoritos · Anunciar · Pedidos · Conta.

---

## Tela a tela: cada botão e o que dispara

### `/entrar` — login/cadastro (OTP, sem senha)
Fluxo em etapas: **telefone → código → perfil → pronto** (a etapa "perfil" só aparece para conta nova).
- **Seletor de país (DDI)** — define o prefixo do telefone. Default **+55** (Brasil). Lista fechada. *Visual livre; manter o default +55 e a lista.*
- **"Enviar código"** → `POST /api/auth/otp/request {phone}`. Em ambiente de teste o código volta e auto-preenche.
- **Células do código** (6 inputs, `id="otp-0..5"`) → ao completar, valida via `POST /api/auth/otp/verify`. *Manter os ids e o auto-foco.*
- **Etapa perfil:** **foto (obrigatória)** + nome. (E-mail e Instagram **NÃO** ficam aqui — moram no perfil.) → `POST /api/auth/otp/verify {phone, code, name, avatarUrl, locale}`.

### `/anunciar` — criar anúncio
Campos enviados em `POST /api/listings`. **Os campos de "ficha" são renderizados dinamicamente a partir do schema da categoria (banco)** — não hardcode/remova; restilize o componente genérico.
- **Tipo:** Kite · Barra · Kite+Barra(kit). Define `categoryId` e `hasBarra`.
- **Ficha (kite):** Tamanho (m²)\*, Condição\*, Micro furos (qtd), Reparos (qtd), Bladder, Mangueiras → vão em `attributes` com **values fixos** (ver tabela de vocabulário).
- **Banner "Atenção"** (banimento por omissão) — **manter** (regra de confiança).
- **Fotos:** mínimo 3; upload via `POST /api/uploads/image` (retorna `{url, thumbUrl}`); cada foto tem `component: 'kite' | 'barra'`.
- **Preço:** `price` (centavos no envio). No kit, opcionais `kitePrice`/`barraPrice`.
- **Local e entrega:** **Spot** (dropdown fechado → `city`), "Outro ponto" (texto livre → `spot`), e **Retirada / Envio** (dois toggles, ≥1 obrigatório → `pickup`, `shippable`).
- **"Publicar anúncio"** → `POST /api/listings`. O botão mostra o que falta enquanto inválido.

### `/anuncio/[id]` — detalhe + contato
- **Favoritar (♡)** → `POST`/`DELETE /api/listings/[id]/favorite`.
- **"Fazer oferta"** → abre card com campo de valor + **"Estou ciente… + aviso anti-spam"** → **"Confirmar oferta"** → `POST /api/listings/[id]/request {type:'offer', amount}`. *Não remover o passo de ciência.*
- **"Agendar visita"** → abre card com **resumo da ficha + aviso** → **"Confirmar agendamento"** → `POST /api/listings/[id]/request {type:'visit'}`. *Idem.*
- **Status do pedido** (box verde "Visita solicitada / Oferta enviada") e **"Falar no WhatsApp"** quando liberado. *Visual livre; manter a presença.*
- **OwnerControls** (se for o dono): editar/pausar/excluir.

### `/pedidos` — ofertas/visitas + negócio
- **Selo Oferta/Visita** (verde/âmbar) por card. *Manter a distinção visual.*
- **Recebidos (vendedor):** **Aceitar/Recusar** → `POST /api/requests/[id] {status}`. Botão **"Falar com {comprador} no WhatsApp"** (link `wa.me`).
- **DealBox** (negócio): **"Marcar como vendido"** → `POST /api/requests/[id]/sold`; **"Confirmar que comprei"** → `POST /api/deals/[id]/confirm`; **avaliação** (estrelas + tags por papel + comentário) → `POST /api/deals/[id]/review {rating, tags, comment}`. Mensagem de importância — **manter**.

### `/conta` — administrativa
- Bloco **"Dados da conta"**: Telefone/WhatsApp (verificado), E-mail, Instagram (read-only; telefone é o login e não muda).
- Menu: Editar perfil · Meus anúncios · Meu perfil público · **Sair** (`POST /api/auth/logout`).

### `/conta/editar` — editar perfil
Campos: foto, nome, **e-mail**, Instagram, idioma → `PATCH /api/auth/me`. Botão **"Excluir minha conta"** → `DELETE /api/auth/me` (confirmação obrigatória).

---

## Fluxos lógicos (resumo)

1. **Auth:** telefone + código (OTP). 1 número = 1 conta. Sessão em cookie (30 dias). Sem senha.
2. **Anunciar:** ficha estruturada (taxonomia) + fotos obrigatórias → anúncio entra na busca.
3. **Contato estruturado (substitui chat):** comprador faz **oferta** (valor) ou **visita** → vendedor é avisado (SMS) **com o contato do comprador** → trocam no WhatsApp. Sem chat livre na plataforma.
4. **Negócio + reputação:** vendedor "marca vendido" → comprador "confirma compra" → vira **concluído**. Avaliação (padronizada) pode ser feita assim que o negócio existe, mas só fica **pública** quando os dois confirmam. Reputação no perfil só conta negócios concluídos.
5. **Favoritos / Denúncia / Moderação:** ações simples com endpoints próprios.

---

## Contratos de API (campos que NÃO podem mudar de nome/valor)

| Endpoint | Corpo (chaves fixas) |
|---|---|
| `POST /api/auth/otp/request` | `phone` |
| `POST /api/auth/otp/verify` | `phone, code, name?, email?, avatarUrl?, instagramHandle?, locale?` |
| `PATCH /api/auth/me` | `name?, email?, instagramHandle?, avatarUrl?, locale?` |
| `POST /api/listings` | `categoryId, brandId?, modelId?, year?, attributes, title, price, city, spot?, pickup?, shippable, images[], hasBarra?, kitePrice?, barraPrice?, barraAttributes?` |
| `POST /api/listings/[id]/request` | `type ('offer'|'visit'), amount?` |
| `POST /api/requests/[id]` | `status ('accepted'|'declined')` |
| `POST /api/requests/[id]/sold` | — |
| `POST /api/deals/[id]/confirm` | — |
| `POST /api/deals/[id]/review` | `rating (1-5), tags[]?, comment?` |
| `POST`/`DELETE /api/listings/[id]/favorite` | — |
| `POST /api/uploads/image` · `/avatar` | `multipart file` → retorna `{url, thumbUrl}` |

`images[]` = `{ url, thumbUrl?, component? ('kite'|'barra') }`.

---

## Vocabulário controlado (values FIXOS — rótulo é livre, value não)

**Condição (kite):** `novo_lacrado` · `novo_10x` · `semi_otimo` · `semi_desgaste` · `usado_desgaste`
**Condição (barra):** `novo` · `seminovo` · `bom` · `usado`
**Bladder:** `zero` · `microfuro_adesivado`
**Mangueiras:** `original` · `ja_trocadas`
**Tamanho (m²):** 5,6,7,8,9,10,11,12,14,17
**Spot (→ `city`):** Cumbuco · Taíba · Fortaleza · Praia do Futuro · Paracuru · Ilha do Guajiru · Preá
**Tipo de pedido:** `offer` · `visit` — **Status:** `accepted` · `declined`
**Tags de avaliação:** vendedor→comprador e comprador→vendedor têm conjuntos fixos (ver `components/DealBox.tsx`).

> Esses values vivem no banco (taxonomia da categoria) e em enums do Prisma. O designer
> mexe nos **rótulos exibidos** e no estilo dos chips/dropdowns, **nunca** nos values.

---

## Checklist final (antes de entregar o redesign)

- [ ] Nenhuma rota/`href` renomeada.
- [ ] Mesmos campos de formulário, mesmos `value`s enviados (conferir contra a tabela de contratos).
- [ ] Dropdowns/chips continuam **listas fechadas** (sem texto livre novo).
- [ ] Foto obrigatória (mín. 3) mantida; sem campo de descrição livre; sem senha.
- [ ] Passos "Estou ciente + anti-spam" antes de oferta/visita mantidos.
- [ ] Banner "Atenção" no /anunciar mantido.
- [ ] Selo Oferta/Visita e status destacado dos pedidos mantidos.
- [ ] Classes `only-mobile`/`only-desktop`/`kl-*` e `id="otp-*"` preservadas.
- [ ] Favoritar continua **fora** do link do card; `aria-label`s da galeria/favorito mantidos.
- [ ] Links de Termos/Privacidade no `/entrar` continuam apontando para `/termos` e `/privacidade`.
