import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { sessionCookieDomain } from './app-url';

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
const COOKIE_DOMAIN = process.env.NODE_ENV === 'production' ? sessionCookieDomain() : undefined;
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: MAX_AGE,
};

// Cria a sessão num cookie httpOnly (anti-XSS) — não vai pro localStorage.
// SEMPRE assina com o primeiro secret da lista (a "current key").
export async function setSession(userId: string, sessionVersion = 0) {
  // algorithm explícito (HS256): trava o contrato num único algoritmo simétrico. Sem o
  // pin, uma troca futura do secret pra KeyObject/PEM, ou mudança de default da lib,
  // poderia alargar silenciosamente os algoritmos aceitos (CWE-347). Casa com o verify.
  const token = jwt.sign({ sub: userId, sv: sessionVersion }, SIGNING_SECRET, { algorithm: 'HS256', expiresIn: '30d' });
  const jar = await cookies();
  // Mantém o host atual e o domínio canônico com o MESMO valor. Isso neutraliza
  // cookies antigos host-only em www/apex durante a transição para .kitetropos.com.
  jar.set(COOKIE, token, COOKIE_OPTIONS);
  if (COOKIE_DOMAIN) jar.set(COOKIE, token, { ...COOKIE_OPTIONS, domain: COOKIE_DOMAIN });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
  if (COOKIE_DOMAIN) {
    jar.set(COOKIE, '', {
      ...COOKIE_OPTIONS,
      domain: COOKIE_DOMAIN,
      maxAge: 0,
    });
  }
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

async function getSessionPayloads(): Promise<Array<{ sub: string; sv: number }>> {
  const tokens = Array.from(new Set((await cookies()).getAll(COOKIE).map((c) => c.value).filter(Boolean)));
  if (tokens.length === 0) return [];
  const sessions: Array<{ sub: string; sv: number }> = [];
  // Tenta cada secret na ordem (current primeiro, depois os antigos). Coleta todos os
  // cookies assinados de forma válida porque um host-only antigo pode aparecer antes do
  // cookie canônico de domínio e ainda assim estar com sessionVersion vencida.
  for (const token of tokens) {
    for (const secret of SECRETS) {
      try {
        // algorithms allowlist: só HS256. Fecha alg-confusion/alg:none de forma explícita
        // (jsonwebtoken v9 já rejeita, mas o pin trava o contrato contra mudança futura).
        const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as { sub: string; sv?: number };
        sessions.push({ sub: payload.sub, sv: payload.sv ?? 0 });
        break;
      } catch {
        // tenta o próximo secret/token
      }
    }
  }
  return sessions;
}

async function getSessionPayload(): Promise<{ sub: string; sv: number } | null> {
  return (await getSessionPayloads())[0] ?? null;
}

export async function getUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (user) return user.id;
  return (await getSessionPayload())?.sub ?? null;
}

// React cache() só existe no bundle server (condição react-server); em teste/node o
// named import vem undefined → degrada para identidade (a memo é irrelevante em unit test).
const reqCache = (typeof cache === 'function' ? cache : <T>(fn: T) => fn) as typeof cache;

// Usuário logado (ou null). Usar em Server Components e Route Handlers.
// Memoizado por request: chamar no header E no guard da página não duplica a query —
// o que torna a hidratação de auth no SSR do header grátis.
export const getCurrentUser = reqCache(async () => {
  const sessions = await getSessionPayloads();
  if (sessions.length === 0) return null;
  for (const session of sessions) {
    const user = await db.user.findUnique({ where: { id: session.sub } });
    if (!user || user.status === 'blocked') continue;
    // Defesa em profundidade: rejeita conta soft-deletada mesmo que algum fluxo futuro
    // reative `status` sem limpar `deletedAt`. Não depende só de status === 'blocked'.
    if (user.deletedAt) continue;
    if (user.sessionVersion !== session.sv) continue;
    return user;
  }
  return null;
});

// Versão enxuta da sessão para o chrome de navegação (header/tab bar): só o que a UI
// precisa, serializável para passar de Server Component a Client Component. Memoizada
// (compartilha a query de getCurrentUser no mesmo request).
export type NavUser = { id: string; name?: string; avatarUrl?: string };
export const getNavUser = reqCache(async (): Promise<NavUser | null> => {
  const u = await getCurrentUser();
  return u ? { id: u.id, name: u.name ?? undefined, avatarUrl: u.avatarUrl ?? undefined } : null;
});

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
