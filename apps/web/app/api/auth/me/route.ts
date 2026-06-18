import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/session';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(null, { status: 200 });
  return NextResponse.json({
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    instagramHandle: user.instagramHandle,
    phoneVerified: user.phoneVerified,
    locale: user.locale,
    role: user.role,
  });
}
