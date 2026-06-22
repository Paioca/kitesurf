# Negociação v2 — Especificação de Engenharia

> Documento canônico. Consolida as decisões de produto + a máquina de estados + o
> plano técnico do fluxo de negociações da Kitetropos. **Não é hora de migrar.**
> Este doc precede a implementação; a migração só roda depois do Passo 0 em staging.
>
> Status: **fechado para revisão de engenharia.** Pré-condições de execução em §0.

---

## 0. Pré-condições (antes de qualquer código/migration)

A própria ordem exige repo limpo. Hoje **não está**:

- `origin/main` = trabalho da auditoria, integrado.
- Mas o working tree local está numa branch velha (`feat/home-como-funciona`) com
  **alterações não-commitadas da sessão de auth/e-mail** em arquivos já deployados
  (`pedidos/page.tsx`, `HeaderNav`, `MobileChrome`, `Footer`, `layout`, `HomeIntro`).

**Bloqueador operacional:** a sessão de auth/e-mail precisa commitar/integrar (ou
descartar) e **reconciliar o overlap** nesses arquivos antes de:

1. Confirmar todas as sessões/worktrees limpas.
2. CI verde.
3. `git tag negociacao-v2-base` na `main`.
4. `git checkout -b negociacao-v2`.

Só então o trabalho abaixo começa.

---

## 1. Decisões de produto (consolidadas)

1. Só venda **confirmada pelos dois** (`completed`) conta publicamente.
2. Sem confirmação, o vendedor pode **encerrar como vendido** (`closed_unconfirmed`):
   sai da busca, **não** conta, **não** permite avaliação.
3. **Uma reserva pendente por unidade física** (ver §3 — não é "1 por componente").
4. Avaliação só depois de `completed`.
5. Avaliação é opcional.
6. Anúncio vendido **não pode ser excluído** pelo vendedor (ver §10).
7. Devolução/correção de venda `completed` exige **confirmação bilateral**.
   `closed_unconfirmed` o vendedor corrige sozinho (o comprador nunca confirmou).
8. Mesmo telefone não negocia consigo próprio (ver §12).
9. Vendas repetidas entre o mesmo par → sinal pra moderação (**backlog**, ver §13).
10. Antes do aceite, o vendedor tem só: **Recusar** e **Conversar no WhatsApp**.

---

## 2. Máquinas de estado

### 2.1 Request

```
pending
 ├── vendedor conversa        → accepted
 ├── vendedor recusa          → declined        (terminal)
 ├── comprador retira         → withdrawn        (terminal*)
 ├── anúncio removido         → listing_removed  (terminal, sistema)
 ├── item vendido a outro     → sold_elsewhere   (terminal, sistema)
 └── prazo sem resposta       → expired          (terminal*, sistema)

accepted
 ├── comprador desiste        → withdrawn
 ├── vendedor marca venda     → cria Deal(seller_confirmed)
 ├── anúncio removido         → listing_removed
 └── item vendido a outro     → sold_elsewhere
```

`*` Comprador pode **re-solicitar** após `withdrawn`/`expired` se a peça seguir
disponível. **Não** reabre `declined`, `listing_removed`, `sold_elsewhere`.

### 2.2 Deal

```
(criado em seller_confirmed quando o vendedor marca venda a partir de um request accepted)

seller_confirmed
 ├── comprador confirma           → completed
 ├── comprador nega ("não comprei") → cancelled
 ├── vendedor cancela             → cancelled
 └── 72h sem resposta (cron)      → closed_unconfirmed

completed
 └── uma parte pede correção      → reversal_requested
        ├── outra parte aceita    → reversed
        ├── outra parte recusa    → disputed
        └── solicitante desiste   → completed

closed_unconfirmed
 └── vendedor corrige             → (Deal encerrado) + peça volta a paused

voided
 (não tem transição de ator — ver §2.4)
```

### 2.3 DealDispute (modelo novo — fila própria)

