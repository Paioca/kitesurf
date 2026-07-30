import type { MetadataRoute } from 'next';
import { publicBaseUrl } from '../lib/app-url';
import { db } from '../lib/db';

// Sitemap dinâmico: páginas estáticas + todos os anúncios ATIVOS + os perfis dos
// vendedores com anúncio ativo. Render dinâmico pra refletir o catálogo em tempo real.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicBaseUrl();
  const now = new Date();

  const statics: MetadataRoute.Sitemap = [
    // 'daily' (era 'hourly'): com o site force-dynamic, cada re-crawl é um render completo
    // cobrado (Fast Origin Transfer). 'hourly' convidava re-visita constante sem ganho.
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/sobre`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/como-funciona`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/comprar-kite-usado`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/vender-kite-usado`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/guias/checklist-kite-usado`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/anunciar`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/termos`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/privacidade`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  // Mesma regra de visibilidade pública do browse: ativo, não-excluído, categoria ativa.
  const listings = await db.listing.findMany({
    where: { status: 'active', deletedAt: null, category: { is: { active: true } } },
    select: { id: true, updatedAt: true, userId: true },
    orderBy: { updatedAt: 'desc' },
    take: 5000, // teto de segurança; o sitemap protocol permite 50k, mas paginamos se crescer
  });

  // 'weekly' (era 'daily'): anúncio muda pouco depois de publicado; o sinal forte de mudança
  // é o lastModified (updatedAt real), que já está aqui. Menos re-crawl em site force-dynamic = menos custo.
  const listingEntries: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${base}/anuncio/${l.id}`,
    lastModified: l.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // Perfis dos vendedores com pelo menos um anúncio ativo (sem duplicar).
  const sellerIds = [...new Set(listings.map((l) => l.userId))];
  const profileEntries: MetadataRoute.Sitemap = sellerIds.map((id) => ({
    url: `${base}/perfil/${id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.4,
  }));

  return [...statics, ...listingEntries, ...profileEntries];
}
