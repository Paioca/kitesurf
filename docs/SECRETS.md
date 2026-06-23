# Secrets — procedimento de rotação

Runbook para rotacionar credenciais do Kitetropos sem deslogar usuários nem quebrar
prod. Aplica a três classes de secret:

1. `JWT_SECRETS` — chave(s) que assina(m) o cookie de sessão (`kite_session`)
2. `SUPABASE_SERVICE_ROLE_KEY` — chave que bypassa RLS no Storage/DB
3. Senha do Postgres (em `DATABASE_URL` e `DIRECT_URL`)

Regras gerais:

- Toda rotação é em **3 passos**: gerar nova, deployar com **as duas** (nova+antiga)
  em paralelo, remover a antiga depois de uma janela de transição.
- Nunca rotaciona em sexta-feira à tarde.
- Toda rotação termina **fora** do `.env` local — guarda a chave nova no 1Password/
  Bitwarden/Notion seguro **antes** de salvar no Vercel.

---

## 1. `JWT_SECRETS` (cookie de sessão)

A trava: se trocar o secret sem janela de transição, todo cookie ativo (até 30 dias
de vida) vira inválido instantaneamente — TODOS os usuários deslogam. O suporte a
lista resolve isso: várias chaves verificam em paralelo, mas só a primeira assina.

### Quando rotacionar
- Suspeita de comprometimento (vazamento de env, dev saindo, audit)
- Trimestralmente como hygiene

### Passo a passo

1. **Gerar chave nova** (>= 32 chars, hex de 48 bytes é folga):
   ```bash
   openssl rand -hex 48
   ```

2. **Deployar com as duas chaves** (nova primeiro, antiga em seguida):
   - Vercel → Settings → Environment Variables
   - Edita `JWT_SECRETS` (se ainda não existe, cria) com valor CSV:
     ```
     <chave-nova>,<chave-antiga>
     ```
   - Se ainda existe o legado `JWT_SECRET`, **mantém** durante a transição.
   - Production + Preview marcados.
   - Save → Redeploy (sem cache).

3. **Aguardar a janela de expiração**: cookies têm `maxAge = 30 dias`. Depois de 30
   dias, todo cookie ativo foi emitido com a chave nova (a antiga só verifica).

4. **Remover a chave antiga**:
   - Vercel → editar `JWT_SECRETS`:
     ```
     <chave-nova>
     ```
   - Se ainda existia `JWT_SECRET` legado, deleta agora.
   - Save → Redeploy.

5. **Verificar:** após o redeploy, faz logout/login em uma conta de teste — fluxo
   completo deve funcionar.

### Atalho de emergência (suspeita de comprometimento ATIVO)

Se a chave antiga vazou e tem risco real de uso pra forjar sessões:

- **Pula a janela de 30 dias.** Faz Passo 1 → Passo 2 com SÓ a chave nova
  (`JWT_SECRETS=<nova>`), não inclui a antiga. Todo cookie ativo invalida.
- **Aceita o custo:** todos os usuários precisam logar de novo (re-OTP).
- Comunica os usuários (banner no site / e-mail) explicando "fizemos uma manutenção
  de segurança, faça login novamente".

---

## 2. `SUPABASE_SERVICE_ROLE_KEY`

A trava: essa chave **bypassa RLS** em Storage e DB. Vazamento = comprometimento
total. Trocar é simples mas **invalida** a antiga imediatamente — não dá pra ter
duas em paralelo. Por isso prefere fazer no horário de menor uso.

### Passo a passo

1. **Supabase Dashboard** → seu projeto → **Settings** → **API**
2. Rola até **Project API keys** → **service_role** → **Regenerate**
3. Copia a nova chave **imediatamente** (só aparece uma vez)
4. **Atualiza nos lugares na ordem:**
   - **Vercel** → Environment Variables → `SUPABASE_SERVICE_ROLE_KEY` → Edit → cola
     → Save → Redeploy
   - **`.env` local** → atualiza também (caso contrário scripts param de funcionar)
   - **1Password/Bitwarden** → salva a nova
5. **Verificar:**
   - Bate na probe: `https://kitetropos.com/api/health/login` deve continuar 200
   - Sobe um anúncio com imagem (testa upload no Storage)

⚠️ Janela de risco: entre a regeneração e o redeploy da Vercel ficar Ready (~2 min),
uploads/queries do Storage **vão falhar**. Faz fora do pico.

---

## 3. Senha do Postgres (Supabase)

A trava: a senha aparece em `DATABASE_URL` e `DIRECT_URL`. Tem que trocar nos dois.
E como migrations rodam do laptop, o `.env` local também.

### Passo a passo

1. **Supabase Dashboard** → seu projeto → **Settings** → **Database**
2. **Database password** → **Reset database password** → cola a nova
3. **Copia a nova senha imediatamente** (só aparece uma vez)
4. **Atualiza nos lugares:**
   - **Vercel** → `DATABASE_URL` e `DIRECT_URL` → Edit → substitui só o pedaço da
     senha → Save → Redeploy
   - **`.env` local** → mesmas duas vars
   - **1Password/Bitwarden** → guarda
5. **Verificar:**
   - Probe: `https://kitetropos.com/api/health/login` → DB ok
   - Do laptop: `npx prisma migrate status` no apps/web deve responder normalmente

⚠️ Mesma janela de risco do service-role: entre reset e redeploy, queries falham.

---

## Trilha de auditoria

Toda rotação deve gerar uma entrada manual em algum lugar rastreável (Notion, Linear,
README): data, secret rotacionado, motivo (hygiene / suspeita / vazamento confirmado),
quem executou. Ajuda a reconstruir incidentes depois.

Modelo:
```
[2026-07-15] JWT_SECRETS rotacionado — hygiene trimestral — Felipe
[2026-08-02] SERVICE_ROLE_KEY rotacionado — suspeita de vazamento via screenshot — Felipe
```
