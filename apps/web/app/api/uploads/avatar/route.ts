import { NextResponse } from 'next/server';
import { processImage } from '../../../../lib/storage';

export const runtime = 'nodejs';

// Upload de foto de perfil — PÚBLICO, porque acontece no onboarding (antes da conta existir).
// Rate limiting entra no P2. Retorna { url }.
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ message: 'Arquivo ausente.' }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const out = await processImage(buffer, file.type, file.size);
    return NextResponse.json({ url: out.url });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message ?? 'Erro no upload.' }, { status: 400 });
  }
}
