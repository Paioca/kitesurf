// Detalhe do anúncio — design Kite Life (handoff Anuncio.dc.html). Server-rendered.
// Adaptação Fase 0: sem escrow/checkout. CTA = conversar. Sem rating falso.
import { notFound } from 'next/navigation';
import { getListing } from '../../../lib/queries';
import { formatBRL } from '../../../lib/api';
import { color, font } from '../../../lib/tokens';
import { SiteHeader } from '../../../components/SiteHeader';
import { Footer } from '../../../components/Footer';
import { Gallery } from '../../../components/Gallery';
import { ContactSellerButton } from '../../../components/ContactSellerButton';
import { ReportButton } from '../../../components/ReportButton';

export const dynamic = 'force-dynamic';

const CONDITION: Record<string, string> = { novo: 'Novo', seminovo: 'Seminovo', bom: 'Bom estado', usado: 'Usado', com_reparos: 'Com reparos' };
const pricePill: React.CSSProperties = { fontSize: 13.5, fontWeight: 700, color: color.ink, background: '#f1ece0', border: '1px solid #e3dcc9', padding: '7px 13px', borderRadius: 999 };

export default async function AnuncioPage({ params }: { params: { id: string } }) {
  const l = await getListing(params.id);
  if (!l) notFound();

  const a = (l.attributes ?? {}) as Record<string, any>;
  const isKit = (l as any).hasBarra === true;
  const allImgs = (l.images ?? []) as any[];
  const kiteImgs = isKit ? allImgs.filter((i) => i.component === 'kite') : allImgs;
  const photos = (kiteImgs.length ? kiteImgs : allImgs).map((i: any) => i.url); // galeria principal = kite
  const barraPhotos = allImgs.filter((i) => i.component === 'barra').map((i: any) => i.url);
  const ba = ((l as any).barraAttributes ?? {}) as Record<string, any>;
  const kitePrice = (l as any).kitePrice as number | null;
  const barraPrice = (l as any).barraPrice as number | null;
  const sizeM2 = a.size_m2 != null ? `${a.size_m2} m²` : null;
  const title = `${l.model?.name ?? l.title}${sizeM2 ? ` ${sizeM2}` : ''}`;
  const memberSince = l.user?.createdAt ? new Date(l.user.createdAt).getFullYear() : null;
  const initials = (l.user?.name ?? '?').slice(0, 2).toUpperCase();

  const attrs: { k: string; v: string }[] = [];
  if (sizeM2) attrs.push({ k: 'Tamanho', v: sizeM2 });
  if (a.condition) attrs.push({ k: 'Estado', v: CONDITION[a.condition] ?? a.condition });
  if (l.year) attrs.push({ k: 'Ano', v: String(l.year) });
  if (l.brand?.name) attrs.push({ k: 'Marca', v: l.brand.name });
  if (a.repairs_count != null) attrs.push({ k: 'Reparos', v: Number(a.repairs_count) > 0 ? String(a.repairs_count) : 'Nenhum' });
  if (a.usage_time) attrs.push({ k: 'Tempo de uso', v: String(a.usage_time) });
  if (a.harness_size) attrs.push({ k: 'Tamanho', v: String(a.harness_size) });
  if (a.bar_size) attrs.push({ k: 'Barra', v: String(a.bar_size) });

  const summary: { k: string; v: string }[] = [
    { k: 'Categoria', v: isKit ? 'Kite + Barra (kit)' : l.category?.namePt ?? '—' },
    { k: 'Local', v: `${l.city}${l.spot ? ` · ${l.spot}` : ''}` },
    { k: 'Entrega', v: l.shippable ? 'Enviável' : 'Retirada local' },
  ];

  return (
    <>
      <SiteHeader />

      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 24px 0' }}>
        <div style={{ fontSize: 13.5, color: color.inkFaint, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <a href="/" style={{ color: color.inkFaint, textDecoration: 'none' }}>Comprar</a><span>›</span>
          <a href={`/?cat=${l.category?.slug ?? ''}`} style={{ color: color.inkFaint, textDecoration: 'none' }}>{l.category?.namePt}</a><span>›</span>
          <span style={{ color: color.ink, fontWeight: 600 }}>{title}</span>
        </div>
      </div>

      <main className="detail-grid" style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 24px 0' }}>
        <Gallery photos={photos} />

        <div>
          <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 17, color: color.primary, marginBottom: 8 }}>
            {l.brand?.name}{l.year ? ` · ${l.year}` : ''}
          </div>
          <h1 style={{ fontFamily: font.serif, fontSize: 36, fontWeight: 600, letterSpacing: '-0.5px', lineHeight: 1.05, margin: '0 0 12px' }}>{title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14.5, color: color.inkMute, marginBottom: 22 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: l.shippable ? color.primary : color.accent }} />
            {l.city}{l.spot ? ` · ${l.spot}` : ''} — {l.shippable ? 'enviável' : 'retirada local'}
          </div>
          {isKit ? (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px' }}>{formatBRL(l.price)}</div>
              <div style={{ fontSize: 13.5, color: color.inkMute, marginTop: 2 }}>Conjunto · kite + barra</div>
              {(kitePrice || barraPrice) ? (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {kitePrice ? <span style={pricePill}>Só o kite: {formatBRL(kitePrice)}</span> : null}
                  {barraPrice ? <span style={pricePill}>Só a barra: {formatBRL(barraPrice)}</span> : null}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: color.inkFaint, marginTop: 6 }}>Vendido só em conjunto.</div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px', marginBottom: 24 }}>{formatBRL(l.price)}</div>
          )}

          {attrs.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: color.line, border: `1px solid ${color.line}`, borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
              {attrs.map((at) => (
                <div key={at.k + at.v} style={{ background: '#fff', padding: '14px 16px' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', color: color.inkFaint2, marginBottom: 4 }}>{at.k}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: color.ink }}>{at.v}</div>
                </div>
              ))}
            </div>
          )}

          {isKit && (
            <div style={{ border: `1px solid ${color.lineCard}`, background: '#fff', borderRadius: 16, padding: 18, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
                <span style={{ background: color.gold, color: color.primaryDeep, fontSize: 11.5, fontWeight: 800, padding: '4px 10px', borderRadius: 999 }}>+ Barra</span>
                <div style={{ fontFamily: font.serif, fontSize: 18, fontWeight: 600 }}>Barra que acompanha</div>
              </div>
              {barraPhotos.length > 0 && (
                <div className="kl-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12 }}>
                  {barraPhotos.map((u, i) => (
                    <div key={i} style={{ width: 92, height: 92, borderRadius: 10, flex: 'none', backgroundImage: `url("${u}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 14, color: color.ink }}>
                {ba.line_length_m != null && <div><span style={{ color: color.inkFaint }}>Comprimento: </span><b>{ba.line_length_m} m</b></div>}
                {ba.condition && <div><span style={{ color: color.inkFaint }}>Estado: </span><b>{CONDITION[ba.condition] ?? ba.condition}</b></div>}
                {ba.compatible_brand && <div><span style={{ color: color.inkFaint }}>Compatível: </span><b>{ba.compatible_brand}</b></div>}
              </div>
            </div>
          )}

          <ContactSellerButton listingId={l.id} />

          {/* SELLER */}
          <div style={{ border: `1px solid ${color.lineCard}`, background: '#fff', borderRadius: 16, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 48, height: 48, borderRadius: 999, background: l.user?.avatarUrl ? `center/cover url("${l.user.avatarUrl}")` : color.primary, color: '#fff', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                {!l.user?.avatarUrl && initials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.15 }}>{l.user?.name}</div>
                <div style={{ fontSize: 13, color: color.inkFaint2 }}>
                  {l.user?.instagramHandle ? `@${l.user.instagramHandle} · ` : ''}membro desde {memberSince}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
              {l.user?.phoneVerified && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: color.primary, background: '#e8f1ec', padding: '6px 11px', borderRadius: 999 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: color.primary }} />Telefone verificado
                </span>
              )}
              {l.user?.instagramHandle && (
                <span style={{ fontSize: 12, fontWeight: 600, color: '#8a7a5c', background: '#f1ebdd', padding: '6px 11px', borderRadius: 999 }}>Instagram conectado</span>
              )}
            </div>
            <a href={`/perfil/${l.user?.id}`} style={{ display: 'inline-block', marginTop: 15, fontSize: 13.5, fontWeight: 600, color: color.primary, textDecoration: 'none' }}>Ver perfil do vendedor ›</a>
          </div>
          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <ReportButton targetType="listing" targetId={l.id} label="Denunciar anúncio" />
          </div>
        </div>
      </main>

      {/* DESCRIPTION + SUMMARY */}
      <section className="detail-grid" style={{ maxWidth: 1240, margin: '0 auto', padding: '56px 24px' }}>
        <div>
          <h2 style={{ fontFamily: font.serif, fontSize: 28, fontWeight: 600, letterSpacing: '-0.3px', margin: '0 0 16px' }}>Descrição</h2>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: color.inkSoft, margin: 0, whiteSpace: 'pre-line' }}>
            {l.description || 'Sem descrição adicional.'}
          </p>
        </div>
        <div style={{ border: `1px solid ${color.lineCard}`, background: '#fff', borderRadius: 16, padding: 20, alignSelf: 'start' }}>
          <div style={{ fontFamily: font.serif, fontSize: 18, fontWeight: 600, marginBottom: 14 }}>Resumo</div>
          {summary.map((r, i) => (
            <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: i < summary.length - 1 ? '1px solid #f0ebde' : 'none' }}>
              <span style={{ fontSize: 14, color: color.inkFaint }}>{r.k}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: color.ink, textAlign: 'right' }}>{r.v}</span>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
