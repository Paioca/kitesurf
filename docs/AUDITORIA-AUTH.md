# Auditoria de Autenticação e Identidade — Kitesurf Marketplace

**Data:** 2026-06-24
**Escopo:** cadastro, login por telefone (OTP), envio/validação de OTP, sessão, logout, troca de telefone, recuperação, controle de acesso e prevenção de abuso.
**Método:** leitura dos handlers reais em `apps/web/app/api/auth/*` e libs `lib/{session,otp,ratelimit,email-security,lifecycle,moderation}.ts`.

## Veredito geral

Código **notavelmente bem endurecido**. A maioria dos bugs clássicos já está fechada: claim atômico de tentativas de OTP, timing equalizado com dummy-hash, JWT HS256 pinado, allowlist Zod no PATCH /me (sem mass-assignment), `sessionVersion` validado contra o banco em todo request. **Nenhum achado crítico.** Os riscos reais estavam em (1) IP forjável e (2) revogação de sessão incompleta.

---

## Achados

| # | Sev | Achado | Arquivo | Status |
|---|-----|--------|---------|--------|
| 1 | ALTO | `clientIp()` confiava em `x-forwarded-for[0]` (forjável) → limites por-IP anuláveis | `lib/ratelimit.ts:54` | ✅ Corrigido |
| 2 | ALTO | Logout só apagava o cookie; JWT seguia válido 30d se vazado | `app/api/auth/logout/route.ts` | ✅ Corrigido |
| 3 | ALTO | Brute-force OTP 6 dígitos via reenvio; margem estreita, dependia do #1 | `lib/otp.ts:32` | ⚠️ Mitigado por #1; ver recomendação |
| 4 | MÉDIO | Sessão 30d sem renovação deslizante **nem step-up** em ações financeiras | `lib/session.ts:7`; `app/api/deals/*` | ⬜ Backlog |
| 5 | MÉDIO | Troca de e-mail não incrementava `sessionVersion` | `app/api/auth/me/route.ts:60` | ✅ Corrigido |
| 6 | MÉDIO | Squatting de e-mail não-verificado bloqueia cadastro legítimo via `@unique` | `app/api/auth/me/route.ts:55` | ⬜ Backlog |
| 7 | MÉDIO | Enumeração + oráculo de timing no verify por telefone | `app/api/auth/otp/verify/route.ts:99` | ⬜ Backlog |
| 8 | MÉDIO | OTPs antigos não invalidados ao reissue — amplifica #3 | `lib/otp.ts:43` | ⬜ Backlog |
| 9 | BAIXO | Fixed-window permite burst de 2× na virada do bucket | `lib/ratelimit.ts:28` | ⬜ Backlog |
| 10 | BAIXO | `getCurrentUser` não checava `deletedAt` diretamente | `lib/session.ts:93` | ✅ Corrigido |
| 11 | BAIXO | `recovery/phone/request` vaza existência de telefone (409 específico) | `app/api/auth/recovery/phone/request/route.ts:30` | ⬜ Backlog |

**Confirmados corretos (sem achado):** mass-assignment no PATCH /me (allowlist Zod), concessão de admin (só DB manual), troca de telefone 2-fatores, EmailToken single-use sem IDOR, `sessionVersion++` pós-troca de telefone, expiração/consumo atômico de OTP, flags de cookie, JWT HS256 pinado, soft-delete anonimiza PII e libera telefone/email.

---

## Correções aplicadas nesta sessão

### #1 — `clientIp()` (`lib/ratelimit.ts`)
Passa a usar `x-vercel-forwarded-for` / `x-real-ip` (injetados e sobrescritos pela Vercel na borda, não spoofáveis). XFF só como último recurso, pegando o **último** hop (appendado pela infra), nunca o `[0]` controlado pelo cliente.

### #2 — Logout invalida o JWT (`logout/route.ts` + `lib/session.ts`)
Novo helper `revokeAllSessions(userId)` incrementa `sessionVersion`. Logout chama antes de apagar o cookie → token vazado para de valer no servidor.

### #5 — Troca de e-mail revoga sessões (`me/route.ts`)
PATCH com `emailChanged` incrementa `sessionVersion` e reemite o cookie da sessão atual via `setSession` (o próprio usuário continua logado; sessões concorrentes caem).

### #10 — `getCurrentUser` checa `deletedAt` (`lib/session.ts`)
Defesa em profundidade independente de `status === 'blocked'`.

> Typecheck (`tsc --noEmit`) limpo após as mudanças.

---

## Backlog recomendado (prioridade)

1. **#4 — Step-up em ações financeiras.** Exigir OTP recente nas rotas `deals/{confirm,cancel,reversal,correct}` e na troca de e-mail. Reduzir sessão base (ex.: 7d) com renovação deslizante. Maior risco residual.
2. **#8 — Invalidar OTPs anteriores no reissue.** `updateMany ... consumed:true` nos pendentes de `(phone/email, context)` ao gerar novo código. Reduz superfície de brute-force.
3. **#3 — Reforçar limite por-conta no verify.** Baixar `otp:verify:phone` de 10/h para ~5/h; considerar lockout incremental por conta.
4. **#7 — Fechar enumeração/timing por telefone.** Adicionar dummy-bcrypt quando não há OTP pendente (espelhar `DUMMY_OTP_HASH` do e-mail); unificar resposta de `needsOnboarding`.
5. **#6 — Squatting de e-mail.** Rejeitar troca para e-mail já verificado por outra conta (mensagem genérica); expirar reservas de e-mails não-verificados.
6. **#9 — Sliding window** no rate limiter (índice `[key, createdAt]` já existe no schema).
7. **#11 — Mensagem genérica** em `recovery/phone/request`.

## Observabilidade
`AuditEvent` hoje cobre delete/email-change/purchase. Recomenda-se adicionar: login, falha de OTP, rate-limit hit, troca de telefone, mudança de `admin` — para investigação de fraude.
