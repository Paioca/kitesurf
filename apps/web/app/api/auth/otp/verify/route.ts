import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '../../../../../lib/db';
import { verifyOtp } from '../../../../../lib/otp';
import { normalizeEmail } from '../../../../../lib/email-security';
import { normalizePhone } from '../../../../../lib/phone';
import { isOfficialImageUrl } from '../../../../../lib/storage';
import { setSession } from '../../../../../lib/session';
import { rateLimit, clientIp, tooMany } from '../../../../../lib/ratelimit';
import { SPOTS } from '../../../../../lib/filters';

export const runtime = 'nodejs';

// Aceita phone OU email — mesmo schema do request. Onboarding (cadastro novo) só
// funciona pelo canal SMS, porque conta nova exige telefone obrigatório no schema
// User; e-mail é canal de fallback pra usuário EXISTENTE com emailVerified.
const schema = z.object({
  phone: z.string().optional(),
  email: z.string().optional(),
  code: z.string().min(4).max(8),
  name: z.string().min(2).optional(),
  lastName: z.string().max(80).optional(),
  spot: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  avatarUrl: z.string().optional(),
  instagramHandle: z.string().optional(),
  locale: z.string().optional(),
}).refine((d) => Boolean(d.phone) !== Boolean(d.email), {
  message: 'Forneça telefone OU e-mail.',
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });
  const dto = parsed.data;

  // anti brute-force do código (além do limite de 5 tentativas por código).
  // fail-closed: durante incidente de DB, não relaxa proteção contra brute-force de OTP.
  if (!(await rateLimit(`otp:verify:${clientIp(req)}`, 20, 3600, { failClosed: true }))) return tooMany();

  // Avatar (quando enviado) só do nosso storage — não confiar na URL do cliente.
  if (dto.avatarUrl !== undefined && !isOfficialImageUrl(dto.avatarUrl)) {
    return NextResponse.json({ message: 'Foto de perfil inválida.' }, { status: 400 });
  }

  if (dto.email) {
    return verifyByEmail(dto);
  }
  return verifyByPhone(dto);
}

// Login por E-MAIL: só serve pra usuário EXISTENTE com emailVerified. Não cria
// conta nova por e-mail (sem telefone, schema não permite).
async function verifyByEmail(dto: z.infer<typeof schema>) {
  const email = normalizeEmail(dto.email!);
  if (!email) return NextResponse.json({ message: 'E-mail inválido.' }, { status: 400 });

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.emailVerified || user.deletedAt || user.status === 'blocked') {
    // Mesma resposta de código errado pra não vazar existência da conta.
    return NextResponse.json({ message: 'Código inválido ou expirado.' }, { status: 401 });
  }

  const ok = await verifyOtp({ email }, dto.code, true);
  if (!ok) return NextResponse.json({ message: 'Código inválido ou expirado.' }, { status: 401 });

  await setSession(user.id, user.sessionVersion);
  return NextResponse.json({
    ok: true,
    channel: 'email',
    user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
  });
}

// Login/cadastro por TELEFONE — mantém o fluxo legado de onboarding inline (nome
// + foto obrigatórios pra conta nova).
async function verifyByPhone(dto: z.infer<typeof schema>) {
  // Mesmo E.164 canônico do request — senão o verifyOtp procura por um telefone
  // diferente do que foi gravado e o código nunca casa.
  const phone = normalizePhone(dto.phone!);
  if (!phone) return NextResponse.json({ message: 'Telefone inválido.' }, { status: 400 });

  const existing = await db.user.findUnique({ where: { phone } });
  let user = existing;

  if (!existing) {
    // Conta nova sem onboarding completo: só "espia" o código (não queima),
    // pra ele continuar válido até a criação efetiva.
    // E-mail é opcional (pedido depois, dentro da plataforma). Obrigatórios: nome + foto.
    if (!dto.name || !dto.avatarUrl) {
      const ok = await verifyOtp({ phone }, dto.code, false);
      if (!ok) return NextResponse.json({ message: 'Código inválido ou expirado.' }, { status: 401 });
      return NextResponse.json(
        { needsOnboarding: true, message: 'Conta nova: nome e foto de perfil são obrigatórios.' },
        { status: 400 },
      );
    }
    const ok = await verifyOtp({ phone }, dto.code, true);
    if (!ok) return NextResponse.json({ message: 'Código inválido ou expirado.' }, { status: 401 });
    // E-mail opcional no onboarding — normaliza (lowercase/trim) antes de checar
    // conflito e gravar, pra bater com a unique constraint case-insensitive.
    const onboardEmail = dto.email ? normalizeEmail(dto.email) : null;
    if (dto.email && !onboardEmail) {
      return NextResponse.json({ message: 'E-mail inválido.' }, { status: 400 });
    }
    if (onboardEmail && (await db.user.findUnique({ where: { email: onboardEmail } }))) {
      return NextResponse.json({ message: 'Email já cadastrado.' }, { status: 409 });
    }
    user = await db.user.create({
      data: {
        phone,
        phoneCountry: phone.startsWith('+55') ? 'BR' : 'INT',
        phoneVerified: true,
        name: dto.name,
        lastName: dto.lastName?.trim() || null,
        spot: dto.spot && SPOTS.includes(dto.spot) ? dto.spot : null,
        country: dto.country?.trim() || null,
        email: onboardEmail,
        avatarUrl: dto.avatarUrl,
        instagramHandle: dto.instagramHandle ?? null,
        locale: dto.locale ?? 'pt',
      },
    });
  } else {
    // Login de conta existente: valida e queima o código.
    const ok = await verifyOtp({ phone }, dto.code, true);
    if (!ok) return NextResponse.json({ message: 'Código inválido ou expirado.' }, { status: 401 });
    if (!existing.phoneVerified) {
      user = await db.user.update({ where: { id: existing.id }, data: { phoneVerified: true } });
    }
  }

  if (!user) return NextResponse.json({ message: 'Erro.' }, { status: 500 });
  if (user.status === 'blocked') return NextResponse.json({ message: 'Conta bloqueada.' }, { status: 401 });

  await setSession(user.id, user.sessionVersion);
  return NextResponse.json({
    ok: true,
    channel: 'sms',
    user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
  });
}
