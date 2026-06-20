import 'server-only';

// Notificação de pedido novo pro vendedor (oferta/visita) com o contato do comprador.
// Dois canais, escolhidos por env — nenhum configurado → no-op (não quebra o pedido):
//
//   WhatsApp (preferido). Mensagem iniciada pela empresa fora da janela de 24h EXIGE
//   template aprovado pela Meta. Configure:
//     TWILIO_ACCOUNT_SID · TWILIO_AUTH_TOKEN
//     TWILIO_WHATSAPP_FROM = whatsapp:+55...   (sender WhatsApp Business aprovado)
//     TWILIO_CONTENT_SID   = HX...             (template UTILITY aprovado, 5 variáveis)
//   Template sugerido (cadastrar no Twilio Content Builder, categoria UTILITY):
//     "Olá! {{1}} fez {{2}} no seu anúncio \"{{3}}\" na Vaya. Fale com o comprador no
//      WhatsApp: {{4}} — ou gerencie em {{5}}. Bons ventos!"
//
//   SMS (fallback). Usado quando o WhatsApp não está configurado:
//     TWILIO_SMS_FROM = +1...
//
//   APP_URL (default: prod).
export async function notifyNewRequest(opts: { sellerPhone: string; type: 'offer' | 'visit'; listingTitle: string; buyerName?: string; buyerPhone?: string }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !opts.sellerPhone) return; // não configurado → silencioso

  const waFrom = process.env.TWILIO_WHATSAPP_FROM; // ex: whatsapp:+5585...
  const contentSid = process.env.TWILIO_CONTENT_SID; // template aprovado (HX...)
  const smsFrom = process.env.TWILIO_SMS_FROM;

  const what = opts.type === 'offer' ? 'uma oferta' : 'um pedido de visita';
  const who = opts.buyerName ? `${opts.buyerName} fez` : 'Você recebeu';
  const waLink = opts.buyerPhone ? `https://wa.me/${opts.buyerPhone.replace(/\D/g, '')}` : '';
  const url = `${process.env.APP_URL ?? 'https://kitesurf-web.vercel.app'}/pedidos`;
  const to = opts.sellerPhone.replace(/[^\d+]/g, '');

  let body: URLSearchParams;
  if (waFrom && contentSid) {
    // WhatsApp via template aprovado (business-initiated fora da janela de 24h).
    body = new URLSearchParams({
      From: waFrom,
      To: `whatsapp:${to}`,
      ContentSid: contentSid,
      ContentVariables: JSON.stringify({
        '1': opts.buyerName ?? 'Alguém',
        '2': what,
        '3': opts.listingTitle,
        '4': waLink || 'veja no app',
        '5': url,
      }),
    });
  } else if (smsFrom) {
    const contato = waLink ? ` Fale com o comprador: ${waLink}.` : '';
    body = new URLSearchParams({
      From: smsFrom,
      To: to,
      Body: `Vaya: ${who} ${what} no anúncio "${opts.listingTitle}".${contato} Veja em ${url}`,
    });
  } else {
    return; // nenhum canal configurado
  }

  const channel = waFrom && contentSid ? 'whatsapp' : 'sms';
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) console.error(`[notify] ${channel} falhou`, res.status, await res.text().catch(() => ''));
  } catch (e) {
    console.error(`[notify] ${channel} erro`, e);
  }
}
