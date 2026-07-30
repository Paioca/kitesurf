# PLANO — Cadastro/login por e-mail + gates de verificação (telefone E e-mail)

> **Para quem é este doc:** modelo executor. Siga na ordem. Não invente escopo além do descrito.
> **Contexto:** usuários reclamam do login por SMS (código não chega / Twilio é SPOF). Vamos
> (Fase 1) permitir criar conta e logar por e-mail, (Fase 2) exigir telefone verificado **e**
> e-mail verificado para criar anúncio e para solicitar oferta/visita. (Fase 3, fora deste
> plano) login Google.
> **Regras operacionais:** ler `.claude/skills/kitetropos-scope-safe-release-check` antes de
> commitar. Migrations e seeds SÓ contra STAGING (ref `otuqhjatkdtmazvfnjrw`) — nunca prod.
> Branch nova a partir de `main`; NÃO trabalhar em cima de `feat/wing-catalog`.

## Arquitetura atual (resumo do que você precisa saber)

- Auth é **próprio** (não é Supabase Auth): OTP 6 dígitos → JWT HS256 em cookie httpOnly
  (`apps/web/lib/session.ts`). Identidade primária hoje é `User.phone` (NOT NULL, @unique).
- Rotas: `POST /api/auth/otp/request` e `POST /api/auth/otp/verify`
  (`apps/web/app/api/auth/otp/{request,verify}/route.ts`), lib `apps/web/lib/otp.ts`.
- O canal e-mail **já existe** nas duas rotas, mas só para conta EXISTENTE com
  `emailVerified=true` (fallback do SPOF Twilio). Cadastro novo é só por telefone.
- Verificação de e-mail por link já existe:
  `apps/web/app/api/auth/email/verification/{request,confirm}/route.ts`.
- `OtpCode` já aceita `phone` OU `email` (CHECK constraint de exclusividade) e tem campo
  `context` — use contextos distintos para fluxos distintos.
- Gates de hoje: criar anúncio (`POST /api/listings`) e solicitar oferta/visita
  (`POST /api/listings/[id]/request`) só chamam `requireUser()`. Nenhum exige e-mail.

---

## FASE 1 — Cadastro e login por e-mail

### 1.1 Migration: `phone` vira opcional

`apps/web/prisma/schema.prisma`, model `User`:

- `phone String @unique` → `phone String? @unique` (Postgres permite vários NULL em unique).
- `phoneCountry` ganha `?` também (só faz sentido com phone) OU mantém default "BR" — manter
  o default é aceitável; escolha o que gerar migration mais simples.
- NÃO mexer em `phoneVerified` (fica `Boolean @default(false)`).

Rodar `prisma migrate dev` (staging). Nome: `phone_optional_for_email_signup`.

Depois da migration, rodar `npx tsc --noEmit` no `apps/web` e corrigir TODO lugar que
assume `user.phone: string` (agora é `string | null`). Locais conhecidos que tocam
`user.phone` (verificar todos com grep `\.phone` em `apps/web`):

- `apps/web/lib/notify.ts` — `notifyNewRequest`, `notifyRequestAccepted`,
  `notifyRequestReminder`: se `phone` for null, **pular o envio silenciosamente com log
  `warn`** (evento `notify_skipped_no_phone`). Na prática o gate da Fase 2 garante phone
  antes de existir Request, mas o código não pode quebrar.
- Aceite de oferta (revela WhatsApp do comprador) — mesma regra: se null, não revelar,
  logar warn. (Fase 2 impede esse estado.)
- Páginas de perfil/admin que renderizam telefone: render condicional.

### 1.2 `POST /api/auth/otp/request` — canal e-mail passa a servir cadastro

`apps/web/app/api/auth/otp/request/route.ts`, função `handleEmail`:

- Hoje: só envia OTP se usuário existir com `emailVerified=true` (linhas 74–88).
- Novo comportamento:
  - Se usuário existe e está ativo (`!deletedAt && status === 'active'`): envia OTP
    **mesmo sem `emailVerified`** — logar por e-mail passa a valer como verificação
    (quem digita o código provou posse da caixa; ver 1.3).
  - Se usuário existe mas `deletedAt` ou `status !== 'active'`: NÃO envia, devolve a
    resposta genérica (mantém anti-enumeração para contas bloqueadas).
  - Se usuário NÃO existe: **envia OTP mesmo assim** (é cadastro novo).
- Manter resposta genérica `genericEmailOk` em todos os caminhos e os rate-limits
  fail-closed existentes. Atualizar o comentário do topo do arquivo (linhas 15–19), que
  ficará defasado.
- Validação extra no cadastro: `normalizeEmail` já roda; se existir util de bloqueio de
  e-mail descartável em `lib/email-security.ts`, aplicar aqui também.

