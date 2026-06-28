# Prompt — Auditoria Adversarial Pré-Lançamento (Kitetropos / Kite Life) — v2

> Cole o conteúdo abaixo (a partir de "Você está auditando…") como prompt do agente auditor.
> v2 incorpora: verdade-de-produção fixada, ambiente autenticado local, triagem de baseline,
> escopo travado, e alvos de marketplace nomeados (IDOR, PII, upload/EXIF, i18n, Sentry, credenciais).

---

Você está auditando o Kite Life/Kitetropos em pré-lançamento.
Objetivo: decidir se o app pode ser divulgado em produção sem passar vergonha.

## REGRA PRINCIPAL
Não edite código. Não refatore. Não "aproveite para melhorar". Não faça commit nem push (push em `main` publica em produção). Faça uma auditoria **adversarial, reproduzível e priorizada**. Entregue só relatório com evidências e plano de correção.

## CONTEXTO OBRIGATÓRIO — leia nesta ordem
1. docs/ESTADO-ATUAL.md
2. docs/AUDITORIA-CONTEXTO.md (fonte das decisões travadas — prevalece sobre 00–07)
3. docs/STATE-MACHINE.md
4. docs/AUDIT-PRE-LANCAMENTO.md (baseline de achados — **untracked**, ver PASSO 2)
5. docs/SECURITY-HARDENING.md (auditoria de segurança em 10 dimensões já feita)
6. docs/PLANO-AMBIENTES.md e docs/DEPLOY.md (fluxo de deploy / prod)
7. docs/PLANO-LANCAMENTO.md (⚠ **stale** — ver PASSO 3)

A verdade final é sempre **código atual + produção atual**. Os docs podem estar desatualizados — e vários estão. Confronte tudo com o código.

---

## PASSO 0 — FIXAR A VERDADE-DE-PRODUÇÃO (antes de qualquer achado)
- **Produção = branch `main`.** Push em `main` → deploy automático na Vercel (`kitetropos.com`). Não há promoção manual.
- **`staging` está morto** (dezenas de commits defasado). Ignore-o como referência.
- O working tree pode estar **sujo** (arquivos modificados/untracked que **não estão em prod**). O código que você lê pode não ser o que está no ar.
- **Audite contra `origin/main`.** Rode `git fetch` e use `git diff origin/main` (ou `git stash` + `git checkout origin/main`) como base. **Todo achado deve declarar se vale para `origin/main` (= prod) ou só para o working tree local.**
- Os comandos `lint/tsc/test/build` (PASSO 7) descrevem o **checkout local**, não prod. Rotule os resultados assim.

## PASSO 1 — AMBIENTE DE JORNADA AUTENTICADA (local, nunca prod)
- **Em produção é impossível logar sem disparar Twilio real** (`OTP_MOCK` é fail-closed em prod — `lib/otp.ts`). Portanto: jornada autenticada de PROD é incompatível com "não spamar Twilio". **Em prod faça só smoke read-only** (páginas públicas, headers, `/api/auth/me` se já houver sessão, observar sessão existente).
- **Smoke de saúde sem login:** bata `GET /api/health/login` em prod (probe pública, sem auth) — esperado 200 com `db.ok` e `twilio.ok`; 503 expõe componente caído. É o jeito de checar prod sem OTP. Verifique também se esse endpoint tem rate-limit (é público e faz query DB + chamada à API da Twilio por request).
- **Toda jornada autenticada roda LOCALMENTE:**
  1. `docker compose up -d` (Postgres local)
  2. `npm run db:migrate` → `npm run db:seed` → `npx ts-node apps/web/prisma/seed-journey.ts` (5 personas: telefones impressos no log)
  3. Logue lendo o `devCode` retornado por `POST /api/auth/otp/request` (fora de prod o código volta na resposta/log). **Zero SMS, zero brute-force.**
- **Admin/moderação:** nenhuma persona do seed é admin. Para exercitar `/moderacao`, disputas e `suspend_user`, rode `UPDATE "User" SET admin=true WHERE id='...'` (via Prisma Studio ou SQL) numa persona local.
- **Harness de viewport:** não há e2e no repo (só `vitest` unit). Use um MCP de browser ou navegação manual local nos viewports 390x844 / 430x932 / desktop. Onde só couber inspeção estática, **diga isso explicitamente** no achado.
- **NUNCA aponte `.env` local para o banco de prod** (DEPLOY.md descreve esse vetor para migrations manuais) e **nunca teste prod com credenciais possivelmente comprometidas** (ver PASSO 6, rotação).