```
open
 ├── admin assume        → under_review
under_review
 ├── admin mantém venda  → resolved_upheld   (Deal segue como estava)
 └── admin reverte       → resolved_reversed (Deal → reversed)
qualquer
 └── encerrada           → closed
```

Disputa **não** vai dentro de `Report` (ver §5.3 e §11).

### 2.4 De onde vem `voided` (não é código morto)

Com a trava por unidade física, **não há** mais concorrência entre compradores da
mesma peça. `voided` sobrevive **só** no conflito cross-componente do kit:

- Se existir `seller_confirmed` no **conjunto** e outro no **kite** (estado legado ou
  brecha de concorrência), ao o kite virar `completed` o conjunto fica invendável →
  Deal do conjunto **→ `voided`**.

A §3 (trava por unidade física) deve **prevenir** essa coexistência na origem; `voided`
fica como rede de segurança para o que escapar.

---

## 3. Reserva por unidade física (a trava central)

A regra **não** é "1 `seller_confirmed` por componente". É **1 reserva por unidade
física**. Um kit tem duas unidades: `kite` e `barra`.

### Matriz de conflito

| Venda pendente | Reserva (bloqueia) |
|---|---|
| `conjunto` | `kite` **e** `barra` (logo: conjunto, kite, barra) |
| `kite` | `kite` e `conjunto` (não bloqueia `barra`) |
| `barra` | `barra` e `conjunto` (não bloqueia `kite`) |

- `kite` e `barra` podem estar reservados **simultaneamente para compradores
  diferentes**.
- `conjunto` **não coexiste** com nenhuma reserva parcial.

### Implementação

- Modelar a venda como o **conjunto de unidades** que ela reserva:
  `conjunto = {kite, barra}`, `kite = {kite}`, `barra = {barra}`.
- Rejeitar se houver **interseção** com qualquer reserva ativa.
- O índice único parcial por `(listingId, component)` **não basta** (não pega
  conjunto × peça). A garantia atômica precisa de **lock de linha do `Listing`**
  (`SELECT … FOR UPDATE`) durante criação/confirmação da venda, verificando a matriz
  inteira dentro da transação. O índice parcial fica como segunda camada (DB).

**Mensagem ao tentar marcar com reserva conflitante:**
> Já existe uma venda aguardando confirmação para esta peça. Cancele a anterior antes
> de escolher outro comprador.

---

## 4. Disponibilidade & contadores por estado

> **Correção crítica:** "conta como venda" e "review pública" usam **predicados
> diferentes**. Não dá pra reusar o filtro "só `completed`" para os dois.

| Estado do Deal | Peça na busca | Conta como venda | Review pública |
|---|---|---|---|
| `seller_confirmed` | Não (reservada) | Não | Não |
| `completed` | Não (vendida) | **Sim** | **Sim** |
| `cancelled` | Volta a `paused` | Não | Não |
| `closed_unconfirmed` | Não (vendida) | Não | Não |
| `reversal_requested` | Não | **Sim (provisório)** | **Oculta** |
| `reversed` | Volta a `paused` | Não | Oculta (permanente) |
| `disputed` | Não | **Sim (até decisão)** | **Oculta** |
| `voided` | n/a | Não | Não |

### Os dois predicados (perfil)

```
contaComoVenda(deal)  = deal.status ∈ { completed, reversal_requested, disputed }
reviewPublica(deal)   = deal.status == completed
```

- Em `reversal_requested`/`disputed`: a venda **continua contando provisoriamente**,
  mas a review **some** (predicado de review = só `completed`).
- Em `reversed`: nem conta, nem review.
- A review **permanece no banco**, sem edição, durante a disputa — só muda a
  visibilidade pública (deriva do estado do Deal, sem flag separada de "frozen").

---

## 5. Modelo de dados (mudanças de schema)

### 5.1 `DealStatus` — novos valores

```
closed_unconfirmed
reversal_requested
reversed
disputed
```

(`voided` permanece.) Postgres: `ALTER TYPE "DealStatus" ADD VALUE …` por valor.

### 5.2 `Deal` — novos campos de data

