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
