// Cadastro/login por e-mail em POST /api/auth/otp/verify: conta nova nasce com
// phone=null + emailVerified=true; conta existente ganha emailVerified ao logar;
// bloqueada/excluída recebe resposta genérica.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb, mockVerifyOtp, mockSetSession, mockRateLimit } = vi.hoisted(() => ({
  mockDb: { user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() } },
  mockVerifyOtp: vi.fn(),
  mockSetSession: vi.fn().mockResolvedValue(undefined),
  mockRateLimit: vi.fn().mockResolvedValue(true),
}));
vi.mock('../lib/db', () => ({ db: mockDb }));
vi.mock('../lib/otp', () => ({ verifyOtp: mockVerifyOtp }));
vi.mock('../lib/session', () => ({ setSession: mockSetSession }));
vi.mock('../lib/ratelimit', () => ({
  rateLimit: mockRateLimit,
  clientIp: () => '1.2.3.4',
  tooMany: () => new Response(JSON.stringify({ message: 'Muitas tentativas.' }), { status: 429 }),
}));
vi.mock('../lib/storage', () => ({ isOfficialImageUrl: () => true }));
vi.mock('server-only', () => ({}));

import { POST } from '../app/api/auth/otp/verify/route';

const call = (body: Record<string, unknown>) =>
  POST(new Request('http://test/api/auth/otp/verify', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockResolvedValue(true);
});

describe('verify por e-mail', () => {
  it('conta nova sem onboarding → needsOnboarding (espia sem queimar o código)', async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    mockVerifyOtp.mockResolvedValue(true);
    const res = await call({ email: 'novo@ex.com', code: '123456' });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.needsOnboarding).toBe(true);
    expect(mockVerifyOtp).toHaveBeenCalledWith({ email: 'novo@ex.com' }, '123456', false);
    expect(mockDb.user.create).not.toHaveBeenCalled();
  });

  it('conta nova com onboarding → cria user phone=null, emailVerified=true e loga', async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    mockVerifyOtp.mockResolvedValue(true);
    mockDb.user.create.mockResolvedValue({ id: 'U9', name: 'Ana', avatarUrl: 'a.jpg', sessionVersion: 0 });
    const res = await call({ email: 'Novo@Ex.com', code: '123456', name: 'Ana', avatarUrl: 'https://img/a.jpg' });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    const created = mockDb.user.create.mock.calls[0][0].data;
    expect(created.email).toBe('novo@ex.com'); // normalizado
    expect(created.emailVerified).toBe(true);
    expect(created.phone).toBeNull();
    expect(created.phoneVerified).toBe(false);
    expect(mockSetSession).toHaveBeenCalledWith('U9', 0);
  });

  it('conta existente sem emailVerified → loga e marca verificado', async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: 'U1', name: 'Bia', avatarUrl: null, emailVerified: false, locale: 'pt', sessionVersion: 2, status: 'active', deletedAt: null });
    mockVerifyOtp.mockResolvedValue(true);
    mockDb.user.update.mockResolvedValue({ id: 'U1', name: 'Bia', avatarUrl: null, sessionVersion: 2 });
    const res = await call({ email: 'bia@ex.com', code: '123456' });
    expect(res.status).toBe(200);
    expect(mockDb.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ emailVerified: true }) }));
    expect(mockSetSession).toHaveBeenCalledWith('U1', 2);
  });

  it('conta bloqueada → 401 genérico, sem verificar OTP', async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: 'U2', status: 'blocked', deletedAt: null });
    const res = await call({ email: 'block@ex.com', code: '123456' });
    expect(res.status).toBe(401);
    expect(mockVerifyOtp).not.toHaveBeenCalled();
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('código errado → 401', async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    mockVerifyOtp.mockResolvedValue(false);
    const res = await call({ email: 'x@ex.com', code: '000000', name: 'Ana', avatarUrl: 'https://img/a.jpg' });
    expect(res.status).toBe(401);
    expect(mockDb.user.create).not.toHaveBeenCalled();
  });

  it('corrida de cadastro duplicado (P2002) → 409', async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    mockVerifyOtp.mockResolvedValue(true);
    mockDb.user.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    const res = await call({ email: 'dup@ex.com', code: '123456', name: 'Ana', avatarUrl: 'https://img/a.jpg' });
    expect(res.status).toBe(409);
  });
});