```
sellerConfirmedAt    (já existe)
confirmationDeadlineAt   // = sellerConfirmedAt + 72h, gravado na confirmação
closedUnconfirmedAt
reversalRequestedAt
reversedAt
```

### 5.3 `DealDispute` — modelo novo

```
DealDispute
- id
- dealId
- openedByUserId        // quem pediu a correção/abriu a disputa
- counterpartyId        // a parte que recusou
- reason                // enum: devolvido | engano | nao_aconteceu | outro
- description           // texto livre opcional
- status                // open | under_review | resolved_upheld | resolved_reversed | closed
- resolution            // texto do admin
- resolvedByAdminId
- createdAt
- resolvedAt
- (snapshot do histórico de estados do Deal pra contexto)
```

### 5.4 Índice parcial

`@@unique` parcial em `Deal(listingId, component) WHERE status = 'seller_confirmed'`
— **segunda camada**; a garantia primária da matriz é o lock de linha (§3).

> ⚠️ A criação do índice **falha** se houver duplicados hoje. Por isso o Passo 0 (§6)
> roda **antes**.

---

## 6. Passo 0 — script de diagnóstico (design, não execução)

Script **auditável** (não SQL solto no editor), **dry-run por padrão**, com relatório
antes/depois. Roda em **staging** primeiro.

### 6.1 Duplicados de `seller_confirmed`

- **Mesma peça:** agrupar `Deal{status:seller_confirmed}` por `(listingId, component)`,
  reportar `count > 1`.
- **Cross-componente (kit):** detectar, no mesmo `listingId`, `seller_confirmed` de
  `conjunto` coexistindo com `kite` e/ou `barra`.
- Saída: lista de conflitos + sugestão de qual permanece (o mais recente?) e quais
  viram `cancelled`/`voided`. **Resolução não-automática** — relatório pra decisão.

### 6.2 Colisões de telefone (pós-normalização)

- Normalizar **em memória** todos os telefones para E.164 (dry-run, sem escrever).
- Agrupar pelo normalizado, reportar grupos com `count > 1`.
- **Regra de parada:** `0 colisões → segue`; `≥1 colisão → para a migração`.
- **Sem merge automático.** Colisão = subprojeto próprio:
  conta principal → inventário (anúncios/solicitações/Deals/reviews/favoritos) →
  detectar relações conflitantes → transferência transacional → anonimizar a
  duplicada → registro administrativo → validar contagens antes/depois.

### 6.3 Órfãos & sanidade

- Deals referenciando `Listing` inexistente/deletado.
- Requests `accepted` sem Deal e sem peça disponível.
- Listings `sold` sem Deal `completed`.

### 6.4 Relatório

- Tabela **antes/depois** por categoria (duplicados resolvidos, telefones
  normalizados, colisões pendentes, órfãos).
- **Gate:** a migration principal (estados + índice parcial) só prossegue com
  duplicados resolvidos e **zero** colisões de telefone.

---

## 7. Bloqueio de novas solicitações (3 pontos)

Quando existir reserva ativa pra uma unidade (§3), a peça **não é vendável**. A regra
vive em **três** lugares — esconder o botão **não basta**:

1. **Busca** (`lib/browse.ts`): peça reservada não aparece como disponível.
2. **Detalhe do anúncio**: CTA desabilitado + estado.
3. **API de criação de solicitação** (`createRequest` em `lib/requests.ts`):
   **rejeita** no backend, com a matriz da §3.

Conjunto bloqueado se kite **ou** barra reservado; a outra peça do kit segue
disponível.

---

## 8. Aceite + WhatsApp (Bloco 4)

### Botões do vendedor

- Antes do aceite: **`Recusar`** · **`Conversar no WhatsApp`**.
- `Conversar no WhatsApp` → confirmação inline:
  > Ao continuar, seu WhatsApp também será compartilhado com o comprador.
  > [Voltar] [Compartilhar e conversar]
- Ao confirmar: `request: pending → accepted`, comprador recebe o contato, SMS de
  aceite, e abre o WhatsApp. Depois do aceite a tela mostra só `Conversar no WhatsApp`.