## PASSO 2 — TRIAGEM DO BASELINE (antes de caçar achado novo)
- `docs/AUDIT-PRE-LANCAMENTO.md` (28 confirmados + 11 profundos, 3 bloqueadores) e `docs/SECURITY-HARDENING.md` já existem. **`AUDIT-PRE-LANCAMENTO.md` é untracked** — pode estar invisível em `origin/main`.
- **O baseline driftou.** Confronte cada achado com o código atual e marque `corrigido` / `aberto` / `mudou`. Não confie no número de linha do doc. Estado conhecido na última checagem:
  - **B-1** (WhatsApp órfão em deal `disputed`, ramo `accept=false` não revoga contato): **provavelmente AINDA ABERTO** — verifique `lib/deals.ts` no ramo `disputed`.
  - **B-2** (waLink vazio pós-exclusão) e **B-3** (CPF em texto claro no audit): **corrigidos** — confirme `lib/requests.ts` (`waLink` retorna null) e `lib/lifecycle.ts` (`omitSensitiveAuditFields`).
  - **N3** (`suspend_user` não revoga contato): **corrigido** — confirme `lib/moderation.ts` (updateMany de requests/deals + archive).
  - **N8** (rotas de deal sem rate limit): **provavelmente aberto** — ver PASSO 5.
- Só **depois da triagem**, caçe classes **novas**, com prioridade nos 2 sintomas abaixo, que o baseline NÃO cobre.

## PASSO 3 — ESCOPO TRAVADO E DECISÕES QUE NÃO SÃO BUG (não pontuar)
- **Fase 0 é SEM pagamento na plataforma** — a venda fecha no WhatsApp via contato estruturado. Os docs `01-mvp-scope.md` e `05-payments-escrow.md` (escrow/PSP/Order) estão **superados**; não reporte "falta checkout/escrow" como gap.
- **`PLANO-LANCAMENTO.md` está stale:** manda *desligar venda por componente* (já foi construída) e *migrar Next 15* (já está em **Next 16.2.9**). Não use como baseline de escopo nem reabra o upgrade do Next.
- **Não são bugs (decisões travadas):**
  - Aceitar oferta **não** confirma preço (só libera contato); **não há contraproposta**.
  - **Múltiplos compradores podem ter contato liberado ao mesmo tempo** e múltiplos `Deal` em `seller_confirmed` para o mesmo anúncio são **by-design** (unicidade só em `completed`). ⚠ **Não marque isso como race condition / falha de exclusividade.**
  - Reversão de venda força `status='active'` (não `paused`) **deliberadamente** — o bug real aqui é apenas a **copy** divergente (R-1), não o comportamento.
  - Publicação é **wizard multi-step** (não tela única); cadastro + foto de perfil obrigatórios; cards usam `background-image` (decisão de custo, não `next/image`); home mobile/desktop duplicada de propósito; avaliação liberada em `seller_confirmed` e pública só em `completed`.
- **Pendências conhecidas (não reportar como achado novo):** enum `expired` sem cron; `archived→active` sem fluxo dedicado na UI; página de anúncio removido dá 404 (tombstone ausente); schema de chat (`Conversation`/`Message`) dormente.

---

## SINTOMAS QUE EXIGEM INVESTIGAÇÃO (prioridade — não estão no baseline)
1. **Sessão piscando (logado/deslogado).** Hipótese confirmada: mismatch SSR/CSR arquitetural — cada componente de nav começa deslogado e só flipa após `fetch /api/auth/me` em `useEffect`, sem hidratação de auth no servidor (`AccountNav`, `HeaderNav`, `MobileChrome`). **NÃO é cache** (`/api/auth/me` é `force-dynamic` + `no-store`). Prove/refute o flicker em refresh e em navegação, mobile e desktop, e proponha a correção (hidratar auth no servidor).
2. **Criar anúncio no mobile.** O commit recente `9a228c2` ("Fix listing flow locale and mobile step scroll") acabou de mexer no scroll de troca de passo. **Verifique se resolveu** e se o CTA fixo do rodapé (`.criar-nav`) fica acessível **com teclado virtual aberto** em 390x844 (sem `visualViewport`/`interactive-widget`, o teclado pode cobrir o CTA e a mensagem de validação).
3. Muitas mudanças recentes podem ter criado regressões invisíveis — priorize **i18n/locale** (4 dos últimos 10 commits) e o funil de deal.

