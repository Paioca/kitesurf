import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Rota TEMPORÁRIA de diagnóstico. Mostra quais env vars chegaram (sem revelar valores)
// e o erro real ao conectar no banco. Remover depois de diagnosticar.
export async function GET() {
  const env = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    DIRECT_URL: !!process.env.DIRECT_URL,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_BUCKET: process.env.SUPABASE_BUCKET ?? null,
    JWT_SECRET: !!process.env.JWT_SECRET,
    OTP_MOCK: process.env.OTP_MOCK ?? null,
  };

  let dbStatus = 'ok';
  let dbError: string | null = null;
  try {
    const { db } = await import('../../../lib/db');
    await db.$queryRaw`SELECT 1`;
  } catch (e) {
    dbStatus = 'fail';
    dbError = ((e as Error).message ?? String(e)).slice(0, 600);
  }

  return NextResponse.json({ env, dbStatus, dbError });
}
