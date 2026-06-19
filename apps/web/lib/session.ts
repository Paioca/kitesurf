import 'server-only';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { db } from './db';

const COOKIE = 'kite_session';
const SECRET = process.env.JWT_SECRET ?? 'dev-secret-troque';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

// Cria a sessão num cookie httpOnly (anti-XSS) — não vai pro localStorage.
export function setSession(userId: string) {
  const token = jwt.sign({ sub: userId }, SECRET, { expiresIn: '30d' });
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export function clearSession() {
  cookies().delete(COOKIE);
}

export function getUserId(): string | null {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SECRET) as { sub: string };
    return payload.sub;
  } catch {
    return null;
  }
}

// Usuário logado (ou null). Usar em Server Components e Route Handlers.
export async function getCurrentUser() {
  const id = getUserId();
  if (!id) return null;
  const user = await db.user.findUnique({ where: { id } });
  if (!user || user.status === 'blocked') return null;
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