### 1.3 `POST /api/auth/otp/verify` — onboarding por e-mail

`apps/web/app/api/auth/otp/verify/route.ts`, função `verifyByEmail`:

Espelhar a estrutura de `verifyByPhone` (linhas 92–159):

1. Buscar `db.user.findUnique({ where: { email } })`.
2. **Usuário existe** (aceitar também `emailVerified=false` agora — remover essa condição
   do check da linha 69, manter `deletedAt`/`blocked` e o dummy bcrypt anti-timing):
   - `verifyOtp({ email }, code, true)`; se ok e `!user.emailVerified`, setar
     `emailVerified: true` no update (código na caixa = posse provada).
   - `setSession` e responder como hoje.
3. **Usuário NÃO existe** (cadastro):
   - Sem `name`/`avatarUrl`: `verifyOtp({ email }, code, false)` (espiar sem queimar) e
     responder `{ needsOnboarding: true }` 400 — idêntico ao fluxo phone (linhas 108–115).
   - Com onboarding completo: `verifyOtp(..., true)`, então
     `db.user.create({ data: { email, emailVerified: true, phone: null, phoneVerified: false, name, lastName, spot, country, avatarUrl, locale } })`.
   - `setSession` e responder `{ ok: true, channel: 'email', user: {...} }`.
4. Corrida de cadastro duplicado: envolver o `create` em try/catch de unique violation
   (P2002) → responder 409 "E-mail já cadastrado.".

Atualizar os comentários das linhas 20–22 e 58–59 (premissa "só conta existente" morre).

### 1.4 UI de login — `apps/web/app/entrar/page.tsx`

- Hoje o e-mail é apresentado como fallback ("não recebeu SMS?"). Promover a escolha de
  canal para o primeiro passo: duas abas/botões "Entrar com telefone" / "Entrar com e-mail",
  telefone como default visual.
- Fluxo e-mail passa a suportar o branch `needsOnboarding` (reusar exatamente a mesma tela
  de perfil nome+foto que o fluxo phone já usa — não duplicar componente).
- Copys em pt e en se a página for localizada (seguir padrão existente do arquivo).

### 1.5 Testes da Fase 1

Seguir o padrão de testes existente no repo (procurar testes das rotas de auth; se não
houver, criar unit tests dos handlers com mocks do `db` no mesmo estilo dos testes que
existirem em `apps/web`):

- request e-mail: usuário inexistente → envia OTP e devolve resposta genérica.
- verify e-mail: cadastro novo sem name/foto → `needsOnboarding`; com onboarding → cria
  user com `emailVerified=true`, `phone=null`.
- verify e-mail: usuário existente com `emailVerified=false` → loga e marca verificado.
- verify e-mail: usuário `blocked`/`deletedAt` → 401 genérico.
- notify.ts com `phone=null` → não lança, loga skip.

---

## FASE 2 — Gates: anunciar e solicitar exigem phone+email verificados

### 2.1 Helper `requireVerifiedUser()` em `apps/web/lib/session.ts`

```ts
// Exige login + telefone e e-mail verificados — para ações de negociação
// (criar anúncio, solicitar oferta/visita). Lança VerificationRequiredError
// com a lista do que falta, para a rota devolver 403 estruturado.
export async function requireVerifiedUser() {
  const user = await requireUser();
  const missing: Array<'phone' | 'email'> = [];
  if (!user.phone || !user.phoneVerified) missing.push('phone');
  if (!user.email || !user.emailVerified) missing.push('email');
  if (missing.length) throw new VerificationRequiredError(missing);
  return user;
}

export class VerificationRequiredError extends Error {
  constructor(public missing: Array<'phone' | 'email'>) {
    super('Verificação pendente.');
  }
}
```

### 2.2 Aplicar nas rotas (o gate que vale é o do backend)

- `apps/web/app/api/listings/route.ts` (POST, ~linha 90): trocar `requireUser()` por
  `requireVerifiedUser()`.
- `apps/web/app/api/listings/[id]/request/route.ts` (POST, ~linha 18): idem (cobre oferta
  E visita — é a mesma rota).
- NÃO aplicar em: aceitar/recusar (`PATCH /api/requests/[id]`), mensagens, edição de
  perfil, nem em nada de leitura. Escopo é só criar anúncio + criar request.
- Onde as rotas tratam `UnauthorizedError` hoje, adicionar catch de
  `VerificationRequiredError` → `403 { code: 'verification_required', missing: [...] }`.
  Se houver handler central de erros, tratar lá.

### 2.3 Fluxo "adicionar e verificar telefone" (para quem cadastrou por e-mail)

Novas rotas, espelhando o par request/verify existente:

