import { NextResponse } from 'next/server';
import { getCategories } from '../../../../lib/queries';

export const runtime = 'nodejs';
// Categorias são tabela de REFERÊNCIA (muda raramente). Mantido force-dynamic (NÃO
// pré-renderiza no build — o build do CI roda sem banco), mas com Cache-Control: o edge
// da Vercel cacheia a resposta do fetch do cliente (/anunciar) por 1h. Antes era
// force-dynamic SEM header → batia o banco a cada GET.
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getCategories(), {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
