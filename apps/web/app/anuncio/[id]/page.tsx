// Detalhe do anúncio — design Kitetropos (handoff Anuncio.dc.html). Server-rendered.
// Adaptação Fase 0: sem escrow/checkout. CTA = conversar. Sem rating falso.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getListing } from '../../../lib/queries';
import { getCurrentUser } from '../../../lib/session';
import { db } from '../../../lib/db';
import { getListingRequestState } from '../../../lib/requests';
import { OwnerControls } from '../../../components/OwnerControls';
import { FavoriteButton } from '../../../components/FavoriteButton';
import { ContactActions, type Target } from '../../../components/ContactActions';
import { sellables, COMPONENT_LABEL, type Component, type ListingLike } from '../../../lib/components';
import { formatBRL } from '../../../lib/api';
import { color, font } from '../../../lib/tokens';
import { SiteHeader } from '../../../components/SiteHeader';
import { MobileAppBar, MobileTabBar } from '../../../components/MobileChrome';
import { Footer } from '../../../components/Footer';
import { Gallery } from '../../../components/Gallery';
import { ReportButton } from '../../../components/ReportButton';

export const dynamic = 'force-dynamic';

// Preview rico ao compartilhar o link (WhatsApp/IG): foto, título e preço.
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const l = await getListing(params.id);
  if (!l) return { title: 'Anúncio não encontrado — Kitetropos' };
  const a = (l.attributes ?? {}) as Record<string, any>;
  const sizeM2 = a.size_m2 != null ? ` ${a.size_m2} m²` : '';
  const name = `${[l.brand?.name, l.model?.name ?? l.title].filter(Boolean).join(' ')}${sizeM2}`.trim();
  const price = formatBRL(l.price);
  const title = `${name} — ${price} · Kitetropos`;
  const description = `${l.category?.namePt ?? 'Equipamento de kite'} à venda em ${l.city}${l.spot ? ` (${l.spot})` : ''} por ${price}. Contato verificado, sem golpe — na Kitetropos.`;
  const img = (l.images ?? [])[0]?.url;
  const images = img ? [img] : undefined;
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', images },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}

// Labels das opções de enum da ficha (condição kite/barra, bladder, mangueiras).
const CONDITION: Record<string, string> = {
  novo_lacrado: 'Novo (lacrado)', novo_10x: 'Novo (menos de 10x velejo)',
  semi_otimo: 'Semi novo (tecido em ótimo estado)', semi_desgaste: 'Semi novo (tecido com início de desgaste)',
  usado_desgaste: 'Usado (tecido com bastante desgaste)',
  novo: 'Novo', seminovo: 'Seminovo', bom: 'Bom estado', usado: 'Usado', com_reparos: 'Com reparos',
  zero: 'Zero', microfuro_adesivado: 'Microfuro adesivado', original: 'Original', ja_trocadas: 'Já trocadas',
};
const pricePill: React.CSSProperties = { fontSize: 13.5, fontWeight: 700, color: color.ink, background: '#f1ece0', border: '1px solid #e3dcc9', padding: '7px 13px', borderRadius: 999 };
const soldPill: React.CSSProperties = { ...pricePill, color: color.inkFaint2, background: '#efeae0', textDecoration: 'line-through', opacity: 0.7 };

