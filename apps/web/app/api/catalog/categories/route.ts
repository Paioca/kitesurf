import { NextResponse } from 'next/server';
import { getCategories } from '../../../../lib/queries';

export const runtime = 'nodejs';
// Categorias são tabela de REFERÊNCIA (muda raramente). Antes era force-dynamic → batia
// o banco a cada GET. Agora revalida a cada 1h; consumido só client-side em /anunciar
// (fetch), então o edge da Vercel cacheia a resposta pra todos.
export const revalidate = 3600;

export async function GET() {
  return NextResponse.json(await getCategories(), {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
