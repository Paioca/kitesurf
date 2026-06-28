# Auditoria Pré-Lançamento — Execução (Claude) — 2026-06-28

Run do prompt `PROMPT-AUDITORIA-PRE-LANCAMENTO-V2.md` contra `origin/main`, para comparar com o baseline do codex (`AUDIT-PRE-LANCAMENTO.md`, 2026-06-26).

- **Modalidade:** estática (código == prod, working tree limpo == origin/main) + smoke público de produção (curl, read-only) + quality gates locais. **Jornadas autenticadas dinâmicas NÃO rodadas** (docker indisponível) — ver Limitações.
- **Cobertura:** 7 dimensões em paralelo + verificação adversarial dos candidatos P0/P1 + 198 testes unitários do repo.

---

## VEREDITO: **GO PARA BETA PRIVADO** (perto de GO público)

O código está em estado genuinamente bom. **0 P0, 0 P1 confirmado.** Os 3 bloqueadores que o codex declarou em 26/jun estão **fechados**. Não há IDOR, não há vazamento de PII, infra/headers fortes, build/testes verdes. O que separa de um GO público limpo é o **cluster de polish** — flicker de auth em toda página + i18n EN quebrado nas telas core. Cosmético, mas visível.

> **Atualização (run dinâmico executado):** a lacuna de "jornadas autenticadas não exercitadas ao vivo" foi **fechada** — subi um Postgres local descartável (binários `embedded-postgres`, sem docker/sudo), apliquei as 31 migrations, semeei 5 personas com cenários, e rodei o funil autenticado real. Resultados confirmam tudo abaixo. Ver seção **"Run dinâmico"**.

Trajetória vs codex: **NO-GO (3 bloqueadores, 26/jun) → GO PARA BETA PRIVADO (28/jun).**

---

## Matriz de cobertura

| Jornada | Estático | Smoke público prod | Dinâmico autenticado (local) | Resultado |
|---|---|---|---|---|
| Auth / sessão | ✅ | ✅ (home SSR) | ✅ login OTP 3 personas, /me, /conta | Flicker **confirmado ao vivo** |
| Criar anúncio (mobile) | ✅ | ✅ (`/anunciar` 200) | ⚠️ teclado precisa device real | Hipótese CTA-teclado (P2) |
| Compra / contato / WhatsApp | ✅ + 198 testes | ✅ PII live | ✅ aceito→wa.me / pendente→nada | Gating **correto ao vivo** |
| Vendedor / anúncios | ✅ | — | ✅ ownership 403 cross-user | Sem IDOR |
| Conta / LGPD / exclusão | ✅ | — | ◑ /me, /conta ok (exclusão não disparada) | Anonimização real (código) |
| Segurança (IDOR/authz) | ✅ 36 rotas | ✅ PII live | ✅ PATCH/DELETE 403; admin gate | **0 IDOR** (runtime) |
| Infra / config | ✅ | ✅ headers/health | ❌ cron exec / Sentry-recebe / log-drain (precisa Vercel) | CSP/HSTS fortes |
| i18n | ✅ | ✅ (detalhe = PT com cookie EN) | ✅ confirmado | **Quebrado nas telas core** |

**Quality gates (local):** ESLint 0 erros (1 warning exhaustive-deps) · `tsc --noEmit` 0 erros · **198 testes passam** (deals 62, requests 36) · build compila.

**Smoke prod (live):** CSP **enforced** (nonce, `frame-ancestors 'none'`, `object-src 'none'`) · HSTS `includeSubDomains; preload` · X-Frame DENY · `/api/health/login` = `{ok, db 37ms, twilio 262ms}` · `/api/listings[/<id>]` **não vazam phone/email/cpf** (só `userId` opaco).

---

## Run dinâmico (Postgres local, jornadas autenticadas reais)

Ambiente: `embedded-postgres` (binários reais, sem docker/sudo) em `/tmp/kite-pg`, 31 migrations + seed de 5 personas com cenários (Ana=oferta aceita, Marina=oferta pendente, Carlos=vendedor, Bruno=promovido a admin). Login via `devCode` (OTP_MOCK), sem SMS. Todos os resultados batem com a análise estática:

| Teste | Resultado | Veredito |
|---|---|---|
| Login OTP (Ana/Marina/Bruno) + `/api/auth/me` | cookie `kite_session` ok; `/me` retorna o usuário certo | ✅ |
| `/api/auth/me` sem cookie | retorna `null` (200) | ✅ by-design, não vaza |
| **IDOR**: Ana (compradora) `PATCH`/`DELETE` anúncio de outro dono | **403 / 403** | ✅ sem IDOR (runtime) |
| **Gating**: Ana (oferta **aceita**) em `/pedidos` | renderiza `wa.me/5585991000003` | ✅ contato liberado |
| **Gating (contra-teste)**: Marina (oferta **pendente**) | **nenhum** `wa.me` | ✅ pendente não libera |
| **Flicker**: home com cookie válido da Ana | SSR mostra **"Entrar"**, mas `/conta` com o mesmo cookie = 200 | ⚠️ confirmado: header é client-only |
| Admin: Ana `POST /api/moderation/action` | **403** | ✅ API gated |
| Admin: Ana `GET /moderacao` (página) | 200 mas é a página 404 (`notFound()`), **zero conteúdo de moderação** | ✅ sem vazamento (status 200 é nit do Next, cosmético) |
| Admin: Bruno (admin) `GET /moderacao` | 200 com a fila real (denúncias/disputas) | ✅ |

