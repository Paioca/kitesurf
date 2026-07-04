import 'server-only';
import { childLogger } from './logger';
import { db } from './db';
import { appUrl } from './app-url';

const log = childLogger('notify');

const twilioUrl = (sid: string) => `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
const twilioHeaders = (sid: string, token: string) => ({
  Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
  'Content-Type': 'application/x-www-form-urlencoded',
});

// Grava a entrega no OUTBOX pra reenvio (cron drain-notifications). Só chamado em falha
// transitória. A própria gravação é fail-safe: se o banco cair, loga e segue (não joga
// erro de volta no request — notificação nunca derruba o fluxo).
async function enqueue(channel: 'sms' | 'whatsapp', kind: string, body: URLSearchParams, reason: string) {
  try {
    await db.notificationDelivery.create({
      data: { channel, kind, body: Object.fromEntries(body), status: 'pending', lastError: reason },
    });
  } catch (e) {
    log.error({ event: 'enqueue_failed', kind, channel, err: e }, 'falha ao gravar outbox — notificação perdida');
  }
}

// Envia INLINE; em falha TRANSITÓRIA (5xx/timeout/rede) enfileira pra retry. Falha
// PERMANENTE (4xx, ex.: 21211 número inválido) só loga — retentar não muda nada.
// Não loga res.text(): a Twilio ecoa o telefone destinatário em erros de validação (PII).
async function sendOrEnqueue(channel: 'sms' | 'whatsapp', kind: string, sid: string, token: string, body: URLSearchParams) {
  try {
    // timeout: Twilio lenta/fora não pode travar o request (esta chamada é awaited).
    const res = await fetch(twilioUrl(sid), { method: 'POST', headers: twilioHeaders(sid, token), body, signal: AbortSignal.timeout(4000) });
    if (res.ok) return;
    const providerRequestId = res.headers.get('twilio-request-id') ?? null;
    log.error({ event: 'send_failed', kind, channel, status: res.status, providerRequestId }, 'twilio send failed');
    if (res.status >= 500) await enqueue(channel, kind, body, `http_${res.status}`); // 5xx = transitório → retry
    // 4xx = permanente: não enfileira (retry repetiria a mesma rejeição).
  } catch (e) {
    // rede/timeout: ambíguo (Twilio pode ter aceitado) — enfileira pra não perder; o
    // risco é um SMS duplicado raro, preferível à perda silenciosa.
    log.error({ event: 'send_error', kind, channel, err: e }, 'twilio send error — enfileirando pra retry');
    await enqueue(channel, kind, body, 'network_or_timeout');
  }
}

// Notificação de pedido novo pro vendedor (oferta/visita). NÃO carrega o contato do
// comprador: o telefone/WhatsApp só é liberado quando o vendedor ACEITA o pedido
// (solicita → aceita → libera WhatsApp). Aqui só avisamos que há um pedido a responder.
// Dois canais, escolhidos por env — nenhum configurado → no-op (não quebra o pedido):
//
//   WhatsApp (preferido). Mensagem iniciada pela empresa fora da janela de 24h EXIGE
//   template aprovado pela Meta. Configure:
//     TWILIO_ACCOUNT_SID · TWILIO_AUTH_TOKEN
//     TWILIO_WHATSAPP_FROM = whatsapp:+55...   (sender WhatsApp Business aprovado)
//     TWILIO_CONTENT_SID   = HX...             (template UTILITY aprovado, 4 variáveis)
//   Template sugerido (cadastrar no Twilio Content Builder, categoria UTILITY):
//     "Olá! {{1}} fez {{2}} no seu anúncio \"{{3}}\" na Kitetropos. Aceite em {{4}} para
//      liberar o contato do comprador. Bons ventos!"
//
//   SMS (fallback). Usado quando o WhatsApp não está configurado:
//     TWILIO_SMS_FROM = +1...
//
//   APP_URL (default: prod).
export async function notifyNewRequest(opts: { sellerPhone: string; type: 'offer' | 'visit'; listingTitle: string; buyerName?: string }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !opts.sellerPhone) {
    // Antes era no-op 100% silencioso: em prod mal-configurado o vendedor nunca era
    // avisado e ninguém percebia. Agora deixa rastro (sem PII — não loga o telefone).
    log.warn({ event: 'notify_skipped', kind: 'new_request', reason: !sid || !token ? 'twilio_unconfigured' : 'missing_seller_phone' }, 'aviso de pedido novo não enviado');
    return;
  }

  const waFrom = process.env.TWILIO_WHATSAPP_FROM; // ex: whatsapp:+5585...
  const contentSid = process.env.TWILIO_CONTENT_SID; // template aprovado (HX...)
  const smsFrom = process.env.TWILIO_SMS_FROM;

  const what = opts.type === 'offer' ? 'uma oferta' : 'um pedido de visita';
  const who = opts.buyerName ? `${opts.buyerName} fez` : 'Você recebeu';
  const url = appUrl('/pedidos');
  const to = opts.sellerPhone.replace(/[^\d+]/g, '');

  let body: URLSearchParams;
  if (waFrom && contentSid) {
    // WhatsApp via template aprovado (business-initiated fora da janela de 24h).
    // Sem contato do comprador: o vendedor aceita em {{4}} pra liberar o WhatsApp.
    body = new URLSearchParams({
      From: waFrom,
      To: `whatsapp:${to}`,
      ContentSid: contentSid,
      ContentVariables: JSON.stringify({
        '1': opts.buyerName ?? 'Alguém',
        '2': what,
        '3': opts.listingTitle,
        '4': url,
      }),
    });
  } else if (smsFrom) {
    body = new URLSearchParams({
      From: smsFrom,
      To: to,
      Body: `Kitetropos: ${who} ${what} no anúncio "${opts.listingTitle}". Aceite em ${url} para liberar o contato.`,
    });
  } else {
    log.warn({ event: 'notify_skipped', kind: 'new_request', reason: 'no_channel' }, 'Twilio sem canal (WhatsApp/SMS) configurado — aviso de pedido novo não enviado');
    return;
  }

  await sendOrEnqueue(waFrom && contentSid ? 'whatsapp' : 'sms', 'new_request', sid, token, body);
}

// Notifica o COMPRADOR quando o vendedor aceita ("demonstra interesse") e libera o
// WhatsApp. Por ora SMS (WhatsApp exigiria um 2º template Meta buyer-centric via
// TWILIO_CONTENT_SID_ACCEPT). Fail-open e fora de transação: NUNCA derruba o aceite.
export async function notifyRequestAccepted(opts: { buyerPhone: string; sellerPhone: string; listingTitle: string }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !opts.buyerPhone) {
    log.warn({ event: 'notify_skipped', kind: 'accept', reason: !sid || !token ? 'twilio_unconfigured' : 'missing_buyer_phone' }, 'aviso de aceite não enviado');
    return;
  }

  const waFrom = process.env.TWILIO_WHATSAPP_FROM;
  const acceptContentSid = process.env.TWILIO_CONTENT_SID_ACCEPT; // template buyer-centric (opcional)
  const smsFrom = process.env.TWILIO_SMS_FROM;

  const sellerWa = opts.sellerPhone ? `https://wa.me/${opts.sellerPhone.replace(/\D/g, '')}` : '';
  const url = appUrl('/pedidos');
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
    log.warn({ event: 'notify_skipped', kind: 'accept', reason: 'no_channel' }, 'Twilio sem canal configurado — aviso de aceite não enviado');
    return;
  }

  await sendOrEnqueue(waFrom && acceptContentSid ? 'whatsapp' : 'sms', 'accept', sid, token, body);
}

