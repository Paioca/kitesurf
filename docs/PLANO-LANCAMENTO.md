# Plano de lançamento — pós-auditoria v3

**Data:** 2026-06-20 · **Método:** investigação fan-out (7 áreas no código + descoberta de adjacentes).

## Veredito

Pronto para **beta controlado e privado** (1 hub, Cumbuco, convidados) **após uma rodada curta**.
**Não** está pronto para lançamento amplo/indexável. O que bloqueia não é volume de trabalho —
é um punhado de incoerências de domínio que fazem o produto **mentir pro usuário** (preço muda do
card pro detalhe; "identidade verificada" que não existe; anúncio some inteiro ao vender uma peça)
+ uma exposição de segurança concreta (Next 14.2.x com advisories *high*). Maioria é cirúrgico.
O item mais pesado (venda por componente) **não precisa ser construído — precisa ser desligado.**

---

## 🔴 FASE 0 — ações do dono (fora de código), antes de qualquer beta
- **Rotacionar TODAS as credenciais** que circularam (DATABASE_URL, service-role + anon do Supabase,
  Twilio, DSN Sentry, secret de sessão). Assumir comprometidas.
- **Confirmar `.env` fora do Git** (só `.env.example` versionado).
- **Travar `seed-journey`/`seed-cumbuco` contra prod** (gravam picsum/pravatar + telefones fake, sem
  guarda de `NODE_ENV`).
- **Limpar dados de teste do banco de prod** (perfis `+558599100000…`, anúncios picsum/pravatar).

---

## 🔴 FASE 1 — bloqueia lançamento amplo (código)

### 3.1 Venda por componente — DESLIGAR, não construir ⭐
Hoje a UI vende "só o kite / só a barra" mas o backend não tem o conceito: vender qualquer peça marca
o anúncio **inteiro** `sold`. `Request` não tem `target`, `Deal` é único por `listingId`. **Opção A**
(implementar `target` de verdade: schema+migration+deals+browse+UI) = **muito-alto**, é roadmap, não
bloqueio. **Opção B (RECOMENDADA):** tratar tudo como conjunto — `kitePrice=null,barraPrice=null` na
criação, podar campos do schema/form, esconder pills "Só o kite/barra", remover o ramo
`{hasBarra,barraPrice:{not:null}}` das 3 ocorrências em `browse.ts`. **Esforço: baixo.** Com isso,
1 anúncio = 1 item = 1 venda e a trava atômica que já existe fica correta por construção. **Mata 6
achados + 6 adjacentes de uma vez** e elimina metade do 3.2 de graça.

### 3.2 Consistência de preço (card↔detalhe↔filtro↔faceta↔perfil)
O mesmo kit aparece com 3 preços; filtro/faceta usam `price` (conjunto), card/sort usam efetivo.
**A Opção B de 3.1 resolve a maior parte** (tudo passa a usar `price`). Sobra: alinhar `profile.ts` e
`getMyListings` à fórmula do `toCard`. **Esforço (pós-3.1-B): baixo.**

### 3.3 State machine de Listing (sold é terminal)
PATCH grava `status` sem checar origem → `sold→active` ressuscita item vendido; e dá pra **editar
campos de anúncio vendido** (corrompe histórico). **Completo:** `canTransition(from,to)` (active↔paused
livre; →archived; archived→active só via republicar; **sold = terminal**) + bloquear edição quando
sold + esconder "Editar" em sold/archived. **Médio.** **Fallback (beta):** dois early-returns no PATCH
(409 se sold; rejeitar archived→active cru). **Baixo.**

### 3.4 Categorias inativas no browse + limpar dados de teste
(a) `BASE` não filtra `category.active` → anúncio em categoria inativa aparece. Add
`category:{is:{active:true}}` no BASE + replicar em `profile.ts`. (b) Purga de dados de teste por
prefixo de telefone, na ordem de FK (review→deal→request→favorite→listing→user). **Médio** (purga só:
baixo).

### 3.5 Upgrade do Next — é MAJOR, não patch
`14.2.35` é o topo da linha; advisories *high* (Image Optimizer DoS via `remotePatterns` que usamos,
HTTP smuggling, SSRF) só têm fix em **15.5.x+**. **Completo:** migrar Next 15.5.x + React 18→19 (+
`cookies()`/`headers()` viram async → afeta `session.ts`/`ratelimit`; caching default mudou; matriz
Sentry; CSP). **Esforço: alto.** **Fallback (beta privado, não-indexável):** mitigar só o Image
Optimizer (restringir `remotePatterns`, mover avatares de seed pro storage próprio, `minimumCacheTTL`).
NÃO remove smuggling/SSRF. **Baixo.**

