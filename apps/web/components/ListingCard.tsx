// Card de anúncio — primitivo compartilhado (mobile + desktop). Server-compatible.
// Foto via background-image (não next/image): os thumbs já são 400px e servir
// direto do Supabase evita a cota de otimização da Vercel (Hobby).
import Link from 'next/link';
import { color, font, radius } from '../lib/tokens';
import type { Card } from '../lib/browse';
import { FavoriteButton } from './FavoriteButton';

const HATCH = 'repeating-linear-gradient(135deg,#e3ece5 0px,#e3ece5 13px,#d8e4dc 13px,#d8e4dc 26px)';

export function ListingCard({ item, imgHeight = 180 }: { item: Card; imgHeight?: number }) {
  return (
    // Favoritar fora do <a> (evita interativo aninhado / clique conflitante; melhora leitor de tela).
    <div className="listing-card" style={{ ...card, position: 'relative' }}>
      <Link href={`/anuncio/${item.id}`} aria-label={`${item.brand} ${item.model}`} style={cardLink}>
        <div style={{ ...img, height: imgHeight }}>
          {item.photo ? (
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("${item.photo}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          ) : (
            <span style={{ fontSize: 13, fontWeight: 500, color: color.inkFaint2 }}>{item.cat}{item.sizeM2 ? ` · ${item.sizeM2} m²` : ''}</span>
          )}
          <span style={sizeBadge}>{item.sizeLabel}</span>
          {item.includesBar && <span style={comboBadge}>+ Barra</span>}
          {item.partOfKit && <span style={comboBadge}>do kit</span>}
          <span style={deliveryTag}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: item.ship ? color.primary : color.accent }} />
            {item.ship ? 'Enviável' : 'Retirada local'}
          </span>
        </div>
        <div style={body}>
          <div style={{ fontSize: 13, fontWeight: 600, color: color.inkFaint2, marginBottom: 4 }}>
            {item.brand}{item.year ? ` · ${item.year}` : ''}
          </div>
          <div style={{ fontFamily: font.serif, fontSize: 21, fontWeight: 600, letterSpacing: '-0.2px', marginBottom: 12, lineHeight: 1.1 }}>{item.model}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: color.primary, background: color.chipSoftBg, padding: '4px 10px', borderRadius: 999 }}>{item.cat}</span>
            {item.condLabel && <span style={{ fontSize: 11.5, fontWeight: 600, color: '#8a7a5c', background: '#f1ebdd', padding: '4px 10px', borderRadius: 999 }}>{item.condLabel}</span>}
          </div>
          <div style={{ marginTop: 'auto' }}>
            {item.priceNote && <div style={{ fontSize: 11.5, fontWeight: 600, color: color.inkFaint2, lineHeight: 1, marginBottom: 2 }}>{item.priceNote}</div>}
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>{item.priceLabel}</div>
            {item.seller ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 14, paddingTop: 14, borderTop: `1px solid #f0ebde` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                  <div style={{ width: 31, height: 31, borderRadius: 999, flex: 'none', background: item.seller.avatar ? `center/cover url("${item.seller.avatar}")` : color.primary, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {!item.seller.avatar && item.seller.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.seller.name}</div>
                    <div style={{ fontSize: 11.5, color: color.inkFaint2, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {item.city}</div>
                  </div>
                </div>
                {item.seller.rating != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 13.5, fontWeight: 700, flex: 'none' }}><span style={{ color: color.accent }}>★</span>{item.seller.rating.toFixed(1)}</div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: color.inkFaint, marginTop: 6 }}>📍 {item.city}</div>
            )}
          </div>
        </div>
      </Link>
      <FavoriteButton listingId={item.id} initial={item.favorited} />
    </div>
  );
}

const card: React.CSSProperties = { background: color.surface, border: `1px solid ${color.lineCard}`, borderRadius: radius.card, overflow: 'hidden', display: 'flex', flexDirection: 'column' };
const cardLink: React.CSSProperties = { textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', flex: 1 };
const img: React.CSSProperties = { position: 'relative', overflow: 'hidden', backgroundImage: HATCH, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const body: React.CSSProperties = { padding: 16, display: 'flex', flexDirection: 'column', flex: 1 };
const sizeBadge: React.CSSProperties = { position: 'absolute', top: 12, left: 12, background: color.primaryDeep, color: '#fff', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 };
const deliveryTag: React.CSSProperties = { position: 'absolute', bottom: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.94)', padding: '5px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: color.ink };
const comboBadge: React.CSSProperties = { position: 'absolute', bottom: 12, right: 12, background: color.primary, color: '#fff', fontSize: 11.5, fontWeight: 800, padding: '5px 11px', borderRadius: 999, letterSpacing: '0.2px' };