// Lembrete ao VENDEDOR de que ainda há um pedido pendente (cron expire-requests). No
// máximo 1 por pedido — a dedup é do chamador via Request.reminderSentAt. Mesma estrutura
// do notifyNewRequest; WhatsApp exigiria um template Meta próprio, então por ora só SMS —
// sem canal configurado é no-op (não derruba o cron). NÃO carrega o contato do comprador.
export async function notifyRequestReminder(opts: { sellerPhone: string; type: 'offer' | 'visit'; listingTitle: string }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !opts.sellerPhone) {
    log.warn({ event: 'notify_skipped', kind: 'request_reminder', reason: !sid || !token ? 'twilio_unconfigured' : 'missing_seller_phone' }, 'lembrete de pedido pendente não enviado');
    return;
  }
  const smsFrom = process.env.TWILIO_SMS_FROM;
  if (!smsFrom) {
    log.warn({ event: 'notify_skipped', kind: 'request_reminder', reason: 'no_channel' }, 'Twilio sem SMS configurado — lembrete de pedido pendente não enviado');
    return;
  }
  const what = opts.type === 'offer' ? 'uma oferta' : 'um pedido de visita';
  const url = appUrl('/pedidos');
  const to = opts.sellerPhone.replace(/[^\d+]/g, '');
  const body = new URLSearchParams({
    From: smsFrom,
    To: to,
    Body: `Kitetropos: você ainda tem ${what} pendente no anúncio "${opts.listingTitle}". Responda em ${url} para liberar o contato. Bons ventos!`,
  });
  await sendOrEnqueue('sms', 'request_reminder', sid, token, body);
}