### Gotcha Safari/popup (obrigatório)

`window.open()` **depois** de um `await` é bloqueado (perde o user-gesture). **Não**
abrir aba vazia antecipada (UX ruim se a API falha). Solução:

```
clique → POST aceite → API retorna { status:"accepted", whatsapp:"https://wa.me/…" }
       → window.location.assign(whatsapp)   // mesma aba, sem popup
```

A API de aceite **retorna o link** (evita manter um link independente antes da
transição). Arquivos: `RequestActions.tsx`, `requests.ts`, `pedidos/page.tsx`.

---

## 9. Encerramento em 72h (cron no v1)

Auto, **não** dependente de o vendedor voltar:

```
vendedor marca vendido → peça reservada
 48h: lembrete (SMS/notificação) ao comprador
 72h sem resposta: Deal → closed_unconfirmed; peça/anúncio → vendido;
                   sem venda pública; sem avaliação
```

- Job **diário** (Vercel Cron, no plano Pro). Requisitos: **idempotente**,
  protegido por `CRON_SECRET`, lógica numa **função de domínio reutilizável**
  compartilhada com o close-manual.
- Backend valida as 72h (`sellerConfirmedAt + 72h`) — não confiar no front.
- Pós-encerramento, o vendedor ainda pode **`Corrigir e voltar a anunciar`**
  (`closed_unconfirmed → peça paused`, registrado no histórico — unilateral, o
  comprador nunca confirmou).
- `closed_unconfirmed` **≠** `expired` (expired = solicitação antiga sem resposta).

---

## 10. Anúncio vendido imutável (Bloco 6)

Bloquear `Excluir`/editar/reativar (front **e** backend) quando:
`Listing.sold`, ou Deal em `completed` / `closed_unconfirmed` / `reversal_requested` /
`disputed` / `reversed` (enquanto parte do histórico).

- Preserva anúncio, fotos e ficha. Remove ações de contato. Mostra `Vendido`.

### Exceção administrativa

- Admin **oculta** o conteúdo público; **Deal e trilha de auditoria permanecem**.
- Fotos removidas por privacidade → **placeholder**, não apagar o negócio.
- Encaixa no `remove_listing` da moderação já em produção (soft-delete preserva Deal).

Arquivos: `OwnerControls.tsx`, `lib/lifecycle.ts`.

---

## 11. Reversão bilateral + disputa (Blocos 5/7)

- Em `completed`, qualquer parte abre `Solicitar correção da venda`
  (motivo: devolvido | engano | não aconteceu | outro) → `reversal_requested`.
- A outra parte: `Confirmar correção` → `reversed`; `Não concordo` → `disputed`;
  solicitante desiste → volta a `completed`.
- `reversed`: venda deixa de contar, reviews ocultas permanentemente, peça volta
  a `paused` (**nunca `active` automático**).
- `disputed`: cria **`DealDispute`** (§5.3) na fila de moderação, com dealId/partes/
  motivo/datas/histórico. Anúncio **continua vendido** até a decisão do admin.

A moderação passa a ter **duas filas** (Denúncias `Report` · Disputas `DealDispute`) —
podem dividir a mesma tela, não o mesmo modelo.

---

## 12. Telefone próprio (Bloco 8)

A proteção principal **já existe** (telefone único + owner não solicita próprio
anúncio). O trabalho real:

- **Normalizar** todos os legados para E.164.
- Garantir **unicidade após normalização** (ver colisões em §6.2 — pode parar a
  migração).
- Impedir criação/alteração sem normalização.
- Teste: dono não solicita o próprio anúncio (oferta **e** visita).
- `buyer.phone === seller.phone` pode ficar como **defesa adicional**, não a principal.

Mensagem: *Você não pode negociar com a própria conta.*

---

## 13. Antifraude (Bloco 9 — backlog, só alerta)

Sinais pra moderação (não bloquear automático no v1):

