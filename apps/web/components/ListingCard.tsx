// Card de anúncio — primitivo compartilhado (mobile + desktop). Server-compatible.
// Foto via background-image (não next/image): os thumbs já são 400px e servir
// direto do Supabase evita a cota de otimização da Vercel (Hobby).
//
// Hierarquia (redesign "Versão B" — Cards Home A×B): a leitura desce em três
// níveis claros — IDENTIDADE (tamanho-selo + tipo/marca/modelo) → DECISÃO
// (preço dominante + entrega ao lado) → CONFIANÇA (vendedor verificado + nota
// agrupados). A condição sobe pra foto, codificada por cor, liberando o corpo.
import Link from 'next/link';
import { color, font, radius } from '../lib/tokens';
import type { Card } from '../lib/browse';
import { FavoriteButton } from './FavoriteButton';

const HATCH = 'repeating-linear-gradient(135deg,#e3ece5 0px,#e3ece5 13px,#d8e4dc 13px,#d8e4dc 26px)';

// Condição codificada por cor (nível de estado num relance). Mapeia o rótulo já
// pronto (COND_LABEL em lib/browse) sem depender do slug — puramente visual.
function condStyle(label: string): { color: string; bg: string } {
  if (/usado/i.test(label)) return { color: '#6b7a73', bg: 'rgba(240,237,228,0.95)' };
  if (/ótimo|^novo/i.test(label)) return { color: '#15463b', bg: 'rgba(231,244,237,0.95)' };
  return { color: '#8a6a3a', bg: 'rgba(247,237,219,0.95)' };
}

export function ListingCard({ item, imgHeight = 180 }: { item: Card; imgHeight?: number }) {
  const cond = item.condLabel ? condStyle(item.condLabel) : null;
  const sub = `📍 ${item.city}`;
  return (
    // Favoritar fora do <a> (evita interativo aninhado / clique conflitante; melhora leitor de tela).
    <div className="listing-card" style={{ ...card, position: 'relative' }}>
      <Link href={`/anuncio/${item.id}`} aria-label={`${item.brand} ${item.model}`} style={cardLink}>
        <div style={{ ...img, height: imgHeight }}>
          {item.photo ? (
            // <img loading="lazy"> em vez de background-image: ganha lazy-load NATIVO
            // (os cards abaixo da dobra só baixam ao rolar) + decode assíncrono. Antes,
            // os 24 thumbs da página disparavam todos juntos no load. Altura via CSS
            // (contêiner tem altura fixa) — sem CLS.
            <img src={item.photo} alt="" loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 13, fontWeight: 500, color: color.inkFaint2 }}>{item.cat}{item.sizeM2 ? ` · ${item.sizeM2} m²` : ''}</span>
          )}
          {/* leve escurecida no topo: dá contraste pro selo e ao coração */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(20,48,42,0.32),rgba(20,48,42,0) 38%)' }} />
          {/* IDENTIDADE nível 1 — tamanho é o filtro nº1 do produto: selo escuro dominante */}
          <span style={sizeBadge}>{item.sizeLabel}</span>
          {item.includesBar && <span style={comboBadge}>+ Barra</span>}
          {item.partOfKit && <span style={comboBadge}>do kit</span>}
          {/* condição codificada por cor, na foto */}
          {cond && (
            <span style={{ ...condChip, color: cond.color, background: cond.bg }}>{item.condLabel}</span>
          )}
        </div>
        <div style={body}>
          {/* IDENTIDADE — tipo · marca · ano (eyebrow) + modelo */}
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase', color: color.inkFaint2, marginBottom: 3 }}>
            {item.cat}{item.brand ? ` · ${item.brand}` : ''}{item.year ? ` · ${item.year}` : ''}
          </div>
          <div style={{ fontFamily: font.serif, fontSize: 20, fontWeight: 600, letterSpacing: '-0.2px', lineHeight: 1.08, marginBottom: 13 }}>{item.model}</div>
          {/* DECISÃO — preço domina, entrega como apoio leve ao lado */}
          {item.priceNote && <div style={{ fontSize: 11.5, fontWeight: 600, color: color.inkFaint2, lineHeight: 1, marginBottom: 3 }}>{item.priceNote}</div>}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 13 }}>
            <div style={{ fontFamily: font.sans, fontSize: 27, fontWeight: 800, letterSpacing: '-0.8px', lineHeight: 1, whiteSpace: 'nowrap' }}>{item.priceLabel}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 'none', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: 12, color: item.ship ? color.primary : color.accent }}>{item.ship ? '✈' : '↧'}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: color.inkMute }}>{item.ship ? 'Envio' : 'Retirada'}</span>
            </div>
          </div>
          {/* CONFIANÇA — vendedor verificado + nota, agrupados num bloco só */}
          {item.seller ? (
            <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #f0ebde', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                <div style={{ position: 'relative', flex: 'none' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 999, background: item.seller.avatar ? `center/cover url("${item.seller.avatar}")` : color.primary, color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {!item.seller.avatar && item.seller.name.slice(0, 2).toUpperCase()}
                  </div>
                  {/* selo verificado (telefone confirmado é universal na Fase 0) */}
                  <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 999, background: color.primary, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#fff', fontSize: 7.5, lineHeight: 1 }}>✓</span>
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.seller.name}</div>
                  <div style={{ fontSize: 11.5, color: color.inkFaint2, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
                </div>
              </div>
              {item.seller.rating != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f4f6f2', padding: '4px 9px', borderRadius: 999, flex: 'none' }}>
                  <span style={{ color: color.accent, fontSize: 12 }}>★</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>{item.seller.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: color.inkFaint, marginTop: 'auto', paddingTop: 4 }}>📍 {item.city}</div>
          )}
        </div>
      </Link>
      <FavoriteButton listingId={item.id} initial={item.favorited} />
    </div>
  );
}

const card: React.CSSProperties = { background: color.surface, border: `1px solid ${color.lineCard}`, borderRadius: radius.card, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 2px rgba(35,51,46,0.04)' };
const cardLink: React.CSSProperties = { textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', flex: 1 };
const img: React.CSSProperties = { position: 'relative', overflow: 'hidden', backgroundImage: HATCH, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const body: React.CSSProperties = { padding: '15px 16px 14px', display: 'flex', flexDirection: 'column', flex: 1 };
const sizeBadge: React.CSSProperties = { position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: color.dark, color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: '-0.3px', padding: '6px 13px', borderRadius: 9, whiteSpace: 'nowrap' };
const condChip: React.CSSProperties = { position: 'absolute', bottom: 12, left: 12, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', padding: '4px 11px', borderRadius: 999 };
const comboBadge: React.CSSProperties = { position: 'absolute', bottom: 12, right: 12, background: color.primary, color: '#fff', fontSize: 11.5, fontWeight: 800, padding: '5px 11px', borderRadius: 999, letterSpacing: '0.2px' };
