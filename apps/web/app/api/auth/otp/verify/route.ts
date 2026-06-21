import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '../../../../../lib/db';
import { verifyOtp } from '../../../../../lib/otp';
import { normalizePhone } from '../../../../../lib/phone';
import { isOfficialImageUrl } from '../../../../../lib/storage';
import { setSession } from '../../../../../lib/session';
import { rateLimit, clientIp, tooMany } from '../../../../../lib/ratelimit';
import { SPOTS } from '../../../../../lib/filters';

export const runtime = 'nodejs';

const schema = z.object({
  phone: z.string(),
  code: z.string().min(4).max(8),
  name: z.string().min(2).optional(),
  lastName: z.string().max(80).optional(),
  spot: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
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
  // Mesmo E.164 canônico do request — senão o verifyOtp procura por um telefone
  // diferente do que foi gravado e o código nunca casa.
  const phone = normalizePhone(dto.phone);
  if (!phone) return NextResponse.json({ message: 'Telefone inválido.' }, { status: 400 });

  // Avatar (quando enviado) só do nosso storage — não confiar na URL do cliente.
  if (dto.avatarUrl !== undefined && !isOfficialImageUrl(dto.avatarUrl)) {
    return NextResponse.json({ message: 'Foto de perfil inválida.' }, { status: 400 });
  }

  // anti brute-force do código (além do limite de 5 tentativas por código)
  if (!(await rateLimit(`otp:verify:${clientIp(req)}`, 20, 3600))) return tooMany();

  const existing = await db.user.findUnique({ where: { phone } });
  let user = existing;

  if (!existing) {
    // Conta nova sem onboarding completo: só "espia" o código (não queima),
    // pra ele continuar válido até a criação efetiva.
    // E-mail é opcional (pedido depois, dentro da plataforma). Obrigatórios: nome + foto.
    if (!dto.name || !dto.avatarUrl) {
      const ok = await verifyOtp(phone, dto.code, false);
      if (!ok) return NextResponse.json({ message: 'Código inválido ou expirado.' }, { status: 401 });
      return NextResponse.json(
        { needsOnboarding: true, message: 'Conta nova: nome e foto de perfil são obrigatórios.' },
        { status: 400 },
      );
    }
    const ok = await verifyOtp(phone, dto.code, true);
    if (!ok) return NextResponse.json({ message: 'Código inválido ou expirado.' }, { status: 401 });
    if (dto.email && (await db.user.findUnique({ where: { email: dto.email } }))) {
      return NextResponse.json({ message: 'Email já cadastrado.' }, { status: 409 });
    }
    user = await db.user.create({
      data: {
        phone,
        phoneCountry: phone.startsWith('+55') ? 'BR' : 'INT',
        phoneVerified: true,
        name: dto.name,
        lastName: dto.lastName?.trim() || null,
        spot: dto.spot && SPOTS.includes(dto.spot) ? dto.spot : null, // só spot da lista controlada
        country: dto.country?.trim() || null,
        email: dto.email ?? null,
        avatarUrl: dto.avatarUrl,
        instagramHandle: dto.instagramHandle ?? null,
        locale: dto.locale ?? 'pt',
      },
    });
  } else {
    // Login de conta existente: valida e queima o código.
    const ok = await verifyOtp(phone, dto.code, true);
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
