// Card de anúncio — primitivo compartilhado (mobile + desktop). Server-compatible.
import { color, font, radius } from '../lib/tokens';
import type { Card } from '../lib/browse';

const HATCH = 'repeating-linear-gradient(135deg,#e3ece5 0px,#e3ece5 13px,#d8e4dc 13px,#d8e4dc 26px)';

export function ListingCard({ item, imgHeight = 180 }: { item: Card; imgHeight?: number }) {
  return (
    <a href={`/anuncio/${item.id}`} style={card}>
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
        <div style={{ fontFamily: font.serif, fontSize: 20, fontWeight: 600, letterSpacing: '-0.2px', marginBottom: 12, lineHeight: 1.1 }}>{item.model}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 'auto' }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>{item.priceLabel}</div>
          <div style={{ fontSize: 12.5, color: color.inkFaint }}>📍 {item.city}</div>
        </div>
      </div>
    </a>
  );
}

const card: React.CSSProperties = { textDecoration: 'none', color: 'inherit', background: color.surface, border: `1px solid ${color.lineCard}`, borderRadius: radius.card, overflow: 'hidden', display: 'flex', flexDirection: 'column' };
const img: React.CSSProperties = { position: 'relative', overflow: 'hidden', backgroundImage: HATCH, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const body: React.CSSProperties = { padding: 16, display: 'flex', flexDirection: 'column', flex: 1 };
const sizeBadge: React.CSSProperties = { position: 'absolute', top: 12, left: 12, background: color.primaryDeep, color: '#fff', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 };
const deliveryTag: React.CSSProperties = { position: 'absolute', bottom: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.94)', padding: '5px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: color.ink };
const comboBadge: React.CSSProperties = { position: 'absolute', top: 12, right: 12, background: color.gold, color: color.primaryDeep, fontSize: 11.5, fontWeight: 800, padding: '5px 11px', borderRadius: 999, letterSpacing: '0.2px' };
