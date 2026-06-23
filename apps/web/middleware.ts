import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware único: injeta correlation ID em TODA request (entrada + saída).
//
// Por que existir: hoje não há como amarrar um log do otp.ts a um log do ratelimit
// dispararam pela mesma requisição. Com o correlationId propagado, todo logger.child
// pode carregar esse id e o Log Drain (Better Stack Telemetry) consegue reconstruir
// a linha do tempo da request inteira filtrando por uma string.
//
// Contrato:
//   1. Se o cliente mandou x-correlation-id e ele é "razoável" (UUID/hex/16-64 chars),
//      a gente reusa — permite tracing cross-service quando chamamos /api de outro lado.
//   2. Senão, gera um randomUUID().
//   3. Sempre devolve no response (clientes podem logar e mostrar pro suporte).
//   4. Route handlers acessam via `headers().get('x-correlation-id')` (chega
//      via Next.js request headers — já vem populado pelo middleware).

const VALID_ID = /^[A-Za-z0-9_-]{16,64}$/;

export function middleware(req: NextRequest) {
  const incoming = req.headers.get('x-correlation-id');
  const id = incoming && VALID_ID.test(incoming) ? incoming : crypto.randomUUID();

  // Propaga pra entrada: route handlers leem com headers().get('x-correlation-id').
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-correlation-id', id);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  // Devolve pra saída: cliente vê e pode reportar em ticket de suporte.
  res.headers.set('x-correlation-id', id);
  return res;
}

// Roda em todas as rotas — incluindo assets. Custo é desprezível (uma alocação +
// crypto.randomUUID). Excluímos só o que o Next já filtra automaticamente.
export const config = {
  matcher: [
    // Tudo, EXCETO assets estáticos e _next internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
