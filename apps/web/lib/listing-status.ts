// Máquina de estados do Listing (pura, sem Prisma — testável isolada).
// Regra de domínio: `sold` é TERMINAL (não ressuscita) e anúncio vendido não tem campos
// editáveis (preserva o histórico de venda). `archived` é REVERSÍVEL (republicação): o
// dono reativa/pausa um anúncio que ele mesmo arquivou. Os arquivados por EXCLUSÃO ou
// MODERAÇÃO têm `deletedAt` setado e continuam terminais — esse guard mora no caller (a
// rota PATCH só acha listing com deletedAt=null, então soft-deleted dá 404).
export type ListingStatus = 'draft' | 'active' | 'paused' | 'sold' | 'archived';

const ALLOWED: Record<ListingStatus, ListingStatus[]> = {
  draft: ['active'],
  active: ['paused', 'archived'],
  paused: ['active', 'archived'],
  sold: [], // terminal
  archived: ['active', 'paused'], // republicação: arquivar (manual) é reversível pelo dono
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

// Visibilidade pública do detalhe do anúncio. Um anúncio só aparece pra terceiros
// quando está 'active' (à venda) ou 'sold' (histórico, exibido como "Vendido").
// 'draft'/'paused'/'archived' são privados do dono — sem isso, um rascunho/pausado de
// outra pessoa seria legível por quem souber o UUID (vaza preço/fotos/ficha não publicados).
// O dono sempre vê o próprio anúncio em qualquer status (a checagem de owner mora no caller).
export function isPubliclyVisible(status: ListingStatus): boolean {
  return status === 'active' || status === 'sold';
}

// Teto de anúncios ATIVOS por usuário (anti-spam). Decisão do dono: conta SÓ status
// 'active' (pausado não conta) — por isso a reativação paused→active também precisa do guard.
export const ACTIVE_LISTING_LIMIT = 5;
export const activeListingWhere = (userId: string) => ({ userId, status: 'active' as const, deletedAt: null });

// Preço mínimo de um anúncio, em centavos (R$100) — evita preço-isca pra trapacear filtros.
export const MIN_LISTING_PRICE_CENTS = 10000;