### 3.6 Normalização de telefone (E.164 no servidor)
Regex aceita com/sem `+`; phone cru vira chave de rate-limit + conta → `+5585…` ≠ `5585…` = 2 contas
+ 2 buckets de rate-limit. **`lib/phone.ts` (`normalizePhone`)** aplicado IDÊNTICO em request/verify/
generateOtp/verifyOtp (se normalizar em um só ponto, OTP nunca valida). **Completo** (com migration de
dados legados + consolidar duplicatas antes de apertar `@unique`/regex): **alto.** **Fallback:** só o
fluxo novo (request+verify+otp coerentes), sem tocar legado nem apertar `@unique`: **médio.**

---

## 🟡 FASE 2 — antes de divulgar amplo
- **Copy de confiança** — "Identidade verificada / Golpista não circula / sem medo do golpe / CPF
  verificado" são **falsos** (só telefone é verificado; CPF nunca coletado). Varrer `page.tsx`
  (22,25,60,203,204,247 — inclui OG indexável) + `perfil/[id]/page.tsx:88`. Linguagem de redução de
  risco. **Baixo** — antecipar pro beta.
- **Jurídico final** (Termos+Privacidade hoje "provisórios") + **validar que as afirmações são
  cumpridas no código** (strip EXIF/GPS em todo caminho de upload; "exclusão=anonimização"). **Médio.**
- **Moderação com ação real** — hoje PATCH de report só muda status da denúncia. Infra de block já
  existe e é enforced; fix é wiring: ação admin `User.status='blocked'` + `Listing.status='archived'`
  **atômico** (senão o anúncio do golpista fica no ar). **Médio.**
- **E2E do funil** (anunciar→buscar→ofertar→aceitar→vendido) + transições válidas/inválidas. **Médio.**
- **Paralelizar upload de fotos** (hoje sequencial), lotes de 2-3. **Baixo.**
- **Reconciliar docs** — `ESTADO-ATUAL.md` ainda diverge; `AUDITORIA-CONTEXTO.md` declarou "pronto"
  cedo demais. **Baixo.**

---

## ⚪ FASE 3 — escala / dívida (pós-lançamento)
Nada bloqueia 1 hub. Facetas em SQL (`loadActiveRows` faz scan ilimitado, + 2º scan não-cacheado no
price_sort); ISR/separar favoritos do force-dynamic; **cache de catálogo** (`getBrands` sem cache —
barato, antecipar); **`next/font`** (fontes render-blocking, maior alavanca de LCP — barato,
antecipar); **gate do Sentry Replay** (~50KB em 100% das sessões — baixo); **i18n real** (toggle
"English" é no-op — esconder por ora); restaurar arquivado; dividir componentes/tipar ~43 `any`.

---

## Adjacentes que a auditoria NÃO pegou (mais sérios)
1. 🔴 **Bloquear user sem arquivar anúncios deixa o golpista no ar** (browse não faz join no status do
   dono) — moderação tem que ser atômica.
2. 🔴 **Upgrade do Next é major, não patch** — muda o cronograma (único item alto que bloqueia o amplo).
3. 🔴 **Editar campos de anúncio sold/archived corrompe o histórico de venda.**
4. 🟡 Segundo scan ilimitado e não-cacheado no `price_sort`.
5. 🟡 Selo "CPF verificado" no perfil (família da copy enganosa).
6. 🟡 Catálogo sem cache nenhum (pior que o force-dynamic da home).
7. ⚪ Inconsistência seed↔runtime de telefone pode criar conta órfã.

---

## Os dois "menores caminhos"

### → Beta seguro (privado, convidados) — dias
1. Fase 0 inteira (dono). 2. **3.1-B** (desliga venda avulsa → destrava 3.2 de graça). 3. **3.4 purga**.
4. **3.3 fallback** (sold terminal + bloquear edição de sold). 5. **3.6 fallback** (fluxo novo).
6. **3.5 fallback** (mitigar Image Optimizer). 7. **Copy de confiança** (antecipar, baixo).

### → Lançamento amplo (indexável) — soma o que falta
8. **3.5 completo** (migração Next 15 + React 19 — o item alto que de fato bloqueia o amplo).
9. **3.3 completo**. 10. **3.4 BASE**. 11. **3.6 completo** (migration + consolidar duplicatas).
12. **3.2 ajuste**. 13. **Fase 2 restante**. 14. Baratos de Fase 3 que valem antecipar (`next/font`,
cache de catálogo, gate Replay, esconder "English").

**Corte:** Fase 3 (facetas SQL, ISR, refactor de `any`, restaurar arquivado) fica pós-lançamento.

## Os dois pontos mais defendidos
- **Desligar venda por componente (3.1-B)** em vez de construir `target` — resolve o item mais pesado
  em horas, com baixo risco, e elimina de graça o maior bug de preço.
- **O upgrade do Next virou major** — único item alto que bloqueia o amplo; planejar como migração
  (React 19, caching default, async `cookies()`/`headers()`), não como `npm update`.