- Muitas vendas entre o mesmo par; muitas `completed` em pouco tempo; contas novas
  negociando repetidamente entre si; mesmo dispositivo/IP nos dois lados (se houver
  base legal); alta taxa de `closed_unconfirmed`; alta taxa de reversões.

---

## 14. Copy

### Comprador, no anúncio

- `Fazer oferta`
- `Quero ver pessoalmente` (não "Agendar visita" — não há calendário; não
  "Compartilhar WhatsApp" — descreve o mecanismo, não a intenção)
  - Ao tocar: *Seu WhatsApp será compartilhado com o vendedor para vocês combinarem a
    visita.* · Botão: **Enviar pedido e compartilhar WhatsApp**

### Vendedor

- Antes do aceite: `Recusar` · `Conversar no WhatsApp`
  - Confirmação: *Ao continuar, seu WhatsApp também será compartilhado com o
    comprador.* · Botão: **Compartilhar e conversar**
- Depois do aceite (ambos): `Conversar no WhatsApp`

### Confirmação/avaliação

- `Confirmar que comprei` → `Avalie o vendedor` + `Agora não`

---

## 15. Testes obrigatórios

1. Conversar no WhatsApp aceita e libera contato.
2. Recusar não compartilha o contato do vendedor.
3. Apenas uma reserva pendente por unidade física.
4. Peça reservada não recebe novas solicitações (back rejeita, não só esconde).
5. Outra peça do kit continua disponível.
6. Confirmar compra conclui e libera avaliação.
7. Avaliar antes de `completed` é rejeitado (todos os não-completed).
8. Encerrar sem confirmação não aumenta vendas.
9. Encerrar sem confirmação não permite avaliação.
10. Vendido não pode ser excluído (front e back).
11. Reversão bilateral remove a contagem.
12. Reversão deixa peça `paused`.
13. Mesmo telefone é rejeitado (oferta e visita).
14. **Concorrência:** duas confirmações simultâneas vendem **uma** vez só (lock).
15. Cancelar venda **notifica o comprador** (hoje quebra — `cancelSale` não emite).
16. Conjunto reservado bloqueia kite e barra; kite reservado não bloqueia barra.
17. `reversal_requested`/`disputed`: venda conta provisória, review **oculta**.
18. Cron de 72h é idempotente (rodar 2× não duplica encerramento).

---

## 16. Ordem de implementação

1. Congelar esta spec.
2. Confirmar sessões/worktrees limpas (ver §0) + CI verde.
3. `git tag` da versão atual.
4. `git checkout -b negociacao-v2`.
5. Backup do banco.
6. Escrever o script de diagnóstico do Passo 0.
7. Rodar **só o diagnóstico** em staging.
8. Resolver duplicidades de Deals.
9. Analisar/resolver colisões telefônicas (gate: zero).
10. Migration de estados + `DealDispute` + índice parcial.
11. Trava por unidade física (lock de linha).
12. Reserva + bloqueio de novas solicitações (3 pontos).
13. Aceite simplificado + WhatsApp same-tab.
14. Restringir review a `completed` (os dois predicados, §4).
15. Encerramento automático em 72h (cron).
16. Anúncio vendido imutável.
17. Reversão bilateral.
18. Integrar fila de disputas à moderação.
19. Notificações/SMS (inclui `cancelSale → comprador`).
20. Copy final.
21. Testes de concorrência + jornadas, **em staging**.
22. Só então migrar produção.

Integridade primeiro; copy por último.

---

## Apêndice — o que já existe hoje (não refazer)

- `getProfile` filtra reviews/vendas por `completed` (base para §4, mas precisa dos
  **dois predicados**).
- `sold_elsewhere` + notificação de afetados em `confirmPurchase`.
- Owner-check em `createRequest`; telefone único.
- `ModerationAction` + ações reais (suspender/remover/restaurar) + trilha — fila de
  `Report` pronta; falta a fila de `DealDispute`.
- Review já bloqueada para `cancelled`/`voided` (a §4 estende para "só `completed`").
- Índice parcial único **em `completed`** (a §5.4 adiciona o de `seller_confirmed`).
