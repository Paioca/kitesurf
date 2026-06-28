import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
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
    } catch (e) {
      // Ainda apagamos o cookie abaixo (UX de "Sair" não pode travar), mas NÃO silenciamos:
      // revoke falho deixa o JWT válido por até 30d — buraco de segurança que precisa de alerta.
      Sentry.captureException(e, { tags: { component: 'logout', event: 'revoke_all_failed' } });
    }
  }
  await clearSession();
  return NextResponse.json({ ok: true });
}
