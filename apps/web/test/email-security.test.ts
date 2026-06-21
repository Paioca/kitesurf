import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailTokenPurpose } from '@prisma/client';

const { emailToken } = vi.hoisted(() => ({
  emailToken: {
    updateMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock('../lib/db', () => ({ db: { emailToken } }));

import { findValidEmailToken, hashEmailToken, issueEmailToken, normalizeEmail } from '../lib/email-security';

describe('segurança por e-mail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('normaliza e valida o endereço', () => {
    expect(normalizeEmail('  Felipe@Example.COM ')).toBe('felipe@example.com');
    expect(normalizeEmail('sem-arroba')).toBeNull();
    expect(normalizeEmail('a@b')).toBeNull();
  });

  it('gera um hash determinístico sem preservar o token puro', () => {
    const raw = 'token-secreto';
    expect(hashEmailToken(raw)).toBe(hashEmailToken(raw));
    expect(hashEmailToken(raw)).not.toContain(raw);
    expect(hashEmailToken(raw)).toHaveLength(64);
  });

  it('invalida o link anterior antes de emitir outro', async () => {
    emailToken.updateMany.mockResolvedValue({ count: 1 });
    emailToken.create.mockImplementation(async ({ data }) => ({ id: 'new-token', ...data }));

    const issued = await issueEmailToken('user-1', 'felipe@example.com', EmailTokenPurpose.recovery);

    expect(emailToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', purpose: EmailTokenPurpose.recovery, consumedAt: null },
      data: { consumedAt: expect.any(Date) },
    });
    expect(emailToken.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      userId: 'user-1',
      email: 'felipe@example.com',
      purpose: EmailTokenPurpose.recovery,
      tokenHash: hashEmailToken(issued.raw),
      expiresAt: expect.any(Date),
    }) });
    expect(issued.raw).toMatch(/^[A-Za-z0-9_-]{40,100}$/);
  });

  it('rejeita token consumido ou expirado', async () => {
    const raw = 'a'.repeat(43);
    emailToken.findUnique.mockResolvedValueOnce({
      purpose: EmailTokenPurpose.verify,
      consumedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(findValidEmailToken(raw, EmailTokenPurpose.verify)).resolves.toBeNull();

    emailToken.findUnique.mockResolvedValueOnce({
      purpose: EmailTokenPurpose.verify,
      consumedAt: null,
      expiresAt: new Date(Date.now() - 60_000),
    });
    await expect(findValidEmailToken(raw, EmailTokenPurpose.verify)).resolves.toBeNull();
  });
});
