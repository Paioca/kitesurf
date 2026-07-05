import { ImageResponse } from 'next/og';
import { getListing } from '../../../../../lib/queries';
import { isPubliclyVisible } from '../../../../../lib/listing-status';
import { formatBRL } from '../../../../../lib/api';

// Card OG composto do anúncio (1200×630): foto + faixa com nome, preço e spot.
// Substitui a foto crua no preview de WhatsApp/IG — se destaca no meio do grupo.
//
// Cache: s-maxage longo é obrigatório. A foto vem da URL pública do Supabase e cada
// render baixa a imagem de lá (egress já estourou o free tier uma vez); com o cache
// da CDN da Vercel, cada anúncio renderiza no máximo 1×/dia. O WhatsApp ainda cacheia
// o preview do lado dele, então o volume real é baixo.
const CACHE = 'public, s-maxage=86400, stale-while-revalidate=604800';

const GREEN_DARK = '#0c2520';
const GREEN = '#1f6b5c';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const l = await getListing(id);
  // Mesmo guard da página: rascunho/pausado não vaza preço/foto no preview.
  if (!l || !isPubliclyVisible(l.status)) return new Response('Not found', { status: 404 });

  const a = (l.attributes ?? {}) as Record<string, any>;
  const sizeM2 = a.size_m2 != null ? `${a.size_m2} m²` : null;
  const name = [l.brand?.name, l.model?.name ?? l.title].filter(Boolean).join(' ');
  const place = [l.city, l.spot].filter(Boolean).join(' · ');
  const photo = (l.images ?? [])[0]?.url as string | undefined;

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', flexDirection: 'column', background: GREEN_DARK, position: 'relative' }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" width={1200} height={630} style={{ position: 'absolute', inset: 0, width: 1200, height: 630, objectFit: 'cover' }} />
        ) : null}
        {/* gradiente pra faixa de texto ler sobre qualquer foto */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 300, background: 'linear-gradient(180deg, rgba(12,37,32,0) 0%, rgba(12,37,32,0.92) 62%)' }} />
        <div style={{ position: 'absolute', left: 56, right: 56, bottom: 44, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 780 }}>
              <div style={{ display: 'flex', fontSize: 54, fontWeight: 700, color: '#ffffff', lineHeight: 1.08 }}>
                {name}{sizeM2 ? ` ${sizeM2}` : ''}
              </div>
              {place ? <div style={{ display: 'flex', fontSize: 28, color: 'rgba(255,255,255,0.85)' }}>{place}</div> : null}
            </div>
            <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, color: '#ffffff', background: GREEN, padding: '14px 30px', borderRadius: 999, whiteSpace: 'nowrap' }}>
              {formatBRL(l.price)}
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', top: 40, left: 56, display: 'flex', alignItems: 'center', fontSize: 30, fontWeight: 700, color: '#ffffff', background: 'rgba(12,37,32,0.72)', padding: '10px 24px', borderRadius: 999 }}>
          Kitetropos
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'Cache-Control': CACHE } },
  );
}
