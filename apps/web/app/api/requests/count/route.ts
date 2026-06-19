import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { getCurrentUser } from '../../../../lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Contagem de pedidos recebidos pendentes (pro badge da aba Pedidos).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ pending: 0 });
  const pending = await db.request.count({ where: { sellerId: user.id, status: 'pending' } });
  return NextResponse.json({ pending });
}