- `POST /api/auth/phone/verification/request` — body `{ phone }`. `requireUser()`;
  normalizar E.164 (`lib/phone.ts`); rejeitar se telefone já pertence a OUTRO usuário
  (409, mensagem genérica "Não foi possível usar este telefone." para não vazar);
  `generateOtp({ phone }, 'phone-verify')` — **usar `context: 'phone-verify'`**, nunca
  'login', para um OTP deste fluxo não servir para logar. Rate-limits iguais aos de
  `otp/request` (5/phone/h, 20/IP/h, fail-closed).
- `POST /api/auth/phone/verification/confirm` — body `{ phone, code }`. `requireUser()`;
  `verifyOtp({ phone }, code, true, 'phone-verify')`; re-checar conflito de unique dentro
  do update (catch P2002); gravar `phone`, `phoneCountry`, `phoneVerified: true`.

Observação: já existe fluxo de recovery/troca de phone
(`apps/web/app/api/auth/recovery/phone/...`) — LER antes de criar; se ele já cobrir
"adicionar phone quando phone é null", reusar/estender em vez de duplicar.

### 2.4 Frontend do gate

- `apps/web/app/anunciar/page.tsx` e o ponto de UI que dispara oferta/visita (procurar o
  fetch para `/api/listings/[id]/request`): ao receber `403 verification_required`,
  redirecionar/abrir tela "Falta confirmar seu {telefone|e-mail}" com o fluxo inline:
  - e-mail faltando → botão que chama `POST /api/auth/email/verification/request`
    (já existe) + aviso "cheque sua caixa de entrada".
  - phone faltando → formulário usando as rotas novas de 2.3.
- Melhor UX: checar `missing` já no load da página de anunciar (o usuário atual da sessão
  tem os flags) e mostrar o passo de verificação ANTES do formulário do anúncio, não
  depois do submit. O 403 do backend fica como cinto de segurança.

### 2.5 Transição para usuários existentes do beta

Todos os usuários atuais têm `phoneVerified=true`; muitos têm `email` null ou não
verificado. Para não travar o beta de Cumbuco no dia do deploy:

- Env var `VERIFICATION_GATE_EMAIL=off|on` (default `off`). Em `requireVerifiedUser`,
  só empurrar `'email'` para `missing` se `on`. O gate de phone fica sempre ativo.
- Criar script `apps/web/scripts/diag-verification-gate.mjs` (padrão dos `diag-*.mjs`
  existentes, read-only): contar usuários ativos com anúncio ativo ou request nos últimos
  30 dias, quebrando por `email null / email não verificado / verificado`.
- O dono decide quando ligar `on` em prod (depois de rodar o diag e avisar usuários).
  Este plano NÃO liga o gate de e-mail em prod.

### 2.6 Testes da Fase 2

- `requireVerifiedUser`: 4 combinações de flags → missing correto.
- POST /api/listings sem e-mail verificado com gate `on` → 403 `verification_required`.
- POST /api/listings com gate `off` e phone ok → passa.
- phone/verification/request com telefone de outro usuário → 409 genérico.
- phone/verification/confirm com OTP de contexto 'login' → falha (contexto errado).

---

## FASE 3 — Google OAuth (NÃO implementar agora)

Registrado só para não perder a decisão: rotas próprias `/api/auth/google/start` +
`/callback` (state + PKCE), vincular por e-mail **apenas** se bater com `email` já
verificado de conta existente; senão criar conta nova com `emailVerified=true`. Sessão
continua sendo o JWT próprio. Fica para depois de 1+2 estarem estáveis em prod.

## Checklist de entrega

- [ ] Branch nova a partir de `main` (ex: `feat/email-signup-verification-gates`).
- [ ] Migration aplicada SÓ em staging; `prisma migrate diff` sem drift.
- [ ] `npx tsc --noEmit` limpo; grep `\.phone` revisado (nenhum acesso non-null sem guard).
- [ ] Testes das Fases 1 e 2 passando + suíte existente inteira.
- [ ] Comentários defasados das rotas de OTP atualizados.
- [ ] `VERIFICATION_GATE_EMAIL` documentada onde as demais env vars estão documentadas
      (.env.example / doc de envs do repo).
- [ ] Validar em Vercel Preview (CSP estrita está enforcada em prod — testar preview
      antes de merge, conforme runbook do repo).
- [ ] PR para `main` descrevendo: fase 1, fase 2, gate de e-mail default OFF, e o comando
      do diag para o dono rodar antes de ligar o gate.

## Fora de escopo (não fazer)

- Google/Apple OAuth (Fase 3).
- Remover Twilio ou mudar provedor de SMS.
- Exigir verificação para aceitar/recusar pedido, chat, ou edição de perfil.
- Ligar `VERIFICATION_GATE_EMAIL=on` em produção.
- Qualquer mutação em banco de produção.
