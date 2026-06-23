import type { Component } from '@prisma/client';

// Fonte de verdade da venda por componente — puro, sem DB. Consumido por backend
// (requests/deals), busca (browse) e UI (via props montadas no server). Manter assim
// elimina a divergência "o que a busca esconde ≠ o que o gate bloqueia".

export type { Component };

// Rótulo de cada alvo (UI, notificação, painel de pedidos).
export const COMPONENT_LABEL: Record<Component, string> = {
  conjunto: 'Conjunto',
  kite: 'Só o kite',
  barra: 'Só a barra',
};

export type ListingLike = {
  status: string;
  hasBarra: boolean;
  price: number;
  kitePrice: number | null;
  barraPrice: number | null;
  kiteSoldAt: Date | null;
  barraSoldAt: Date | null;
};

export type Sellable = { component: Component; price: number; available: boolean; reserved?: boolean };

// Peças vendáveis do anúncio + disponibilidade de cada. Peça única / kite-only /
// barra-only têm só o alvo 'conjunto'.
export function sellables(l: ListingLike): Sellable[] {
  if (!l.hasBarra) {
    return [{ component: 'conjunto', price: l.price, available: l.status !== 'sold' }];
  }
  // Qualquer peça avulsa vendida tira o conjunto de venda (não dá pra vender o kit
  // inteiro depois de vender a barra).
  const conjuntoGone = l.status === 'sold' || l.kiteSoldAt != null || l.barraSoldAt != null;
  const out: Sellable[] = [{ component: 'conjunto', price: l.price, available: !conjuntoGone }];
  if (l.kitePrice != null) out.push({ component: 'kite', price: l.kitePrice, available: l.status !== 'sold' && l.kiteSoldAt == null });
  if (l.barraPrice != null) out.push({ component: 'barra', price: l.barraPrice, available: l.status !== 'sold' && l.barraSoldAt == null });
  return out;
}

// Fecha o anúncio (status='sold') quando não sobra peça vendável. Inclui a regra
// ÓRFÃ: vender a única peça avulsa de um kit que não tem a outra à venda encerra tudo.
export function shouldCloseListing(l: ListingLike, justSold: Component): boolean {
  if (justSold === 'conjunto') return true;
  if (!l.hasBarra) return true;
  const kiteGone = justSold === 'kite' || l.kiteSoldAt != null || l.kitePrice == null;
  const barraGone = justSold === 'barra' || l.barraSoldAt != null || l.barraPrice == null;
  return kiteGone && barraGone;
}

// Unidades físicas que cada venda RESERVA (negociacao-v2 §3). O conjunto reserva as
// duas peças; kite/barra reservam só a sua. Base da trava de "1 reserva por unidade".
const RESERVES: Record<Component, Component[]> = {
  conjunto: ['kite', 'barra'],
  kite: ['kite'],
  barra: ['barra'],
};

// Duas vendas conflitam se reservam alguma unidade física em comum.
export function reservationConflict(a: Component, b: Component): boolean {
  const ua = new Set(RESERVES[a] ?? [a]);
  return (RESERVES[b] ?? [b]).some((u) => ua.has(u));
}

// §7 — marca como reservado (venda em andamento → indisponível) cada vendável que
// conflita com uma reserva ativa (componentes com Deal seller_confirmed). Mantém
// sellables() puro: busca e detalhe injetam aqui as reservas carregadas do banco.
export function applyReservations(items: Sellable[], reserved: Component[]): Sellable[] {
  if (reserved.length === 0) return items;
  return items.map((s) => (s.available && reserved.some((r) => reservationConflict(r, s.component)) ? { ...s, available: false, reserved: true } : s));
}

// Preço da peça (centavos) ou null se o anúncio não vende essa peça avulsa.
export function priceOf(l: ListingLike, c: Component): number | null {
  if (c === 'kite') return l.hasBarra ? l.kitePrice : null;
  if (c === 'barra') return l.hasBarra ? l.barraPrice : null;
  return l.price;
}
