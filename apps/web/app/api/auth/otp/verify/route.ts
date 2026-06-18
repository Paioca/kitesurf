import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '../../../../../lib/db';
import { verifyOtp } from '../../../../../lib/otp';
import { setSession } from '../../../../../lib/session';
import { rateLimit, clientIp, tooMany } from '../../../../../lib/ratelimit';

export const runtime = 'nodejs';

const schema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/),
  code: z.string().min(4).max(8),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().optional(),
  instagramHandle: z.string().optional(),
  locale: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });
  const dto = parsed.data;

  // anti brute-force do código (além do limite de 5 tentativas por código)
  if (!(await rateLimit(`otp:verify:${clientIp(req)}`, 20, 3600))) return tooMany();

  const existing = await db.user.findUnique({ where: { phone: dto.phone } });
  let user = existing;

  if (!existing) {
    // Conta nova sem onboarding completo: só "espia" o código (não queima),
    // pra ele continuar válido até a criação efetiva.
    if (!dto.name || !dto.email || !dto.avatarUrl) {
      const ok = await verifyOtp(dto.phone, dto.code, false);
      if (!ok) return NextResponse.json({ message: 'Código inválido ou expirado.' }, { status: 401 });
      return NextResponse.json(
        { needsOnboarding: true, message: 'Conta nova: nome, email e foto de perfil são obrigatórios.' },
        { status: 400 },
      );
    }
    const ok = await verifyOtp(dto.phone, dto.code, true);
    if (!ok) return NextResponse.json({ message: 'Código inválido ou expirado.' }, { status: 401 });
    if (await db.user.findUnique({ where: { email: dto.email } })) {
      return NextResponse.json({ message: 'Email já cadastrado.' }, { status: 409 });
    }
    user = await db.user.create({
      data: {
        phone: dto.phone,
        phoneCountry: dto.phone.startsWith('+55') ? 'BR' : 'INT',
        phoneVerified: true,
        name: dto.name,
        email: dto.email,
        avatarUrl: dto.avatarUrl,
        instagramHandle: dto.instagramHandle ?? null,
        locale: dto.locale ?? 'pt',
      },
    });
  } else {
    // Login de conta existente: valida e queima o código.
    const ok = await verifyOtp(dto.phone, dto.code, true);
    if (!ok) return NextResponse.json({ message: 'Código inválido ou expirado.' }, { status: 401 });
    if (!existing.phoneVerified) {
      user = await db.user.update({ where: { id: existing.id }, data: { phoneVerified: true } });
    }
  }

  if (!user) return NextResponse.json({ message: 'Erro.' }, { status: 500 });
  if (user.status === 'blocked') return NextResponse.json({ message: 'Conta bloqueada.' }, { status: 401 });

  setSession(user.id);
  return NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
  });
}
