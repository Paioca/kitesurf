import 'server-only';
import { cookies, type UnsafeUnwrappedCookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { db } from './db';

const COOKIE = 'kite_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

// Segredo do JWT. Sem fallback adivinhável: em produção exigimos uma chave forte
// no startup — caso contrário qualquer um forjaria o cookie e assumiria contas.
function resolveSecret(): string {
  const s = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!s || s.length < 32) {
      throw new Error('JWT_SECRET ausente ou fraco: defina uma chave forte (>= 32 chars) em produção.');
    }
    return s;
  }
  // dev/test: fallback só fora de produção.
  return s ?? 'dev-secret-troque';
}
const SECRET = resolveSecret();

// Cria a sessão num cookie httpOnly (anti-XSS) — não vai pro localStorage.
export function setSession(userId: string, sessionVersion = 0) {
  const token = jwt.sign({ sub: userId, sv: sessionVersion }, SECRET, { expiresIn: '30d' });
  (cookies() as unknown as UnsafeUnwrappedCookies).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export function clearSession() {
  (cookies() as unknown as UnsafeUnwrappedCookies).delete(COOKIE);
}

function getSessionPayload(): { sub: string; sv: number } | null {
  const token = (cookies() as unknown as UnsafeUnwrappedCookies).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SECRET) as { sub: string; sv?: number };
    return { sub: payload.sub, sv: payload.sv ?? 0 };
  } catch {
    return null;
  }
}

export function getUserId(): string | null {
  return getSessionPayload()?.sub ?? null;
}

// Usuário logado (ou null). Usar em Server Components e Route Handlers.
export async function getCurrentUser() {
  const session = getSessionPayload();
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.sub } });
  if (!user || user.status === 'blocked') return null;
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
