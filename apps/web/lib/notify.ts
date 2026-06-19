import 'server-only';

// Notificação de pedido novo pro vendedor via WhatsApp (Twilio). Gateado por env:
// sem credenciais → no-op (não quebra o fluxo de pedido). Plugar em prod:
//   TWILIO_ACCOUNT_SID · TWILIO_AUTH_TOKEN · TWILIO_WHATSAPP_FROM (ex: whatsapp:+14155238886)
//   TWILIO_CONTENT_SID (template utility aprovado — obrigatório fora da janela de 24h)
//   APP_URL (default: prod)
export async function notifyNewRequest(opts: { sellerPhone: string; type: 'offer' | 'visit'; listingTitle: string }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from || !opts.sellerPhone) return; // não configurado → silencioso

  const what = opts.type === 'offer' ? 'uma oferta' : 'um pedido de visita';
  const url = `${process.env.APP_URL ?? 'https://kitesurf-web.vercel.app'}/pedidos`;
  const to = `whatsapp:${opts.sellerPhone.replace(/[^\d+]/g, '')}`;

  const body = new URLSearchParams({ From: from, To: to });
  const contentSid = process.env.TWILIO_CONTENT_SID;
  if (contentSid) {
    // template aprovado: {{1}}=tipo, {{2}}=anúncio, {{3}}=link
    body.set('ContentSid', contentSid);
    body.set('ContentVariables', JSON.stringify({ '1': what, '2': opts.listingTitle, '3': url }));
  } else {
    // fallback (só funciona no sandbox / janela de 24h) — útil pra testar antes do template
    body.set('Body', `Vaya: você recebeu ${what} no anúncio "${opts.listingTitle}". Veja em ${url}`);
  }

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) console.error('[notify] whatsapp falhou', res.status, await res.text().catch(() => ''));
  } catch (e) {
    console.error('[notify] whatsapp erro', e);
  }
}