### Jornadas profundas (2ª rodada)

| Teste | Resultado | Veredito |
|---|---|---|
| Vendedor: reativar (paused→active) | 200, anúncio volta ao browse público | ✅ |
| Vendedor: editar preço | 200, `price` persiste | ✅ |
| Vendedor: pausar (active→paused) | 200, **sai** do browse público | ✅ |
| **Completar negócio**: Carlos (vendedor) confirma o próprio deal | **403** (só comprador confirma) | ✅ |
| **Completar negócio**: Ana (compradora) confirma | 200 → deal `completed` | ✅ |
| Avaliação: Ana avalia (rating 5) | 201, review gravada | ✅ |
| Idempotência: Ana confirma de novo | **400** "não está aguardando confirmação" | ✅ guard de estado |
| **Lifecycle**: Carlos exclui anúncio **vendido** | **409** "registra uma venda" | ✅ guard correto |
| Lifecycle: Bruno exclui anúncio limpo | 200, `deletedAt` setado (soft-delete) | ✅ |
| **B-1 ao vivo**: forcei deal→`disputed` (reversão recusada) | `Request` fica `accepted` (resíduo) **mas** `/pedidos` da Ana **sem wa.me** | ✅ sintoma fechado; resíduo latente P2 |

**Cobertura do funil autenticado:** auth, comprador (oferta/gating/confirmar/avaliar), vendedor (editar/pausar/reativar/excluir/vender), authz (IDOR 403 + papéis), state-machine (idempotência, guard de venda, disputa). **Não testado mesmo com ambiente:** overlap do teclado virtual no CTA mobile (precisa device iOS/Android real) · exclusão de conta end-to-end (destrutivo) · cron/Sentry/log-drain (precisam de acesso Vercel/prod).

## Triagem do baseline (codex `AUDIT-PRE-LANCAMENTO.md`)

### Os 3 BLOQUEADORES — todos neutralizados
| ID | Estado | Evidência |
|---|---|---|
| **B-1** WhatsApp órfão em deal `disputed` | **fechado por superfície (confirmado ao vivo)** | `requests.ts:29-33` `CONTACT_HIDDEN_DEAL_STATUSES` inclui `disputed/...`; `contactAllowed(deal)` esconde o botão. **Live:** forcei deal→`disputed`, o `Request` ficou `accepted` (resíduo P2) mas `/pedidos` da Ana **não** mostrou wa.me. ⚠ Resíduo latente: `deals.ts:327-331` ramo `accept=false` não zera o `Request` |
| **B-2** waLink vazio pós-exclusão | **corrigido** | `requests.ts:21-27` retorna `null` p/ `deleted_`/dígitos<8 |
| **B-3** CPF em texto claro no audit | **corrigido** | `lifecycle.ts:57,94-97` `omitSensitiveAuditFields` + select sem cpf + `user.update cpf:null` |

### Demais conhecidos relevantes
- **Corrigidos:** N2/N6 (copy de disputa ramifica `byModerator`), **N3** (suspend_user reconcilia request/deal/listing — só vendedor), A-1 (barra-only tem brand/model próprios), favoritos-órfãos-kit, canTransition+deletedAt, header Kite, placeholder sizeLabel, dados órfãos pós-delete.
- **Ainda abertos (P2):** N8 (rotas deal/request sem rate limit), N5 (`closed_unconfirmed` marca listing `sold` público), N1 residual (deal `voided` concorrente não reabre), R-1 residual (copy `DisputeList.tsx:63` + comentários `deals.ts` dizem "paused"), sold_elsewhere→404, favoritos sem notif de venda/remoção, rating stale 60s, auth 429 sem fallback email, recovery loop phone→otp, logout engole revoke sem Sentry, cancelRequest via API em `disputed`, N9 (`reversed` bloqueia exclusão), badges divergentes.

---

## Achados por severidade

### P0 — nenhum

### P1 — nenhum confirmado
Candidato condicional:
- **i18n EN quebrado nas telas core** *(P1 se EN é audiência de lançamento; senão P2)* — confirmado ao vivo: com `Cookie: kitetropos:locale=en`, `/anuncio/<id>` (tela principal do comprador) renderiza PT. Não há sistema central; ~11 rotas só-PT; 3 fontes de locale divergem; flash PT→EN em telas client. Raiz: ausência de branch de locale em `anuncio/[id]/page.tsx` e congêneres.

