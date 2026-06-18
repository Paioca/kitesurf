import { NextResponse } from 'next/server';
import { getListing } from '../../../../lib/queries';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const listing = await getListing(params.id);
  if (!listing) return NextResponse.json({ message: 'Anúncio não encontrado.' }, { status: 404 });
  return NextResponse.json(listing);
}