// Reenvio do OUTBOX (cron drain-notifications). Drena `pending` vencidos em lotes,
// com backoff exponencial; após MAX_ATTEMPTS marca `failed`. Idempotente por status.
const DRAIN_BATCH = 50;
const MAX_ATTEMPTS = 5;
const DRAIN_TIME_BUDGET_MS = 50_000;

export async function drainNotificationDeliveries(now = new Date()): Promise<{ sent: number; failed: number; retried: number }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  let sent = 0, failed = 0, retried = 0;
  if (!sid || !token) return { sent, failed, retried }; // sem credencial → no-op

  const startedAt = Date.now();
  for (;;) {
    if (Date.now() - startedAt > DRAIN_TIME_BUDGET_MS) break;
    const batch = await db.notificationDelivery.findMany({
      where: { status: 'pending', nextAttemptAt: { lte: now } },
      orderBy: { nextAttemptAt: 'asc' },
      take: DRAIN_BATCH,
    });
    if (batch.length === 0) break;

    for (const d of batch) {
      const body = new URLSearchParams(d.body as Record<string, string>);
      let ok = false;
      let reason = '';
      try {
        const res = await fetch(twilioUrl(sid), { method: 'POST', headers: twilioHeaders(sid, token), body, signal: AbortSignal.timeout(4000) });
        ok = res.ok;
        if (!ok) reason = `http_${res.status}`;
        // 4xx permanente: não adianta retentar → marca failed direto.
        if (!ok && res.status < 500) {
          await db.notificationDelivery.update({ where: { id: d.id }, data: { status: 'failed', attempts: { increment: 1 }, lastError: reason } });
          failed++;
          continue;
        }
      } catch (e) {
        reason = e instanceof Error ? e.name : 'error';
      }

      if (ok) {
        await db.notificationDelivery.update({ where: { id: d.id }, data: { status: 'sent', sentAt: new Date(), attempts: { increment: 1 } } });
        sent++;
      } else {
        const attempts = d.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          await db.notificationDelivery.update({ where: { id: d.id }, data: { status: 'failed', attempts, lastError: reason } });
          failed++;
        } else {
          // backoff exponencial: 2^attempts minutos (2, 4, 8, 16…).
          const next = new Date(Date.now() + Math.pow(2, attempts) * 60_000);
          await db.notificationDelivery.update({ where: { id: d.id }, data: { attempts, lastError: reason, nextAttemptAt: next } });
          retried++;
        }
      }
    }
    if (batch.length < DRAIN_BATCH) break;
  }
  return { sent, failed, retried };
}