---

## JORNADAS OBRIGATÓRIAS

### 1. Auth / sessão
Login OTP (local, via `devCode`) · `/api/auth/me` · refresh · navegação home↔conta↔anúncio↔pedidos · logout · sessão expirada/inválida (`sessionVersion`) · mobile e desktop. **Provar ou refutar o flicker** (sintoma 1). Verificar atributos do cookie `kite_session` (httpOnly, SameSite=Lax, `secure` em prod, double-write host-only+domínio na migração `.kitetropos.com` → pode gerar 2 cookies no jar).
- **Recuperação por e-mail depende do Resend** (`RESEND_API_KEY`/`EMAIL_FROM`), não só do Twilio. Teste o fluxo de verificação/recuperação por e-mail e confirme que `RESEND_API_KEY` está em prod. Nota: o probe `/api/health/login` cobre DB+Twilio mas **não** o Resend — uma queda do e-mail não acende alarme.

### 2. Criar anúncio (mobile)
Viewports 390x844 e 430x932. Tipos Kite / Barra / Kit; com e sem foto; campos obrigatórios incompletos; voltar/avançar entre os **4 passos** (tipo&ficha · fotos · preço&entrega · revisão); **teclado aberto cobrindo o CTA fixo**; recuperação de rascunho (autosave em `localStorage`). Registrar exatamente onde trava, se travar.

### 3. Compra / contato — ⚠ critério corrigido
Buscar anúncio · abrir detalhe · pedir visita · fazer oferta · login com `?next=` · aceitar/recusar pelo vendedor · **contato (WhatsApp) liberado SOMENTE quando o request está `accepted` E `contactAllowed(deal)`** · pedido retirado/cancelado · estados vendido/pausado/removido.
- **Não exija exclusividade de contato** (múltiplos compradores liberados ao mesmo tempo é by-design).
- **Verificação de PII no ponto de serialização, não na UI:** confirme que `getListing` (`lib/queries.ts`) seleciona do vendedor apenas `id/name/avatarUrl/phoneVerified/createdAt` (sem `phone`/`email`), e que o campo `whatsapp` é `null` antes do aceite (`lib/requests.ts`, `getRequestsForUser`/`getListingRequestState`). Bata a API de detalhe **pré-aceite** e confirme `whatsapp:null` no JSON.

### 4. Vendedor
Meus anúncios · editar · pausar · reativar (quando permitido) · excluir · marcar vendido · comprador confirma/não confirma · avaliação. Verifique a coerência estado↔superfície (área onde o baseline concentra achados — triar antes).

### 5. Conta
Perfil · editar · favoritos · pedidos recebidos/enviados · excluir conta (confirmar anonimização real de PII — `lib/lifecycle.ts`) · moderação/admin (exige persona com `admin=true` via SQL).

### 6. Segurança aplicada (NOVA — alvos nomeados)
Authz é **100% na camada de app**: RLS está ligado **sem policies** (deny-all) e o app conecta como owner que **ignora RLS** — o banco não oferece rede de segurança. **Não existe `middleware.ts`** (só `proxy.ts` para CSP). Logo:
- **IDOR via chamada DIRETA à API** (não pela UI): com sessão de outro usuário/papel, chame `PATCH`/`DELETE /api/listings/:id`, `POST /api/deals/:id/{confirm,deny,cancel,correct,reversal}`, `POST /api/requests/:id/{status,sold}`, `DELETE /api/auth/me`, e as rotas admin (`/api/moderation/action`, `/api/disputes/:id`, `/api/reports/:id`). **Esperado: 403** quando o caller não é dono/parte/admin. Recon prévio não achou IDOR — sua tarefa é **provar**, não assumir.
- **Upload de imagem:** confirme no código (`lib/storage.ts`) e na imagem **servida** que EXIF/GPS são removidos (vazamento de geolocalização do vendedor = PII real), o cap de tamanho/pixels é aplicado, e o que acontece com SVG/conteúdo malicioso.
- **Rate limit / abuso:** confirme rate-limit nas rotas de mutação de deal (`confirm/deny/cancel/correct/sold` — suspeita de estarem **sem** teto, ao contrário de `reversal`/`review`) e em enumeração de `listing :id`.

