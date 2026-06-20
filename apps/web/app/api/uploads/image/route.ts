import { NextResponse } from 'next/server';
import { errorResponse } from '../../../../lib/http';
import { processImage } from '../../../../lib/storage';
import { requireUser, UnauthorizedError } from '../../../../lib/session';
import { rateLimit, tooMany } from '../../../../lib/ratelimit';

export const runtime = 'nodejs';

// POST /api/uploads/image — multipart, exige login. Retorna { url, thumbUrl }.
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    // anti-abuso de storage: por usuário (anúncio aceita até 40 fotos × 2 = main+thumb)
    if (!(await rateLimit(`upload:${user.id}`, 120, 3600))) return tooMany();
    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) return NextResponse.json({ message: 'Arquivo ausente.' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const out = await processImage(buffer, file.type, file.size);
    return NextResponse.json(out);
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    return errorResponse(e);
  }
}
