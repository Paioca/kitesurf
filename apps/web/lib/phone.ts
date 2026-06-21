// Normaliza telefone pra E.164 canônico (`+` seguido de dígitos). Retorna null se
// não formar um E.164 plausível. É a ÚNICA fonte da forma canônica: aplique na
// BORDA das rotas (request/verify) e deixe o valor normalizado fluir pra
// generateOtp/verifyOtp/db. Normalizar em dois pontos com regras diferentes faria o
// OTP nunca casar (lookup por telefone diferente do que foi gravado).
//
// Colapsa a duplicação documentada: `+5585…` e `5585…` viram o MESMO `+5585…`
// (2 contas + 2 buckets de rate-limit → 1). Não infere DDI: assume que o número já
// traz o código do país (o cliente monta E.164 antes de enviar).
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  const e164 = '+' + digits;
  // E.164: `+` e 8..15 dígitos, primeiro dígito 1-9.
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) return null;
  return e164;
}
