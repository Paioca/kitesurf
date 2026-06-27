import 'server-only';
import crypto from 'crypto';
import { EmailTokenPurpose } from '@prisma/client';
import { db } from './db';
import { childLogger } from './logger';
import { appUrl } from './app-url';

const log = childLogger('email-security');

const TOKEN_TTL_MIN = Number(process.env.EMAIL_TOKEN_TTL_MINUTES ?? 30);

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (!email || email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function hashEmailToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function issueEmailToken(userId: string, email: string, purpose: EmailTokenPurpose) {
  const now = new Date();
  await db.emailToken.updateMany({
    where: { userId, purpose, consumedAt: null },
    data: { consumedAt: now },
  });
  const raw = crypto.randomBytes(32).toString('base64url');
  const token = await db.emailToken.create({
    data: {
      userId,
      email,
      purpose,
      tokenHash: hashEmailToken(raw),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MIN * 60_000),
    },
  });
  return { raw, token };
}

export async function findValidEmailToken(raw: string, purpose: EmailTokenPurpose) {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(raw)) return null;
  const token = await db.emailToken.findUnique({ where: { tokenHash: hashEmailToken(raw) } });
  if (!token || token.purpose !== purpose || token.consumedAt || token.expiresAt <= new Date()) return null;
  return token;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]!));
}

export async function sendSecurityEmail(opts: { to: string; name: string; purpose: EmailTokenPurpose; rawToken: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error('Resend não configurado');

  const verify = opts.purpose === EmailTokenPurpose.verify;
  const path = verify ? '/verificar-email' : '/recuperar';
  const link = appUrl(`${path}?token=${encodeURIComponent(opts.rawToken)}`);
  const subject = verify ? 'Confirme seu e-mail na Kitetropos' : 'Recupere sua conta Kitetropos';
  const heading = verify ? 'Confirme seu e-mail' : 'Recupere sua conta';
  const explanation = verify
    ? 'Use o botão abaixo para confirmar este e-mail como canal de segurança da sua conta.'
    : 'Recebemos um pedido para trocar o telefone de acesso da sua conta. Continue somente se foi você.';
  const action = verify ? 'Confirmar e-mail' : 'Continuar recuperação';
  const safeName = escapeHtml(opts.name || 'Olá');
  const safeLink = escapeHtml(link);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Kitetropos/1.0',
      'Idempotency-Key': `${opts.purpose}-${hashEmailToken(opts.rawToken).slice(0, 32)}`,
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject,
      text: `${opts.name || 'Olá'},\n\n${explanation}\n\n${link}\n\nO link expira em ${TOKEN_TTL_MIN} minutos. Se você não pediu isso, ignore este e-mail.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#23332e"><p>${safeName},</p><h1 style="font-size:26px">${heading}</h1><p style="line-height:1.6">${explanation}</p><p style="margin:28px 0"><a href="${safeLink}" style="background:#1f6b5c;color:#fff;padding:13px 20px;border-radius:10px;text-decoration:none;font-weight:700">${action}</a></p><p style="font-size:13px;color:#6b7a73">O link expira em ${TOKEN_TTL_MIN} minutos. Se você não pediu isso, ignore este e-mail.</p></div>`,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    // Não logar res.text(): erros de validação do Resend ecoam o e-mail destinatário.
    // Só status + ids — payload completo fica no Sentry breadcrumb.
    log.error({ event: 'send_failed', purpose: opts.purpose, status: res.status, providerRequestId: res.headers.get('x-resend-request-id') ?? null }, 'resend recusou envio');
    throw new Error(`Resend recusou o envio (${res.status})`);
  }
}