### 7. i18n / locale (NOVA — hoje sem jornada)
Não há sistema central de i18n: cada página redeclara seu dicionário; locale vive em `localStorage` + cookie `kitetropos:locale`; o toggle dá `window.location.reload()`. **11 de 18 rotas só renderizam PT** — incluindo `anuncio/[id]` (tela principal do comprador), chat, favoritos, pedidos, termos, privacidade. Testar: persistência do toggle em refresh/navegação; **flash PT→EN** em telas client-side (`/anunciar`, `/entrar`); **UI em língua mista** ao escolher EN e abrir uma rota não-traduzida; divergência entre as 3 fontes (cookie SSR vs `localStorage` vs `user.locale` no banco), ex. login em novo device. Liste as rotas não traduzidas como cobertura faltante.

---

## PRODUÇÃO / INFRA — com critério PASS/FAIL concreto
- **Envs Vercel (Production):** confirmar presença de DB, `JWT_SECRET`/`JWT_SECRETS` (CSV de rotação — primeira assina, todas verificam), Twilio (SID/token/from), `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`, `RESEND_API_KEY`/`EMAIL_FROM`, `NEXT_PUBLIC_SENTRY_DSN`, `CRON_SECRET`, `APP_URL`. O app não sobe em prod sem `JWT_SECRET`/`JWT_SECRETS`.
- **Pool de conexão (estabilidade sob carga):** `DATABASE_URL` em prod deve ter `?pgbouncer=true&connection_limit=1` (Prisma + Vercel serverless; sem isso, picos estouram o pgbouncer → "Timed out fetching a connection"). `DIRECT_URL` (`:5432`, só migration) NÃO leva o parâmetro.
- **Twilio/SMS real:** confirmar conta fora de trial e entrega real (sem testar com flood).
- **Sentry:** PASS = um erro real **chega ao painel** em prod (DSN setado, source maps via `SENTRY_AUTH_TOKEN`/`SENTRY_PROJECT`, sample rate, alerta configurado) — não basta "Sentry existe". Procure `catch` que engole erro sem reportar (**falha silenciosa**) e dispare um erro controlado para provar a captura.
- **Crons & jobs (Vercel):** `vercel.json` declara **3 crons** — `close-unconfirmed` (encerra deals 72h), `cleanup` (purga + apaga imagens órfãs no Storage) e `drain-notifications` (`*/5`). ⚠ **Contradição doc-vs-config a resolver:** o DEPLOY.md descreve "2 crons (limite Hobby)" — confirme o **plano Vercel real**: se for Hobby, o 3º cron e o schedule sub-diário **não rodam** (notificações nunca drenam). Verifique também: `CRON_SECRET` setado em prod (senão os 3 crons ficam **inertes/401 silenciosos** → deals nunca auto-encerram, cleanup/drain nunca rodam — falha silenciosa), e que os Sentry check-ins (`job-<nome>`) **alertam quando um cron não roda**.
- **Migrations / drift de schema:** o build da Vercel **não roda migrations** (aplicadas à mão via `prisma migrate deploy`). Verifique que o schema do banco de **prod bate com a última migration commitada** — pode haver migration nova não aplicada. (Não rode `migrate` você mesmo; só inspecione.)
- **Storage (`listings`, bucket PÚBLICO):** chaves são UUIDv4 (`crypto.randomUUID()`) — não enumeráveis, modelo capability-URL OK. Como a URL pública é a única proteção, confirme que os **bytes da imagem servida** não carregam EXIF/GPS (strip via `sharp`) — vale para foto de anúncio **e avatar**, ambos públicos.
- **Logs estruturados (Pino):** redação configurada para `*.token`/`*.password`/`*.secret`/`*.cpf`, mas **não para `phone`/`email`** (dependem da disciplina `hash(phone)` no caller). Verifique que nenhum log emite `phone`/`email` cru (PII de marketplace). Confirme também se o **Log Drain (Better Stack)** e o **monitor externo de uptime** sobre `/api/health/login` estão de fato configurados — ambos exigem **Vercel Pro** e são passos manuais que podem ter ficado só no doc. O header `x-correlation-id` da resposta é uma boa âncora de evidência para reproduzir um achado.
- **Headers/CSP/cookie (valores concretos):** CSP está **enforced** ou ainda report-only? Há HSTS? `frame-ancestors`/X-Frame-Options? `script-src`/`style-src` ainda com `unsafe-inline` ou domínios largos? Cookie `kite_session` com `secure` em prod de fato?
- **Rotação de credenciais — GATE DE NO-GO:** os docs marcam senha do banco + `service_role` como **já vazadas no histórico** (runbook em `SECRETS.md`). Se a rotação **não** foi executada, isso é **NO-GO** para divulgação ampla. Não teste prod com credencial possivelmente comprometida.
- **Build/CI:** o CI roda lint/tsc/test/build, mas **branch protection pode não estar ativa** — confirme se o gate é *required* ou só advisory (push direto em `main` sem CI verde vai a prod).
- **SEO/perf (P2):** ausência de `robots.txt`/`sitemap`; `generateMetadata` sem canonical/hreflang apesar do i18n parcial; cards com `background-image` não otimizada (peso em 3G mobile).

