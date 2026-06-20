import { NextResponse } from 'next/server';
import { errorResponse } from '../../../../lib/http';
import { processImage } from '../../../../lib/storage';
import { rateLimit, clientIp, tooMany } from '../../../../lib/ratelimit';

export const runtime = 'nodejs';

// Upload de foto de perfil — PÚBLICO (onboarding, antes da conta existir).
// Rate-limited por IP pra evitar abuso de storage.
export async function POST(req: Request) {
  try {
    if (!(await rateLimit(`avatar:${clientIp(req)}`, 15, 3600))) return tooMany();
    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) return NextResponse.json({ message: 'Arquivo ausente.' }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const out = await processImage(buffer, file.type, file.size);
    return NextResponse.json({ url: out.url });
  } catch (e) {
    return errorResponse(e);
  }
}
