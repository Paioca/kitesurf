export const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type Category = {
  id: string;
  slug: string;
  namePt: string;
  nameEn: string;
  attributeSchema: AttrSchema;
};

export type AttrSchema = {
  required?: string[];
  properties?: Record<
    string,
    { type: string; enum?: (string | number)[]; label?: string }
  >;
};

export type Brand = { id: string; name: string; models: { id: string; name: string }[] };

export type ListingCard = {
  id: string;
  title: string;
  price: number;
  city: string;
  spot?: string | null;
  shippable: boolean;
  attributes: Record<string, any>;
  images: { url: string }[];
  brand?: { name: string } | null;
  model?: { name: string } | null;
  category?: { namePt: string } | null;
};

export type SearchResult = {
  items: ListingCard[];
  total: number;
  page: number;
  pageSize: number;
};

export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export const getCategories = () => get<Category[]>('/api/catalog/categories');
export const getBrands = () => get<Brand[]>('/api/catalog/brands');
export const getListing = (id: string) => get<any>(`/api/listings/${id}`);

export function searchListings(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  return get<SearchResult>(`/api/listings?${qs.toString()}`);
}

// Token só existe no client (localStorage).
export function authHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const t = localStorage.getItem('kite_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}
