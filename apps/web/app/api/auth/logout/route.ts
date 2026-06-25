import { NextResponse } from 'next/server';
import { clearSession, getUserId, revokeAllSessions } from '../../../../lib/session';

export const runtime = 'nodejs';

export async function POST() {
  // Apagar o cookie sozinho é cosmético: o JWT continua válido por até 30d se já
  // vazou. Incrementar sessionVersion mata o token no servidor (getCurrentUser passa
  // a rejeitá-lo). Desloga de todos os dispositivos — comportamento esperado num
  // "Sair" de marketplace com dinheiro envolvido.
  const userId = await getUserId();
  if (userId) {
    try {
      await revokeAllSessions(userId);
    } catch {
      // Mesmo se a revogação falhar (DB indisponível), ainda apagamos o cookie abaixo.
    }
  }
  await clearSession();
  return NextResponse.json({ ok: true });
}
