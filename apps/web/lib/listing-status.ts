// Máquina de estados do Listing (pura, sem Prisma — testável isolada).
// Regra de domínio: `sold` é TERMINAL (não ressuscita) e anúncio vendido/arquivado
// não tem campos editáveis (preserva o histórico de venda). `archived` só volta a
// `active` por um fluxo de republicação dedicado (ainda não existe), nunca por PATCH cru.
export type ListingStatus = 'draft' | 'active' | 'paused' | 'sold' | 'archived';

const ALLOWED: Record<ListingStatus, ListingStatus[]> = {
  draft: ['active'],
  active: ['paused', 'archived'],
  paused: ['active', 'archived'],
  sold: [], // terminal
  archived: [], // só via republicar (fluxo dedicado)
};

// Pode ir de `from` pra `to`? No-op (from === to) é idempotente e sempre permitido.
export function canTransition(from: ListingStatus, to: ListingStatus): boolean {
  if (from === to) return true;
  return ALLOWED[from]?.includes(to) ?? false;
}

// Campos de conteúdo (título, preço, fotos…) só são editáveis enquanto o anúncio
// não foi vendido nem arquivado.
export function isEditable(status: ListingStatus): boolean {
  return status === 'draft' || status === 'active' || status === 'paused';
}

// Teto de anúncios ATIVOS por usuário (anti-spam). Decisão do dono: conta SÓ status
// 'active' (pausado não conta) — por isso a reativação paused→active também precisa do guard.
export const ACTIVE_LISTING_LIMIT = 5;
export const activeListingWhere = (userId: string) => ({ userId, status: 'active' as const, deletedAt: null });

// Preço mínimo de um anúncio, em centavos (R$100) — evita preço-isca pra trapacear filtros.
export const MIN_LISTING_PRICE_CENTS = 10000;
