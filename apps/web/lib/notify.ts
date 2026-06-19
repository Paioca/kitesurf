import 'server-only';

// Notificação de pedido novo pro vendedor via SMS (Twilio). Gateado por env:
// sem credenciais → no-op (não quebra o fluxo de pedido). Plugar em prod:
//   TWILIO_ACCOUNT_SID · TWILIO_AUTH_TOKEN · TWILIO_SMS_FROM (ex: +18456904009)
//   APP_URL (default: prod)
// Nota: canal SMS provisório. Quando houver sender de WhatsApp aprovado, trocar
// o From por `whatsapp:+...` e (fora da janela de 24h) usar ContentSid de template.
export async function notifyNewRequest(opts: { sellerPhone: string; type: 'offer' | 'visit'; listingTitle: string }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_FROM;
  if (!sid || !token || !from || !opts.sellerPhone) return; // não configurado → silencioso

  const what = opts.type === 'offer' ? 'uma oferta' : 'um pedido de visita';
  const url = `${process.env.APP_URL ?? 'https://kitesurf-web.vercel.app'}/pedidos`;
  const to = opts.sellerPhone.replace(/[^\d+]/g, '');

  const body = new URLSearchParams({
    From: from,
    To: to,
    Body: `Vaya: você recebeu ${what} no anúncio "${opts.listingTitle}". Veja em ${url}`,
  });

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) console.error('[notify] sms falhou', res.status, await res.text().catch(() => ''));
  } catch (e) {
    console.error('[notify] sms erro', e);
  }
}