### P2 — corrigir depois (cluster de polish + cauda do codex)
- **Flicker de auth** (toda página, usuário logado): nav é 100% client-side (`AccountNav`/`HeaderNav`/`MobileTabBar` montam deslogados e flipam após `fetch /api/auth/me` em `useEffect`), apesar de `getCurrentUser` existir no servidor. Cosmético, mas "custa confiança". Fix: hidratar auth no SSR do header.
- **CTA do wizard coberto pelo teclado** (`/anunciar`, mobile): `.criar-nav` é `position:fixed; bottom:0` sem `interactive-widget`/`visualViewport` (`globals.css:245-254`); a msg de validação mora dentro do nav fixo. **Provável explicação do sintoma "não consigo avançar no mobile"** — mas o teclado é dispensável (não trava de fato). Confirmar em device real.
- **N8** rotas `confirm/deny/cancel/correct/sold` e `requests/[id]` (aceite libera contato + dispara SMS) sem rate limit → custo/abuso de SMS.
- **N5** `closed_unconfirmed` mostra "Vendido" público para venda que não conta como venda.
- Cauda já catalogada pelo codex: sold_elsewhere→404, favoritos sem notif, rating stale 60s, auth 429 fallback, recovery loop, logout-revoke silencioso, cancelRequest via API em disputa, R-1 copy stale, suspensão de comprador não revoga contato, avatar sem maxBytes reduzido.

### Falso-positivo / não-é-bug (verificado)
- **IDOR: 0.** As 36 rotas de API derivam identidade da sessão/token, nunca do corpo; mutações checam ownership (`l.userId`/`r.sellerId`/`r.buyerId`/`deal.*`) com 403; rotas admin usam `requireAdmin`; crons exigem `CRON_SECRET` (Bearer, fail-closed 401 se ausente).
- **PII no payload: seguro** (estático + live). Selects não incluem phone/email/cpf do vendedor.
- **EXIF/GPS: removido** em todos os uploads (`sharp` re-encode) — não há vazamento de geolocalização.
- **CRON_SECRET "crons inertes": falso-positivo** — está documentado em `DEPLOY.md:54` como obrigatório e o guard é fail-closed correto. (Vale só confirmar que está setado em prod.)
- Múltiplos cookies `kite_session` / `clearSession` host-only: sem impacto (dedup por valor).

---

## Sintomas reportados — veredito
1. **Sessão piscando:** ✅ **confirmado e explicado** — mismatch SSR/CSR (nav client-only). Severidade P2 (cosmético, não quebra sessão). Não é cache nem token.
2. **Mobile não avança em criar anúncio:** ⚠️ **explicação provável encontrada** — CTA fixo coberto pelo teclado virtual. P2; o teclado é dispensável, então não é trava dura. **Requer confirmação em device real** (não testável sem docker/dispositivo aqui).
3. **Regressões recentes:** a área quente (locale, 4 dos últimos 10 commits) tem o débito de i18n acima; o funil de deal evoluiu e fechou os bloqueadores.

---

## Limitações desta execução (honestidade de cobertura)
- **Docker indisponível** → nenhuma jornada autenticada foi clicada/curl-ada. O funil de compra/venda foi coberto por leitura + 198 testes unitários, não por runtime. Para fechar: subir docker + seed + `devCode` e exercitar oferta→aceite→contato→avaliação em comprador/vendedor, e moderação com `admin=true` via SQL.
- **Não verificado em prod (precisa de acesso Vercel/DB):** se `CRON_SECRET` está setado; se os 3 crons rodam (plano Hobby vs Pro — `vercel.json` tem 3); se o Sentry recebe de fato; se Log Drain/uptime estão configurados; se o schema de prod == última migration.
- **Device real:** o sintoma do teclado no mobile precisa de iOS/Android real.

---

## Sequência de correção recomendada (menor conjunto primeiro)

**Bloco 1 — limpar o impressão pública (vira GO público):**
1. i18n: traduzir as telas core (`anuncio/[id]`, pedidos, favoritos) OU esconder o toggle EN no lançamento se PT-only.
2. Flicker: hidratar auth no SSR do header (passar `getCurrentUser` pro chrome de navegação).
3. CTA-teclado: `interactive-widget=resizes-content` no viewport ou mover a msg de validação pra fora do nav fixo; confirmar em device.

**Bloco 2 — antes de divulgação ampla:**
4. Rodar as jornadas autenticadas ao vivo (docker+seed) e fechar a matriz de cobertura.
5. N8: rate limit em `requests/[id]` (aceite/recusa dispara SMS) e nas rotas de deal.
6. Confirmar infra em prod: `CRON_SECRET` setado, 3 crons rodando (plano Pro?), Sentry recebendo, migration aplicada.

**Bloco 3 — cauda (pós-launch):** N5, sold_elsewhere→404, favoritos sem notif, rating stale, R-1 copy, recovery loop, logout-revoke Sentry, B-1 resíduo (zerar `Request` em `accept=false`).
