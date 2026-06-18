import 'server-only';
import { db } from './db';

// Rate limit de janela fixa via banco (sem infra extra). Para a escala de 1 hub.
// Retorna true se PERMITIDO; false se estourou o limite.
export async function rateLimit(key: string, max: number, windowSec: number): Promise<boolean> {
  const since = new Date(Date.now() - windowSec * 1000);
  try {
    const count = await db.rateHit.count({ where: { key, createdAt: { gt: since } } });
    if (count >= max) return false;
    await db.rateHit.create({ data: { key } });
    return true;
  } catch {
    // se o banco falhar, não bloqueia o usuário legítimo (fail-open)
    return true;
  }
}

// IP do cliente atrás do proxy da Vercel.
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  return (xff?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown').trim();
}

export const tooMany = () =>
  new Response(JSON.stringify({ message: 'Muitas tentativas. Tente de novo daqui a pouco.' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json' },
  });
