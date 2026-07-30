// Gate de verificação (requireVerifiedUser): telefone sempre exigido; e-mail só
// com VERIFICATION_GATE_EMAIL=on. Cobre as combinações de flags e o conteúdo de
// `missing` (o front usa pra decidir qual painel mostrar).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: { user: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock('../lib/db', () => ({ db: mockDb }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));

import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { requireVerifiedUser, VerificationRequiredError, UnauthorizedError } from '../lib/session';

const SECRET = 'dev-secret-troque'; // fallback de dev do session.ts

function sessionFor(userId: string) {
  const token = jwt.sign({ sub: userId, sv: 0 }, SECRET, { algorithm: 'HS256', expiresIn: '30d' });
  (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    getAll: () => [{ value: token }],
  });
}

const baseUser = {
  id: 'U1', sessionVersion: 0, status: 'active', deletedAt: null,
  phone: '+5585991234567', phoneVerified: true, email: 'a@b.com', emailVerified: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionFor('U1');
  delete process.env.VERIFICATION_GATE_EMAIL;
});
afterEach(() => {
  delete process.env.VERIFICATION_GATE_EMAIL;
});

async function missingOf(user: Record<string, unknown>): Promise<Array<'phone' | 'email'> | null> {
  mockDb.user.findUnique.mockResolvedValue({ ...baseUser, ...user });
  try {
    await requireVerifiedUser();
    return null;
  } catch (e) {
    if (e instanceof VerificationRequiredError) return e.missing;
    throw e;
  }
}

describe('requireVerifiedUser', () => {
  it('passa com phone verificado (gate de e-mail off por default)', async () => {
    expect(await missingOf({ email: null, emailVerified: false })).toBeNull();
  });

  it('bloqueia sem telefone (conta nascida por e-mail)', async () => {
    expect(await missingOf({ phone: null, phoneVerified: false })).toEqual(['phone']);
  });

  it('bloqueia com telefone presente mas não verificado', async () => {
    expect(await missingOf({ phoneVerified: false })).toEqual(['phone']);
  });

  it('gate on: bloqueia sem e-mail verificado', async () => {
    process.env.VERIFICATION_GATE_EMAIL = 'on';
    expect(await missingOf({ emailVerified: false })).toEqual(['email']);
    expect(await missingOf({ email: null, emailVerified: false })).toEqual(['email']);
  });

  it('gate on: acumula phone + email faltando', async () => {
    process.env.VERIFICATION_GATE_EMAIL = 'on';
    expect(await missingOf({ phone: null, phoneVerified: false, email: null, emailVerified: false })).toEqual(['phone', 'email']);
  });

  it('gate on: passa com os dois verificados', async () => {
    process.env.VERIFICATION_GATE_EMAIL = 'on';
    expect(await missingOf({})).toBeNull();
  });

  it('sem sessão lança UnauthorizedError (não VerificationRequiredError)', async () => {
    (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ getAll: () => [] });
    await expect(requireVerifiedUser()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
