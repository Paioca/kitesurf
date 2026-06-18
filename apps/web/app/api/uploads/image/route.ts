import { NextResponse } from 'next/server';
import { processImage } from '../../../../lib/storage';
import { requireUser, UnauthorizedError } from '../../../../lib/session';

export const runtime = 'nodejs';

// POST /api/uploads/image — multipart, exige login. Retorna { url, thumbUrl }.
export async function POST(req: Request) {
  try {
    await requireUser();
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ message: 'Arquivo ausente.' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const out = await processImage(buffer, file.type, file.size);
    return NextResponse.json(out);
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    return NextResponse.json({ message: (e as Error).message ?? 'Erro no upload.' }, { status: 400 });
  }
}
