import { NextResponse } from 'next/server';
import { getBrands } from '../../../../lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getBrands());
}
