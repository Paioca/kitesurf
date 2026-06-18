import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// TEMPORÁRIO: diagnostica o storage. Mostra o valor do SUPABASE_URL (semi-público),
// se o service role key tem tamanho plausível, lista buckets e tenta um upload de teste.
export async function GET() {
  const url = process.env.SUPABASE_URL ?? null;
  const keyLen = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').length;
  const bucket = process.env.SUPABASE_BUCKET ?? null;

  const out: any = { url, keyLen, bucket };

  try {
    const sb = createClient(url!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const list = await sb.storage.listBuckets();
    out.buckets = list.data?.map((b) => b.name) ?? null;
    out.listError = list.error?.message ?? null;

    const testBuf = Buffer.from('teste');
    const up = await sb.storage.from(bucket!).upload(`debug/${Date.now()}.txt`, testBuf, { contentType: 'text/plain', upsert: true });
    out.uploadError = up.error?.message ?? null;
    out.uploadOk = !up.error;
  } catch (e) {
    out.threw = (e as Error).message ?? String(e);
  }

  return NextResponse.json(out);
}