export default async function AnuncioPage({ params }: { params: { id: string } }) {
  const l = await getListing(params.id);
  if (!l) notFound();

  const me = await getCurrentUser();
  const isOwner = !!me && me.id === l.userId;
  const favorited = !!me && !isOwner && (await db.favorite.findUnique({ where: { userId_listingId: { userId: me.id, listingId: l.id } } })) != null;
  const emptyReq = { offer: null, visit: null, whatsapp: null };
  const reqState = me && !isOwner ? await getListingRequestState(me.id, l.id) : { conjunto: emptyReq, kite: emptyReq, barra: emptyReq };
  const statusLabel: Record<string, string> = { paused: 'Pausado — não aparece na busca', archived: 'Arquivado', sold: 'Vendido' };

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
  if (a.bladder) attrs.push({ k: 'Bladder', v: CONDITION[a.bladder] ?? a.bladder });
  if (a.mangueiras) attrs.push({ k: 'Mangueiras', v: CONDITION[a.mangueiras] ?? a.mangueiras });
  if (a.microfuros != null) attrs.push({ k: 'Micro furos', v: Number(a.microfuros) > 0 ? String(a.microfuros) : 'Nenhum' });
  if (a.reparos != null) attrs.push({ k: 'Reparos', v: Number(a.reparos) > 0 ? String(a.reparos) : 'Nenhum' });
  else if (a.repairs_count != null) attrs.push({ k: 'Reparos', v: Number(a.repairs_count) > 0 ? String(a.repairs_count) : 'Nenhum' });
  if (a.harness_size) attrs.push({ k: 'Tamanho', v: String(a.harness_size) });
  if (a.bar_size) attrs.push({ k: 'Barra', v: String(a.bar_size) });

  // resumo pra confirmação de visita (o comprador declara que leu a ficha)
  const itemNoun = isKit ? 'o kit' : l.category?.slug === 'barra' ? 'a barra' : 'o kite';
  const summaryParts: string[] = [];
  const bm = [l.brand?.name, l.model?.name].filter(Boolean).join(' ');
  if (bm) summaryParts.push(bm);
  if (l.year) summaryParts.push(String(l.year));
  if (sizeM2) summaryParts.push(sizeM2);
  if (a.condition) summaryParts.push(CONDITION[a.condition] ?? a.condition);
  if (a.bladder) summaryParts.push(`bladder ${(CONDITION[a.bladder] ?? a.bladder).toLowerCase()}`);
  if (a.mangueiras) summaryParts.push(`mangueiras ${(CONDITION[a.mangueiras] ?? a.mangueiras).toLowerCase()}`);
  if (a.microfuros != null) summaryParts.push(Number(a.microfuros) > 0 ? `${a.microfuros} micro furo(s)` : 'sem micro furos');
  if (a.reparos != null) summaryParts.push(Number(a.reparos) > 0 ? `${a.reparos} reparo(s)` : 'sem reparos');
  summaryParts.push(`em ${l.city}${l.spot ? ` (${l.spot})` : ''}`);
  const visitSummary = summaryParts.join(', ');

  // Alvos vendáveis (peça única → 1 alvo 'conjunto'; kit com avulso → 2-3 alvos).
  const barraSummary = [ba.compatible_brand ? `compatível ${ba.compatible_brand}` : '', ba.line_length_m ? `linhas ${ba.line_length_m} m` : '', ba.condition ? (CONDITION[ba.condition] ?? ba.condition) : '', `em ${l.city}${l.spot ? ` (${l.spot})` : ''}`].filter(Boolean).join(', ');
  const compMeta: Record<Component, { summary: string; itemNoun: string }> = {
    conjunto: { summary: visitSummary, itemNoun },
    kite: { summary: visitSummary, itemNoun: 'o kite' },
    barra: { summary: barraSummary, itemNoun: 'a barra' },
  };
  const targets: Target[] = sellables(l as unknown as ListingLike)
    .filter((s) => s.available)
    .map((s) => ({ component: s.component, label: COMPONENT_LABEL[s.component], price: s.price, summary: compMeta[s.component].summary, itemNoun: compMeta[s.component].itemNoun }));

  // Ficha completa estruturada (seção "100% estruturado" do design).
  const ficha: { k: string; v: string }[] = [];
  ficha.push({ k: 'Tipo', v: isKit ? 'Kite + Barra (kit)' : l.category?.namePt ?? '—' });
  if (l.brand?.name) ficha.push({ k: 'Marca', v: l.brand.name });
  if (l.model?.name) ficha.push({ k: 'Modelo', v: l.model.name });
  if (l.year) ficha.push({ k: 'Ano', v: String(l.year) });
  if (sizeM2) ficha.push({ k: 'Tamanho', v: sizeM2 });
  if (a.condition) ficha.push({ k: 'Condição', v: CONDITION[a.condition] ?? a.condition });
  if (a.microfuros != null) ficha.push({ k: 'Micro furos', v: Number(a.microfuros) > 0 ? String(a.microfuros) : 'Nenhum' });
  if (a.reparos != null) ficha.push({ k: 'Reparos', v: Number(a.reparos) > 0 ? String(a.reparos) : 'Nenhum' });
  if (a.bladder) ficha.push({ k: 'Bladder', v: CONDITION[a.bladder] ?? a.bladder });
  if (a.mangueiras) ficha.push({ k: 'Mangueiras', v: CONDITION[a.mangueiras] ?? a.mangueiras });
  ficha.push({ k: 'Spot', v: `${l.city}${l.spot ? ` · ${l.spot}` : ''}` });
  ficha.push({ k: 'Entrega', v: [l.pickup && 'Retirada', l.shippable && 'Envio'].filter(Boolean).join(' + ') || 'Retirada local' });

  return (
    <>
      <div className="only-mobile"><MobileAppBar /></div>
      <div className="only-desktop"><SiteHeader /></div>

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
            {l.city}{l.spot ? ` · ${l.spot}` : ''} — {[l.pickup && 'retirada', l.shippable && 'envio'].filter(Boolean).join(' + ') || 'retirada'}
          </div>
          {l.status !== 'active' && statusLabel[l.status] && (
            <div style={{ background: '#fbf0d8', border: '1px solid #ecdcb0', color: '#7a5e1f', fontSize: 13.5, fontWeight: 600, padding: '10px 14px', borderRadius: 10, marginBottom: 16 }}>
              {statusLabel[l.status]}
            </div>
          )}

          {isKit ? (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-1.5px' }}>{formatBRL(l.price)}</div>
              <div style={{ fontSize: 13.5, color: color.inkMute, marginTop: 2 }}>Conjunto · kite + barra</div>
              {(kitePrice || barraPrice) ? (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {kitePrice ? <span style={l.kiteSoldAt ? soldPill : pricePill}>Só o kite: {formatBRL(kitePrice)}{l.kiteSoldAt ? ' · vendido' : ''}</span> : null}
                  {barraPrice ? <span style={l.barraSoldAt ? soldPill : pricePill}>Só a barra: {formatBRL(barraPrice)}{l.barraSoldAt ? ' · vendida' : ''}</span> : null}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: color.inkFaint, marginTop: 6 }}>Vendido só em conjunto.</div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 24 }}>{formatBRL(l.price)}</div>
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
                <span style={{ background: '#e8f1ec', color: color.primary, fontSize: 11.5, fontWeight: 800, padding: '4px 10px', borderRadius: 999 }}>+ Barra</span>
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

          {isOwner ? (
            <OwnerControls listingId={l.id} status={l.status} />
          ) : (
            <>
              {l.status === 'active' && targets.length > 0 ? (
                <ContactActions listingId={l.id} targets={targets} stateByComponent={reqState} />
              ) : (
                // Anúncio não-ativo: sem ações de contato (o backend já rejeita; aqui evitamos
                // a fricção de preencher uma oferta que vai falhar).
                <div style={{ background: '#f3f1e9', border: `1px solid ${color.lineCard}`, borderRadius: 13, padding: '16px 18px', marginBottom: 16, fontSize: 14.5, fontWeight: 600, color: color.inkMute }}>
                  {l.status === 'sold' ? 'Este item já foi vendido.' : 'Este anúncio está indisponível no momento.'}
                </div>
              )}
              <div style={{ marginBottom: 24 }}><FavoriteButton listingId={l.id} initial={favorited} variant="inline" /></div>
            </>
          )}

          {/* SELLER */}
          <div style={{ border: `1px solid ${color.lineCard}`, background: '#fff', borderRadius: 16, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 48, height: 48, borderRadius: 999, background: l.user?.avatarUrl ? `center/cover url("${l.user.avatarUrl}")` : color.primary, color: '#fff', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                {!l.user?.avatarUrl && initials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.15 }}>{l.user?.name}</div>
                <div style={{ fontSize: 13, color: color.inkFaint2 }}>
                  membro desde {memberSince}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
              {l.user?.phoneVerified && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: color.primary, background: '#e8f1ec', padding: '6px 11px', borderRadius: 999 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: color.primary }} />Telefone verificado
                </span>
              )}
            </div>
            <a href={`/perfil/${l.user?.id}`} style={{ display: 'inline-block', marginTop: 15, fontSize: 13.5, fontWeight: 600, color: color.primary, textDecoration: 'none' }}>Ver perfil do vendedor ›</a>
          </div>
          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <ReportButton targetType="listing" targetId={l.id} label="Denunciar anúncio" />
          </div>
        </div>
      </main>

      {/* FICHA COMPLETA — 100% estruturado (handoff Anuncio.dc.html) */}
      <section style={{ maxWidth: 1240, margin: '56px auto 0', padding: '0 24px' }}>
        <div style={{ background: '#ece3d2', borderRadius: 22, padding: 'clamp(28px, 4vw, 44px) clamp(22px, 4vw, 48px)' }}>
          <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 18, color: color.primary, marginBottom: 6 }}>100% estruturado — sem texto solto</div>
          <h2 style={{ fontFamily: font.sans, fontSize: 32, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1.2px', margin: '0 0 28px' }}>Ficha completa</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, background: '#dccdb2', border: '1px solid #dccdb2', borderRadius: 16, overflow: 'hidden' }}>
            {ficha.map((f) => (
              <div key={f.k} style={{ background: color.bg, padding: '18px 20px' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: color.inkFaint2, marginBottom: 6 }}>{f.k}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: color.ink }}>{f.v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 22, fontSize: 13.5, color: '#6b6353' }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: color.primary, flex: 'none' }} />
            Toda a ficha vem de listas controladas. Sem campo de descrição livre — é o que mantém a busca confiável.
          </div>
        </div>
      </section>

      <div className="only-mobile" style={{ height: 84 }} />
      <div className="only-desktop"><Footer /></div>
      <div className="only-mobile"><MobileTabBar /></div>
    </>
  );
}
