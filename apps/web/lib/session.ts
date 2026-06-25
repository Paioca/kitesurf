import 'server-only';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { db } from './db';

const COOKIE = 'kite_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

// Segredo(s) do JWT — suporte a ROTAÇÃO sem deslogar usuários.
//
// JWT_SECRETS (CSV, recomendado): lista. Primeiro entry ASSINA novos cookies; todos
// os entries VERIFICAM (cookies emitidos antes da rotação ainda passam até expirar).
// Fluxo de rotação:
//   1. Gera nova chave forte: `openssl rand -hex 48`
//   2. Adiciona como PRIMEIRA no JWT_SECRETS, mantém a antiga:
//      JWT_SECRETS="<nova>,<antiga>"
//   3. Redeploy. Cookies novos saem assinados com <nova>; antigos continuam válidos
//      via <antiga>.
//   4. Após 30 dias (MAX_AGE de sessão), todos os cookies foram emitidos com <nova>.
//      Remove <antiga> do JWT_SECRETS. Redeploy.
//
// JWT_SECRET (legado, single): ainda aceito como fallback se JWT_SECRETS não estiver
// setado. Mesma semântica de antes (single key sign+verify). Migração: setar
// JWT_SECRETS com o mesmo valor e remover JWT_SECRET no próximo deploy.
function resolveSecrets(): string[] {
  const csv = process.env.JWT_SECRETS;
  const single = process.env.JWT_SECRET;
  const raw = csv
    ? csv.split(',').map((s) => s.trim()).filter(Boolean)
    : single
    ? [single]
    : [];

  if (process.env.NODE_ENV === 'production') {
    if (raw.length === 0 || raw.some((s) => s.length < 32)) {
      throw new Error('JWT_SECRETS/JWT_SECRET ausente ou fraco: cada chave precisa ter >= 32 chars em produção.');
    }
    return raw;
  }
  // dev/test: fallback só fora de produção.
  return raw.length ? raw : ['dev-secret-troque'];
}
const SECRETS = resolveSecrets();
const SIGNING_SECRET = SECRETS[0];

// Cria a sessão num cookie httpOnly (anti-XSS) — não vai pro localStorage.
// SEMPRE assina com o primeiro secret da lista (a "current key").
export async function setSession(userId: string, sessionVersion = 0) {
  // algorithm explícito (HS256): trava o contrato num único algoritmo simétrico. Sem o
  // pin, uma troca futura do secret pra KeyObject/PEM, ou mudança de default da lib,
  // poderia alargar silenciosamente os algoritmos aceitos (CWE-347). Casa com o verify.
  const token = jwt.sign({ sub: userId, sv: sessionVersion }, SIGNING_SECRET, { algorithm: 'HS256', expiresIn: '30d' });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

// Revoga TODAS as sessões emitidas para um usuário, incrementando sessionVersion.
// getCurrentUser compara user.sessionVersion com o sv do JWT (linha do verify), então
// qualquer cookie antigo — inclusive um token vazado — para de valer imediatamente.
// Usar em: logout, troca de e-mail (canal de segurança) e exclusão de conta.
// Retorna o novo sessionVersion para quem precisar reemitir o cookie da sessão atual.
export async function revokeAllSessions(userId: string): Promise<number> {
  const updated = await db.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  return updated.sessionVersion;
}

async function getSessionPayload(): Promise<{ sub: string; sv: number } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  // Tenta cada secret na ordem (current primeiro, depois os antigos). Aceita o primeiro
  // que verificar. Se nenhum verificar, sessão inválida.
  for (const secret of SECRETS) {
    try {
      // algorithms allowlist: só HS256. Fecha alg-confusion/alg:none de forma explícita
      // (jsonwebtoken v9 já rejeita, mas o pin trava o contrato contra mudança futura).
      const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as { sub: string; sv?: number };
      return { sub: payload.sub, sv: payload.sv ?? 0 };
    } catch {
      // tenta o próximo
    }
  }
  return null;
}

export async function getUserId(): Promise<string | null> {
  return (await getSessionPayload())?.sub ?? null;
}

// Usuário logado (ou null). Usar em Server Components e Route Handlers.
export async function getCurrentUser() {
  const session = await getSessionPayload();
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.sub } });
  if (!user || user.status === 'blocked') return null;
  // Defesa em profundidade: rejeita conta soft-deletada mesmo que algum fluxo futuro
  // reative `status` sem limpar `deletedAt`. Não depende só de status === 'blocked'.
  if (user.deletedAt) return null;
  if (user.sessionVersion !== session.sv) return null;
  return user;
}

// Exige login; lança se não houver — para mutations.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

// Exige admin (moderação). Lança se não logado ou não-admin.
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  if (!user.admin) throw new ForbiddenError();
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Não autenticado.');
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super('Sem permissão.');
  }
}