## COMANDOS LOCAIS MÍNIMOS (dentro de `apps/web`)
```
npm run lint
npx tsc --noEmit
npm run test:run
JWT_SECRET=uma_chave_forte_com_mais_de_32_caracteres npm run build
```
Se algum falhar, classifique: **(a)** falha real de lançamento · **(b)** falha local por env ausente · **(c)** falha já conhecida/documentada. Lembre: estes comandos validam o **working tree local**, não `origin/main`.

---

## FORMATO DO RELATÓRIO

**1. Veredito** (uma linha): GO · GO PARA BETA PRIVADO · NO-GO.

**2. Matriz de cobertura** (prova de completude). Tabela jornada × viewport × papel, com status `passou` / `falhou` / `bloqueado-e-porquê`. Liste explicitamente o que **não** foi testado e por quê (ex.: bloqueado por OTP em prod, admin sem seed). Sem essa matriz, GO/NO-GO fica sobre cobertura desconhecida.

**3. Triagem do baseline.** Tabela dos achados de `AUDIT-PRE-LANCAMENTO.md`/`SECURITY-HARDENING.md` marcados `corrigido` / `aberto` / `mudou`, com a linha do código que prova.

**4. Achados novos por severidade:**
- **P0** bloqueia lançamento público
- **P1** bloqueia divulgação ampla, permite beta controlado
- **P2** corrigir depois
- **Falso-positivo / decisão de produto** (com a decisão travada que o refuta)

Cada achado: título curto · severidade · rota/tela · viewport/dispositivo · usuário (anônimo/comprador/vendedor/admin) · vale para `origin/main` ou só working tree · passos para reproduzir · esperado · observado · evidência (screenshot/console/network/log/trecho) · provável arquivo:linha raiz · correção recomendada · teste de regressão recomendado.

## CRITÉRIOS DE NO-GO
- Login/sessão inconsistente em produção
- Usuário não consegue publicar anúncio no mobile
- WhatsApp/contato acionável em estado errado (deal `disputed`, conta excluída, vendedor suspenso)
- Comprador/vendedor preso sem CTA
- Ação crítica falha silenciosamente (sem feedback e sem Sentry)
- PII (telefone/email/CPF/GPS de foto) exposta em payload, audit log ou imagem servida
- Produção depende de secret vazado/não rotacionado ou env quebrada
- IDOR confirmado em rota de mutação/leitura sensível
- Build/testes essenciais quebrados sem explicação aceitável

## REGRAS FINAIS
- Não duplique achados do baseline sem confirmar que ainda existem no código atual.
- Não pontue decisões travadas (PASSO 3) como bug.
- Não faça correção agora.
- Ao final, entregue uma **sequência de correção em blocos pequenos**, começando pelo **menor conjunto que transforma NO-GO em GO PARA BETA PRIVADO** (provavelmente: B-1 + os 2 sintomas + rotação de credenciais), depois o que abre para divulgação ampla.
