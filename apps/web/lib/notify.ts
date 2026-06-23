import 'server-only';
import { childLogger } from './logger';

const log = childLogger('notify');

// Notificação de pedido novo pro vendedor (oferta/visita) com o contato do comprador.
// Dois canais, escolhidos por env — nenhum configurado → no-op (não quebra o pedido):
//
//   WhatsApp (preferido). Mensagem iniciada pela empresa fora da janela de 24h EXIGE
//   template aprovado pela Meta. Configure:
//     TWILIO_ACCOUNT_SID · TWILIO_AUTH_TOKEN
//     TWILIO_WHATSAPP_FROM = whatsapp:+55...   (sender WhatsApp Business aprovado)
//     TWILIO_CONTENT_SID   = HX...             (template UTILITY aprovado, 5 variáveis)
//   Template sugerido (cadastrar no Twilio Content Builder, categoria UTILITY):
//     "Olá! {{1}} fez {{2}} no seu anúncio \"{{3}}\" na Kitetropos. Fale com o comprador no
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
      Body: `Kitetropos: ${who} ${what} no anúncio "${opts.listingTitle}".${contato} Veja em ${url}`,
    });
  } else {
    return; // nenhum canal configurado
  }

  const channel = waFrom && contentSid ? 'whatsapp' : 'sms';
  try {
    // timeout: Twilio lenta/fora não pode travar o pedido (esta chamada é awaited).
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(4000),
    });
    // Não logar res.text(): a Twilio costuma ecoar o telefone destinatário em erros de
    // validação (e.g. 21211 'is not a valid phone number'), o que vazaria PII pros logs.
    // Status + twilio-request-id bastam pra triagem; payload fica no Sentry breadcrumb.
    if (!res.ok) log.error({ event: 'send_failed', kind: 'new_request', channel, status: res.status, providerRequestId: res.headers.get('twilio-request-id') ?? null }, 'twilio send failed');
  } catch (e) {
    log.error({ event: 'send_error', kind: 'new_request', channel, err: e }, 'twilio send error');
  }
}

// Notifica o COMPRADOR quando o vendedor aceita ("demonstra interesse") e libera o
// WhatsApp. Por ora SMS (WhatsApp exigiria um 2º template Meta buyer-centric via
// TWILIO_CONTENT_SID_ACCEPT). Fail-open e fora de transação: NUNCA derruba o aceite.
export async function notifyRequestAccepted(opts: { buyerPhone: string; sellerPhone: string; listingTitle: string }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !opts.buyerPhone) return; // não configurado → silencioso

  const waFrom = process.env.TWILIO_WHATSAPP_FROM;
  const acceptContentSid = process.env.TWILIO_CONTENT_SID_ACCEPT; // template buyer-centric (opcional)
  const smsFrom = process.env.TWILIO_SMS_FROM;

  const sellerWa = opts.sellerPhone ? `https://wa.me/${opts.sellerPhone.replace(/\D/g, '')}` : '';
  const url = `${process.env.APP_URL ?? 'https://kitesurf-web.vercel.app'}/pedidos`;
  const to = opts.buyerPhone.replace(/[^\d+]/g, '');

  let body: URLSearchParams;
  if (waFrom && acceptContentSid) {
    body = new URLSearchParams({
      From: waFrom,
      To: `whatsapp:${to}`,
      ContentSid: acceptContentSid,
      ContentVariables: JSON.stringify({ '1': opts.listingTitle, '2': sellerWa || url, '3': url }),
    });
  } else if (smsFrom) {
    const contato = sellerWa ? ` Fale no WhatsApp: ${sellerWa}.` : ` Veja em ${url}.`;
    body = new URLSearchParams({
      From: smsFrom,
      To: to,
      Body: `Kitetropos: o vendedor liberou o contato no anúncio "${opts.listingTitle}".${contato} Bons ventos!`,
    });
  } else {
    return; // nenhum canal configurado
  }

  const channel = waFrom && acceptContentSid ? 'whatsapp' : 'sms';
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) log.error({ event: 'send_failed', kind: 'accept', channel, status: res.status, providerRequestId: res.headers.get('twilio-request-id') ?? null }, 'twilio send failed');
  } catch (e) {
    log.error({ event: 'send_error', kind: 'accept', channel, err: e }, 'twilio send error');
  }
}
