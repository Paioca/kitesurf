# Auditoria Pré-Lançamento — Kitetropos

Consolidação de achados verificados de múltiplas jornadas adversariais (auth, anúncios barra/kit, contato, deals, notificações, favoritos, deleção de conta, moderação).

- Data: 2026-06-26
- Total de achados verificados recebidos: 44
- Confirmados (após dedupe): 28 únicos
- Incertos (checar manualmente): 2
- Falsos-positivos / sem-fix (refutados): 2 mantidos para registro

> Dedupe aplicado: o grupo "reversão promete pausada mas força active" apareceu em **6 achados** de 2 jornadas — consolidado em **R-1**. O grupo "WhatsApp órfão / contato liberado durante disputa" apareceu em 3 achados — consolidado em **C-1**. "Barra-only compatible_brand + semântica de marca" consolidado em **A-1**. "Phone deletado gera waLink vazio" (achados #1 e #4 da jornada de deleção) consolidado em **D-1**.

---

## Tabela-resumo

| Severidade | Jornada | Título | Arquivo:linha | Classe |
|---|---|---|---|---|
| **BLOQUEADOR** | Contato/Deal | WhatsApp órfão: contato liberado persiste em deal disputed (request fica 'accepted') | lib/deals.ts:294-299; pedidos/page.tsx:104; requests.ts:160 | estado-vs-superficie |
| **BLOQUEADOR** | Deleção de conta | WhatsApp inválido após conta excluída (waLink retorna URL vazio, botão renderiza) | lib/lifecycle.ts:73; lib/requests.ts:14-16; pedidos/page.tsx:208 | estado-vs-superficie |
| **BLOQUEADOR** | Deleção de conta | CPF original persistido em texto claro no auditEvent.before | lib/lifecycle.ts:53-55,87; lib/audit.ts:40-51 | pii/segurança |
| alta | Moderação | Vendedor suspenso não notifica compradores; contato liberado vira WhatsApp inválido | lib/moderation.ts:24-29 | estado-vs-superficie |
| alta | Anúncios | compatible_brand nunca exibido em anúncio barra-only + marca tratada como 'feita por' | anuncio/[id]/page.tsx:96-107,138-150; anunciar/page.tsx:201,397 | dado-orfao + copy-vs-comportamento |
| alta | Deals/Reversão | Reversão promete 'pausada' mas força 'active' (copy + comentários enganosos) [R-1] | DisputeList.tsx:63; lib/deals.ts:183,243,277,318; DealBox.tsx:98,110 | copy-vs-comportamento |
| alta | Notificações | sold_elsewhere leva a 404 quando listing foi soft-deleted | lib/notification-copy.ts:51-52; lib/queries.ts:78 | cta-sem-destino |
| alta | Favoritos | Favoritos órfãos: kit com peça vendida permanece nos favoritos | lib/browse.ts:488 | estado-vs-superficie |
| alta | Favoritos | Sem notificação a quem favoritou quando peça é vendida | lib/deals.ts:166-169; lib/notifications.ts:39-50 | copy-vs-comportamento |
| alta | Favoritos | Sem notificação a quem favoritou quando anúncio é removido | lib/lifecycle.ts:32-35; lib/moderation.ts:38-41 | copy-vs-comportamento |
| alta | Deals/Reviews | Rating cacheado fica stale por 60s após deal sair de 'completed' | lib/browse.ts:320-326 | estado-vs-superficie |
| alta | Deleção de conta | Requests/Deals órfãos com seller/buyer deletado (mesma raiz de D-1) | lib/lifecycle.ts:65-66; lib/requests.ts:127-162 | dado-orfao |
| media | Auth | 'Tentar por e-mail' invisível em rate-limit 429 (só aparece em 502) | app/entrar/page.tsx:245,201; rateLimit.ts:91 | copy-vs-comportamento |
| media | Auth | Recuperação prende usuário em loop phone→otp sem volta para email | app/recuperar/recovery-form.tsx:17,82 | cta-sem-destino |
| media | Auth | Logout ignora falha de revokeAllSessions e segue limpando cookie | app/api/auth/logout/route.ts:13-19 | permissao-visibilidade |
| media | Auth | Copy 'Telefone atualizado' ambígua: REPLACE vs ADD | app/api/auth/recovery/phone/confirm/route.ts:71 | copy-vs-comportamento |
| media | Auth | Troca SMS→Email não limpa code nem avisa que código é novo | app/entrar/page.tsx:246-248 | cta-sem-destino |
| media | Deals | Seção 'Barra que acompanha' persiste com barra vendida (barraSoldAt) | anuncio/[id]/page.tsx:215 | estado-vs-superficie |
| media | Contato | cancelRequest permite retirada com deal disputed/reversal_requested | requests.ts:111-116 | estado-vs-superficie |
| media | Contato | Sem notificação quando contato é retirado por disputa/reversão | lib/deals.ts:294-299,330-335; notification-copy.ts:14 | copy-vs-comportamento |
| media | Deals/Reviews | 'Avaliar depois' é só client-side; perde-se ao recarregar | components/DealBox.tsx:32; lib/requests.ts:152 | estado-vs-superficie |
| media | Notificações | listing_removed sem title em deleção de conta (texto genérico) | lib/lifecycle.ts:80 | copy-vs-comportamento |
| media | Notificações | markRead falha silenciosa sem feedback (offline/500) | components/MarkNotificationsRead.tsx:17 | estado-vs-superficie |
| media | Notificações | Notificações antigas referenciam usuário deletado sem sinalização | lib/lifecycle.ts; lib/notification-copy.ts:16 | dado-orfao |
| media | Deleção de conta | Seller 'Conta removida está aguardando' (nome anonimizado mal-encaixado) | lib/lifecycle.ts:72; pedidos/page.tsx:101,206 | copy-vs-comportamento |
| media | Anúncios (placeholder) | Placeholder sem foto não exibe tamanho de barra (sizeLabel ignorado) | ListingCard.tsx:39; browse.ts:103-104 | copy-vs-comportamento |
| media | Moderação | listing_removed não navega para aba Enviados (/pedidos sem ?tab=sent) | lib/notification-copy.ts:57-59 | cta-sem-destino |
| media | Moderação | Copy ambíguo: removido por moderação vs arquivado pelo dono | anuncio/[id]/page.tsx:176-179,250-251 | copy-vs-comportamento |
| media | Moderação | Anúncio removido por moderação pode ser 'reativado' (canTransition ignora deletedAt) | lib/listing-status.ts:9-21 | estado-vs-superficie |
| media | Moderação | Dono não consegue restaurar/apelar anúncio removido (vê 404) | anuncio/[id]/page.tsx:68; lib/moderation.ts:46 | permissao-visibilidade |
| baixa | Anúncios | Header 'Kite' depois dos campos marca/modelo/ano (confusão visual) | anunciar/page.tsx:397-400 | copy-vs-comportamento |
| baixa | Deals | 'Ver perfil do vendedor' sem validação de userId (→ /perfil/null) | anuncio/[id]/page.tsx:278 | cta-sem-destino |
| baixa | Deals/Reviews | Sem CTA persistente para retomar avaliação adiada | app/pedidos/page.tsx:223-241 | cta-sem-destino |
| baixa | Notificações | Badge zera antes de confirmação vs feed ainda não-lido (SSR) | app/pedidos/page.tsx:42 | estado-vs-superficie |
| baixa | Notificações | Notificação órfã: sem FK de Notification para Listing, sem cleanup | prisma/schema.prisma:565-581; lib/maintenance.ts:1-21 | dado-orfao |
| **CHECAR MANUAL** (incerto) | Favoritos | FavoriteButton sem sync entre abas/refresh (toggle duplo teórico) | components/FavoriteButton.tsx:9 | estado-vs-superficie |
| **CHECAR MANUAL** (incerto) | Auth | afterOTP copy supostamente contradiz estado — premissa falsa | app/entrar/page.tsx:350 | estado-vs-superficie |
| (sem-fix, refutado) | Deals | Badge +Barra reage a barraSoldAt em todas as superfícies — correto | browse.ts:143; components.ts:39 | estado-vs-superficie |
| (sem-fix, refutado) | Favoritos | POST /favorite idempotente (upsert), DELETE seguro — design correto | favorite/route.ts:17-22 | corrida-idempotencia |

---

## BLOQUEADORES (impedem o lançamento)

Três achados travam o go-live: dois expõem comportamento de contato quebrado/órfão a usuários reais durante fluxos comuns (disputa, conta excluída), e um é exposição de PII (CPF) em texto claro — risco LGPD direto.

### B-1 — WhatsApp órfão: contato liberado persiste durante deal `disputed`
- **Arquivos:** lib/deals.ts:294-299 (raiz); app/pedidos/page.tsx:104 (superfície); lib/requests.ts:160 (query)
- Quando a contraparte recusa a reversão (`accept=false`), o deal vai a `disputed` mas `withdrawBuyerRequest` NÃO é chamado (é chamado só no ramo `accept=true`). O request fica `accepted`, então `r.whatsapp` continua não-nulo e `ContactLiberado` renderiza o botão de WhatsApp ativo durante a disputa. Mesma classe afeta `cancelRequest` (requests.ts:111-116), que permite retirada em disputed/reversal, contrariando a copy de irrevogabilidade.
- **Fix:** em deals.ts:294-299, antes de setar `deal.status='disputed'`, chamar `await withdrawBuyerRequest(tx, deal)` (mesmo padrão das linhas 290/332). Isso zera o whatsapp e fecha as superfícies dependentes. Mitigação rápida adicional em pedidos/page.tsx:104 filtrando deal.status em `['disputed','reversed','closed_unconfirmed']`.

### B-2 — WhatsApp inválido após conta excluída
- **Arquivos:** lib/lifecycle.ts:73; lib/requests.ts:14-16; app/pedidos/page.tsx:208
- `deleteAccount` seta `phone='deleted_${userId}'`. `waLink` faz `replace(/\D/g,'')` → string vazia (truthy), passa pelo check `{whatsapp && <a>}` e renderiza botão que abre `https://wa.me/` vazio. Mesma raiz orfaniza Requests/Deals com seller/buyer deletado (lifecycle.ts:65-66; requests.ts:127-162).
- **Fix:** em waLink, retornar `null` quando não houver dígitos: `const d = phone.replace(/\D/g,''); return d ? \`https://wa.me/${d}\` : null;` e só renderizar ContactLiberado se `whatsapp !== null`.

### B-3 — CPF persistido em texto claro no audit
- **Arquivos:** lib/lifecycle.ts:53-55,87; lib/audit.ts:40-51
- `deleteAccount` faz snapshot de `priorState` incluindo `cpf` e grava o objeto inteiro em `auditEvent.before` (InputJsonValue), sem remoção. O CPF original fica acessível em texto claro na tabela de auditoria após o usuário ter pedido exclusão. Risco LGPD.
- **Fix:** `delete priorState.cpf` antes de gravar, ou serializar snapshot explícito sem PII sensível.

---

## Detalhamento por achado

### B-1 (ver acima) — esperado: ao entrar em disputa, contato é revogado; observado: botão WhatsApp segue ativo. Causa: ramo accept=false não chama withdrawBuyerRequest.

### B-2 (ver acima) — esperado: sem contato para conta excluída; observado: botão abre wa.me vazio. Causa: waLink nunca retorna null.

### B-3 (ver acima) — esperado: CPF removido na exclusão; observado: CPF em auditEvent.before. Causa: snapshot inclui PII.

### A-1 — compatible_brand órfão + semântica de marca em barra-only (alta)
- **Esperado:** marca compatível preenchida no form aparece no detalhe da barra; rótulo distingue "feita por" de "compatível com".
- **Observado:** arrays `attrs` (96-107) e `ficha` (138-150) nunca incluem compatible_brand para barra (só o bloco isKit em 215-228 exibe). Form (anunciar/page.tsx:201) exige `brandId` para tudo, autoTitle gera "Barra · Duotone" (parece fabricante), e detalhe (linha 100) exibe `l.brand?.name` como "Marca".
- **Causa raiz:** falta de tratamento condicional `kind==='barra'` na renderização e na obrigatoriedade do seletor.
- **Fix:** remover obrigatoriedade de brand para barra; guardar seletor com `kind !== 'barra'`; mover compatible_brand para seção essencial quando barra; exibir compatible_brand (não l.brand) no detalhe barra-only.

### R-1 — Reversão promete 'pausada' mas força 'active' (alta) [consolida 6 achados]
- **Esperado:** copy reflete o status real após reversão.
- **Observado:** `unmarkPieceSale` força `status='active'` (deals.ts:183, decisão de produto jun/2026), mas DisputeList.tsx:63 diz "volta a ficar disponível (pausada)"; comentários em deals.ts:243,277,318 dizem "volta a paused"; DealBox.tsx:98/110 têm 3 redações divergentes.
- **Causa raiz:** copy/comentários não atualizados após decisão de produto.
- **Fix:** unificar copy em DisputeList.tsx:63, DealBox.tsx:98 e :110 para "volta a ficar à venda"; corrigir comentário e comentários em deals.ts:6/243/277/318.

### sold_elsewhere → 404 (alta)
- **Esperado:** clique na notificação leva a destino válido. **Observado:** href `/anuncio/{listingId}` quebra se listing soft-deleted (notFound). **Fix:** notification-copy.ts:52 retornar `/pedidos` para sold_elsewhere (como faz listing_removed).

### Favoritos órfãos kit vendido (alta)
- **Esperado:** favoritos espelham busca (kiteSoldAt/barraSoldAt null). **Observado:** getFavorites (browse.ts:488) só filtra status/deletedAt. **Fix:** adicionar `kiteSoldAt: null, barraSoldAt: null` ao where.

### Sem notificação a favoritos quando peça vendida / anúncio removido (alta x2)
- **Causa raiz:** `affectedBuyerIds` (notifications.ts:39-50) só consulta requests pending/accepted, ignora Favorite. **Fix:** estender para union com favorite.findMany; novo NotificationType (ex.: `listing_sold`).

### Rating stale 60s (alta)
- **Causa raiz:** `invalidateSellerRating` só chamado na criação de review, não nas transições de deals.ts (271/289-295/330-335). **Fix:** chamar invalidateSellerRating(sellerId) após cada emit nessas transições.

### Vendedor suspenso sem notificação (alta)
- **Causa raiz:** suspend_user (moderation.ts:24-29) não chama affectedBuyerIds/emitMany. **Fix:** notificar compradores com requests aceitos por sellerId (novo enum) ou marcar pedidos / checar user.status no render do WhatsApp.

### Achados media (resumo de fix)
- Auth 429 sem fallback email: acionar smsFailed também em 429 ou mencionar e-mail na copy inicial (entrar/page.tsx:201/245).
- Recuperação loop phone→otp: botão "Recomeçar com outro e-mail" que limpa token (recovery-form.tsx:82).
- Logout ignora revokeAllSessions: lançar exceção / transação atômica + Sentry (logout/route.ts:13).
- Copy 'Telefone atualizado' ambígua: explicitar REPLACE (confirm/route.ts:71).
- Troca SMS→Email: setCode('') + mensagem "novo código por e-mail" (entrar/page.tsx:246).
- Seção 'Barra que acompanha' com barra vendida: `{isKit && !l.barraSoldAt && (` (anuncio/page.tsx:215).
- cancelRequest em disputed: incluir disputed/reversal_requested no count de openDeal (requests.ts:111-120).
- Sem notificação de contato retirado: emitir `contact_revoked` (deals.ts:294-299/330-335 + copy).
- 'Avaliar depois' client-side: persistir deferral (Review/DealEvaluation) e hidratar reviewSkipped no mount.
- listing_removed sem title em deleteAccount: pré-carregar listing.title (lifecycle.ts:60-64) antes de anonimizar.
- markRead silencioso: trocar `.catch(()=>{})` por log + toast (MarkNotificationsRead.tsx:17).
- Notificações antigas com ator deletado: marcar/limpar em deleteAccount ou adaptar copy via deletedAt.
- Seller 'Conta removida está aguardando': usar name='[Usuário removido]' ou flag deletedAt no render.
- Placeholder sem tamanho de barra: usar sizeLabel no fallback (ListingCard.tsx:39).
- listing_removed sem ?tab=sent: case dedicado retornando `/pedidos?tab=sent` (notification-copy.ts:57).
- Copy ambíguo removido-por-moderação: checar deletedAt + status archived e exibir "removido por moderação" (anuncio/page.tsx:250).
- canTransition ignora deletedAt: passar listing completo e bloquear se deletedAt!=null (listing-status.ts).
- Dono sem restaurar/apelar: emitir notificação ao dono na remoção + página "removido por moderação" + fluxo de apelação.

### Achados baixa (resumo de fix)
- Header 'Kite' antes dos campos marca/modelo/ano (anunciar/page.tsx:400 → antes de 397).
- 'Ver perfil' sem userId: guardar render com `l.user?.id` (anuncio/page.tsx:278).
- Sem CTA persistente p/ avaliação adiada: badge "Avaliação pendente" na linha do pedido (depende de persistir deferral).
- Badge zera antes de confirmação: zerar otimista + refetch-on-error (pedidos/page.tsx:42).
- Notificação órfã sem FK: adicionar FK `onDelete: SetNull` ou job de cleanup (schema.prisma:565-581).

---

## Checar manualmente (verdict incerto)

- **FavoriteButton sem sync entre abas** (FavoriteButton.tsx:9): desync teórico, sem prova de falha no código. Não bloqueador. Validar manualmente com 2 abas; se necessário, revalidatePath ou SWR.
- **afterOTP copy contradiz estado** (entrar/page.tsx:350): partiu de premissa falsa — a copy "Seu telefone foi verificado..." está correta. Reconfirmar manualmente; provável não-bug (apenas logout silencioso como UX minor).

## Refutados (mantidos para registro, sem fix)

- Badge +Barra reage a barraSoldAt em todas as superfícies — implementação correta (browse.ts:143, components.ts:39).
- POST /favorite idempotente (upsert) + DELETE seguro — design correto (favorite/route.ts:17-22).

---

## Segunda passada (profunda) — achados novos

Achados verificados por leitura integral (não duplicam os 46 já documentados). Ordenados por severidade. Um item da entrada — `listing_removed` sem `data.title` em `deleteAccount` — foi descartado por **duplicar** o já-documentado "listing_removed sem title em deleteAccount".

### Bloqueadores novos (severidade ALTA)

**N1 — Efeito-cascata de venda nunca é desfeito: concorrentes ficam `sold_elsewhere`/`voided` para sempre**
- Esperado: ao desfazer a venda (correção 72h, reversão aceita, disputa revertida) e a peça voltar a `active`, os requests/deals de terceiros fechados por aquela venda reabrem e os concorrentes são notificados.
- Observado: as três rotas de desfazer só reconciliam o request do *próprio* comprador; os `sold_elsewhere` (requests) e `voided` (deals) de terceiros nunca voltam, sem notificação. Comprador B fica "Vendido a outro" eternamente mesmo com a peça de volta à venda.
- Causa raiz: `applyPieceSale` (`apps/web/lib/deals.ts:167-168`) é o único ponto que escreve `sold_elsewhere`/`voided` + notifica; não existe operação inversa. `correctUnconfirmed` (deals.ts:256-258), `respondReversal` accept (deals.ts:288-292) e `resolveDispute` reverse (deals.ts:330-334) só chamam `unmarkPieceSale` + `withdrawBuyerRequest` (próprio buyer).
- Fix: nas três rotas, espelhar a cascata — reabrir requests concorrentes (`sold_elsewhere`→`pending`) e deals concorrentes (`voided`→`cancelled`) e emitir notificação "voltou à venda", filtrando por componente/janela para não reabrir os encerrados por outra causa.

**N2 — `resolveDispute` (uphold) emite copy "está em análise" numa disputa já encerrada**
- Esperado: ao admin resolver a disputa (uphold), a notificação às partes reflete desfecho fechado.
- Observado: o uphold emite `reversal_rejected`, cuja copy estática é "A correção da venda de X não foi aceita — está em análise." Contradiz o estado (disputa `resolved_upheld`, deal `completed`).
- Causa raiz: tipo `reversal_rejected` reusado em dois momentos; o comentário em `deals.ts:319-320` assume que não há copy por tipo, mas `apps/web/lib/notification-copy.ts:25` dá copy fixa por tipo. Emit do uphold em `deals.ts:339`.
- Fix: tipos dedicados `dispute_resolved_upheld`/`dispute_resolved_reversed` com copy própria, ou `data.{resolved:true}` ramificado em notification-copy.ts. Mínimo: a copy vinda da resolução do admin não pode dizer "está em análise".

**N3 — Suspensão de usuário (`suspend_user`) não revoga contato: WhatsApp do suspenso segue liberado**
- Esperado: suspender um usuário fecha o contato já liberado e tira os anúncios dele de circulação.
- Observado: o ramo só faz `user.update({status:'blocked', sessionVersion++})`; não toca Request/Deal/Listing. Comprador segue vendo "Falar no WhatsApp" e novos compradores ainda pedem contato no anúncio do suspenso.
- Causa raiz: `apps/web/lib/moderation.ts:24-29` (ramo suspend_user) vs vizinho `remove_listing` (moderation.ts:34-41) que reconcilia requests/listing. WhatsApp deriva só de `Request.status==='accepted'` (`apps/web/lib/requests.ts:159-160` e `requests.ts:178-182`); visibilidade pública de `getListing` não checa status do dono.
- Fix: no tx do suspend_user, `request.updateMany` dos pending/accepted do alvo (como seller e buyer) para estado terminal + `emitMany`; esconder/arquivar Listings active OU fazer as superfícies checarem status do dono. Extrair helper comum reusado por remove_listing/deleteAccount/suspend_user; `restore_user` reabre simetricamente.

**N4 — Favorito de kit com KITE vendido aparece como totalmente disponível no card**
- Esperado: card em /favoritos de kit cujo kite já foi vendido mostra estado "vendido", como o detalhe (pill "só o kite · vendido").
- Observado: o card mostra foto e preço de disponível, sem flag de venda — contradiz o detalhe.
- Causa raiz: `toCard` na face de kite (`apps/web/lib/browse.ts:117-118,143`) só considera `barraSoldAt` (badge +Barra) e nunca `kiteSoldAt`. `getFavorites` (browse.ts:486-493) filtra `status:'active'`/`deletedAt:null` mas não aplica `kiteSoldAt:null` (que a busca aplica em browse.ts), e `ListingCard.tsx` não tem consciência de sold/status.
- Fix: propagar `kiteSoldAt` (e reserva `seller_confirmed`) ao Card e dar ao ListingCard estado "vendido/indisponível" espelhando o soldPill do detalhe. Mínimo: em getFavorites, marcar o card como vendido quando a face mostrada tem `kiteSoldAt!=null`.

### Severidade MÉDIA

**N5 — Deal `closed_unconfirmed` marca anúncio como VENDIDO publicamente, mas UI/perfil negam a venda**
- Esperado: superfície pública coerente com o predicado de venda.
- Observado: `applyPieceSale` aplica `status='sold'` + `soldToUserId=buyerId` também no ramo `closed_unconfirmed` → anônimo vê "Vendido" atribuído a um comprador que nunca confirmou; mas `COUNTS_AS_SALE_STATUSES` (deals.ts:386) exclui closed_unconfirmed e a copy do vendedor (DealBox.tsx:97) diz "não conta como venda".
- Causa raiz: ramo unificado em `apps/web/lib/deals.ts:158-161,227`; `isPubliclyVisible` inclui `sold` (`apps/web/lib/listing-status.ts:34-36`); `sellables` marca indisponível em `apps/web/lib/components.ts:38-39`.
- Fix: definir verdade única — ou incluir closed_unconfirmed em COUNTS_AS_SALE_STATUSES e alinhar copy, ou não fechar o listing como `sold` público (estado reservado/oculto até o vendedor corrigir).

**N6 — Notificação de resolução de disputa (reverse) vai às DUAS partes com copy escrita p/ quem pediu a correção**
- Esperado: copy que sirva ao papel de cada destinatário (requester vs contraparte).
- Observado: `resolveDispute` reverse emite `reversal_confirmed` para `[openedByUserId, counterpartyId]`; a copy "A correção da venda de X foi confirmada." (notification-copy.ts:24) desorienta a contraparte que recusou e queria manter a venda.
- Causa raiz: `apps/web/lib/deals.ts:328,335` — tipo nascido no fluxo bilateral (emit só ao requester) reusado em broadcast às duas partes.
- Fix: copy por papel ou tipos de moderação dedicados; mínimo, neutralizar ("A análise da venda de X foi concluída: a venda foi revertida.").

### Severidade BAIXA

**N7 — `purchase_denied` emitido sem `data.title` — copy degrada para frase genérica**
- Esperado: notificação nomeia o anúncio, como os tipos vizinhos.
- Observado: vendedor com vários anúncios recebe "O comprador respondeu que não comprou." sem nomear a peça.
- Causa raiz: emit em `apps/web/lib/deals.ts:146` sem `data`; `notification-copy.ts:18` ramifica `d.title ? ... : ...` e cai no fallback. `cancelSale` busca o title antes (deals.ts:118,129).
- Fix: buscar `listing.title` em `denyPurchase` e passar `data:{title}` no emit (deals.ts:146).

**N8 — Rotas de deal irreversíveis (confirm/deny/cancel/correct/sold) sem rate limit**
- Esperado: simetria de teto com reversal/review.
- Observado: só `reversal/route.ts:24` e `review/route.ts:19` chamam `rateLimit`; confirm/deny/cancel/correct/sold não têm. Não é bug de corretude (guards de status + FOR UPDATE serializam), mas expõe a flood/abuso de mutações irreversíveis.
- Causa raiz: rateLimit adicionado só nas duas rotas com texto livre; ramos vizinhos esquecidos.
- Fix: aplicar `rateLimit('deal-mut:userId',...)` nas demais rotas, ou documentar por que ficam sem teto.

**N9 — Deal `reversed` bloqueia exclusão do anúncio mesmo com a peça de volta à venda e sem venda registrada**
- Esperado: coerência com §4 ("reversed não conta como venda").
- Observado: `SOLD_RECORD_DEAL_STATUSES` (deals.ts:381) inclui `reversed` → `listingHasSaleRecord` true → `removeListing` bloqueia (`apps/web/lib/lifecycle.ts:27`), embora `unmarkPieceSale` tenha voltado a peça a `active`. UI não explica o bloqueio. Decisão de produto ambígua (tensão §4 vs §10).
- Fix: confirmar intenção; se reversed não deve travar, removê-lo de SOLD_RECORD_DEAL_STATUSES preservando histórico via auditEvent; senão, explicitar o motivo na UI.

**N10 — Favoritar permitido em anúncio pausado/vendido/reservado; coração "salvo" sem efeito em /favoritos**
- Esperado: filtro de escrita alinhado ao de leitura.
- Observado: POST `favorite/route.ts` valida só existência (findUnique select id, linha 15-16) e retorna favorited:true; `getFavorites` (browse.ts:488) lista só `active`/não-deletado. Favoritar anúncio não-disponível persiste o Favorite e pinta o coração, mas o item nunca aparece em /favoritos.
- Causa raiz: assimetria escrita (só existência) × leitura (só active) em `apps/web/app/api/listings/[id]/favorite/route.ts:15-16`.
- Fix: alinhar — ou getFavorites lista não-active com rótulo de estado, ou o POST recusa favoritar anúncio indisponível.

**N11 — Badge global e badge da aba Recebidos contam universos diferentes; aba Enviados sem badge de não-lido**
- Esperado: o realce vermelho aparece na aba onde a novidade mora.
- Observado: RequestBadge deriva de `unreadCount` (todas notificações); badge da aba Recebidos usa `novos`=incoming pendentes; aba Enviados (onde caem sale_marked/sold_elsewhere/reversal do lado comprador) só tem `tabCount` neutro. Além disso `MarkNotificationsRead` marca tudo lido no mount → "Novidades" some no recarregamento.
- Causa raiz: duas fontes de verdade — `apps/web/lib/notifications.ts:55-57` (unread) vs `apps/web/app/pedidos/page.tsx:43` (`novos`); tabBadge só em Recebidos (page.tsx:257).
- Fix: derivar o badge de Enviados de notificações não-lidas do lado comprador, ou adiar markRead até interação por item.

### Tabela-resumo dos NOVOS achados

| # | Severidade | Área | Achado | Causa raiz (arquivo:linha) |
|---|-----------|------|--------|----------------------------|
| N1 | Alta (bloq.) | deal | Cascata `sold_elsewhere`/`voided` nunca desfeita ao reverter venda | deals.ts:167-168 (sem inversa); 256-258/288-292/330-334 |
| N2 | Alta (bloq.) | notificações | `resolveDispute` uphold emite copy "está em análise" em disputa encerrada | deals.ts:339 + notification-copy.ts:25 |
| N3 | Alta (bloq.) | contato-whatsapp | `suspend_user` não revoga contato; WhatsApp do suspenso segue ativo | moderation.ts:24-29; requests.ts:159-160/182 |
| N4 | Alta (bloq.) | favoritos | Favorito de kit com kite vendido aparece como disponível no card | browse.ts:117-118,143,488 |
| N5 | Média | deal | `closed_unconfirmed` marca anúncio "Vendido" público mas UI/perfil negam | deals.ts:158-161,227; listing-status.ts:34-36 |
| N6 | Média | notificações | Notif. de disputa (reverse) vai às 2 partes com copy de requester | deals.ts:328,335; notification-copy.ts:24 |
| N7 | Baixa | notificações | `purchase_denied` sem `data.title` → copy genérica | deals.ts:146; notification-copy.ts:18 |
| N8 | Baixa | deal | Rotas confirm/deny/cancel/correct/sold sem rate limit | app/api/deals/[id]/{confirm,deny,cancel,correct}, requests/[id]/sold |
| N9 | Baixa | deal | `reversed` bloqueia exclusão apesar de "não contar como venda" | deals.ts:381; lifecycle.ts:27 |
| N10 | Baixa | favoritos | Favoritar permitido em anúncio indisponível; coração sem efeito | favorite/route.ts:15-16; browse.ts:488 |
| N11 | Baixa | notificações | Badge global × aba divergem; Enviados sem badge de não-lido | notifications.ts:55-57; pedidos/page.tsx:43,257 |

Descartado por duplicar conhecido: `listing_removed` sem `data.title` em `deleteAccount` (já consta como "listing_removed sem title em deleteAccount").
