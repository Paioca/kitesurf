// Helpers do cliente. App consolidado: API é mesma-origem (URLs relativas /api/...).
// Sessão vai em cookie httpOnly — nada de token no localStorage.
export const API = '';

export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export type Category = {
  id: string;
  slug: string;
  namePt: string;
  nameEn: string;
  attributeSchema: {
    required?: string[];
    properties?: Record<string, { type: string; enum?: (string | number)[]; label?: string }>;
  };
};

export type Brand = { id: string; name: string; models: { id: string; name: string }[] };
