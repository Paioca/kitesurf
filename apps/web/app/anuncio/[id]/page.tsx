// Detalhe do anúncio — design Kitetropos (handoff Anuncio.dc.html). Server-rendered.
// Adaptação Fase 0: sem escrow/checkout. CTA = conversar. Sem rating falso.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getListing } from '../../../lib/queries';
import { getCurrentUser, getNavUser } from '../../../lib/session';
import { db } from '../../../lib/db';
import { getListingRequestState } from '../../../lib/requests';
import { listingHasSaleRecord } from '../../../lib/deals';
import { OwnerControls } from '../../../components/OwnerControls';
import { ContactActions, type Target } from '../../../components/ContactActions';
import { sellables, applyReservations, COMPONENT_LABEL, type Component, type ListingLike } from '../../../lib/components';
import { isPubliclyVisible } from '../../../lib/listing-status';
import { formatBRL } from '../../../lib/api';
import { color, font } from '../../../lib/tokens';
import { SiteHeader } from '../../../components/SiteHeader';
import { MobileAppBar, MobileTabBar } from '../../../components/MobileChrome';
import { Footer } from '../../../components/Footer';
import { Gallery } from '../../../components/Gallery';
import { BarraPhotos } from '../../../components/BarraPhotos';
import { ReportButton } from '../../../components/ReportButton';
import { ShareButton } from '../../../components/ShareButton';
import { appUrl } from '../../../lib/app-url';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

// Preview rico ao compartilhar o link (WhatsApp/IG): foto, título e preço.
export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const l = await getListing(params.id);
  // OG/preview só pra anúncio publicado — não vaza título/preço de rascunho/pausado.
  if (!l || !isPubliclyVisible(l.status)) return { title: 'Anúncio não encontrado | Kitetropos' };
  const a = (l.attributes ?? {}) as Record<string, any>;
  const sizeM2 = a.size_m2 != null ? ` ${a.size_m2} m²` : '';
  const name = `${[l.brand?.name, l.model?.name ?? l.title].filter(Boolean).join(' ')}${sizeM2}`.trim();
  const price = formatBRL(l.price);
  const title = `${name} | ${price} · Kitetropos`;
  const description = `${l.category?.namePt ?? 'Equipamento de kite'} à venda em ${l.city}${l.spot ? ` (${l.spot})` : ''} por ${price}. Telefone verificado e anúncios estruturados na Kitetropos.`;
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
  novo_lacrado: 'Novo, lacrado', novo_10x: 'Pouco usado',
  semi_otimo: 'Seminovo, em ótimo estado', semi_desgaste: 'Seminovo, com sinais de uso',
  usado_desgaste: 'Usado, com desgaste visível',
  novo: 'Novo', seminovo: 'Seminovo', bom: 'Bom estado', usado: 'Usado', com_reparos: 'Com reparos',
  zero: 'Sem furo', microfuro_adesivado: 'Microfuro reparado', original: 'Originais', ja_trocadas: 'Trocadas',
};
const pricePill: React.CSSProperties = { fontSize: 13.5, fontWeight: 700, color: color.ink, background: '#f1ece0', border: '1px solid #e3dcc9', padding: '7px 13px', borderRadius: 999 };
const soldPill: React.CSSProperties = { ...pricePill, color: color.inkFaint2, background: '#efeae0', textDecoration: 'line-through', opacity: 0.7 };

export default async function AnuncioPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const l = await getListing(params.id);
  if (!l) notFound();

  const me = await getCurrentUser();
  const navMe = await getNavUser();
  const isOwner = !!me && me.id === l.userId;
  // Visibilidade: draft/paused/archived são privados do dono. Terceiro que adivinhe o
  // UUID não pode ver anúncio não publicado (vaza preço/fotos/ficha).
  if (!isPubliclyVisible(l.status) && !isOwner) notFound();
  // §10 — o dono não pode excluir um anúncio que já registra venda (sold/histórico).
  const saleRecord = isOwner && (l.status === 'sold' || (await listingHasSaleRecord(l.id)));
  // §7 — peça com venda aguardando confirmação (seller_confirmed) está reservada e não
  // recebe novas solicitações. Carrega as reservas pra refletir na UI (o gate de backend
  // já rejeita em createRequest).
  const reservedComponents = l.status === 'active'
    ? (await db.deal.findMany({ where: { listingId: l.id, status: 'seller_confirmed' }, select: { component: true } })).map((d) => d.component)
    : [];
  const favorited = !!me && !isOwner && (await db.favorite.findUnique({ where: { userId_listingId: { userId: me.id, listingId: l.id } } })) != null;
  const emptyReq = { offer: null, visit: null, whatsapp: null };
  const reqState = me && !isOwner ? await getListingRequestState(me.id, l.id) : { conjunto: emptyReq, kite: emptyReq, barra: emptyReq };
  const statusLabel: Record<string, string> = { paused: 'Pausado. Não aparece na busca', archived: 'Arquivado', sold: 'Vendido' };

  const a = (l.attributes ?? {}) as Record<string, any>;
  const isKit = (l as any).hasBarra === true;
  const allImgs = (l.images ?? []) as any[];
  const kiteImgs = isKit ? allImgs.filter((i) => i.component === 'kite') : allImgs;
  const photos = (kiteImgs.length ? kiteImgs : allImgs).map((i: any) => i.url); // galeria principal = kite
  const barraPhotos = allImgs.filter((i) => i.component === 'barra').map((i: any) => i.url);
  const ba = ((l as any).barraAttributes ?? {}) as Record<string, any>;
  const kitePrice = (l as any).kitePrice as number | null;
  const barraPrice = (l as any).barraPrice as number | null;
  const barraYear = (l as any).barraYear as number | null;
  const barraBrandName = (l as any).barraBrand?.name ?? (typeof ba.compatible_brand === 'string' ? ba.compatible_brand : null);
  const barraModelName = (l as any).barraModel?.name ?? null;
  const barraName = [barraBrandName, barraModelName].filter(Boolean).join(' ') || 'Barra do kit';
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
  if (a.microfuros != null) attrs.push({ k: 'Microfuros', v: Number(a.microfuros) > 0 ? String(a.microfuros) : 'Nenhum' });
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
  if (a.microfuros != null) summaryParts.push(Number(a.microfuros) > 0 ? `${a.microfuros} microfuro(s)` : 'sem microfuros');
  if (a.reparos != null) summaryParts.push(Number(a.reparos) > 0 ? `${a.reparos} reparo(s)` : 'sem reparos');
  summaryParts.push(`em ${l.city}${l.spot ? ` (${l.spot})` : ''}`);
  const visitSummary = summaryParts.join(', ');

  // Alvos vendáveis (peça única → 1 alvo 'conjunto'; kit com avulso → 2-3 alvos).
  const barraSummary = [barraName, barraYear ? String(barraYear) : '', ba.condition ? (CONDITION[ba.condition] ?? ba.condition) : '', `em ${l.city}${l.spot ? ` (${l.spot})` : ''}`].filter(Boolean).join(', ');
  const compMeta: Record<Component, { summary: string; itemNoun: string }> = {
    conjunto: { summary: visitSummary, itemNoun },
    kite: { summary: visitSummary, itemNoun: 'o kite' },
    barra: { summary: barraSummary, itemNoun: 'a barra' },
  };
  const sell = applyReservations(sellables(l as unknown as ListingLike), reservedComponents);
  const targets: Target[] = sell
    .filter((s) => s.available)
    .map((s) => ({ component: s.component, label: COMPONENT_LABEL[s.component], price: s.price, summary: compMeta[s.component].summary, itemNoun: compMeta[s.component].itemNoun }));
  const primaryTarget = targets[0] ?? null;
  const primaryPrice = primaryTarget?.price ?? l.price;
  const primaryPriceNote = isKit
    ? primaryTarget?.component === 'conjunto'
      ? 'Conjunto · kite + barra'
      : primaryTarget
        ? `${primaryTarget.label} disponível`
        : 'Conjunto · kite + barra'
    : null;
  // peças reservadas (venda em andamento) — pra mostrar o estado, não só sumir o botão.
  const reservedLabels = sell.filter((s) => s.reserved).map((s) => COMPONENT_LABEL[s.component]);

  // Ficha completa estruturada (seção "100% estruturado" do design).
  const ficha: { k: string; v: string }[] = [];
  ficha.push({ k: 'Tipo', v: isKit ? 'Kite + Barra (kit)' : l.category?.namePt ?? 'Não informado' });
  if (l.brand?.name) ficha.push({ k: 'Marca', v: l.brand.name });
  if (l.model?.name) ficha.push({ k: 'Modelo', v: l.model.name });
  if (l.year) ficha.push({ k: 'Ano', v: String(l.year) });
  if (sizeM2) ficha.push({ k: 'Tamanho', v: sizeM2 });
  if (a.condition) ficha.push({ k: 'Condição', v: CONDITION[a.condition] ?? a.condition });
  if (a.microfuros != null) ficha.push({ k: 'Microfuros', v: Number(a.microfuros) > 0 ? String(a.microfuros) : 'Nenhum' });
  if (a.reparos != null) ficha.push({ k: 'Reparos', v: Number(a.reparos) > 0 ? String(a.reparos) : 'Nenhum' });
  if (a.bladder) ficha.push({ k: 'Bladder', v: CONDITION[a.bladder] ?? a.bladder });
  if (a.mangueiras) ficha.push({ k: 'Mangueiras', v: CONDITION[a.mangueiras] ?? a.mangueiras });
  ficha.push({ k: 'Spot', v: `${l.city}${l.spot ? ` · ${l.spot}` : ''}` });
  ficha.push({ k: 'Entrega', v: [l.pickup && 'Retirada', l.shippable && 'Envio'].filter(Boolean).join(' + ') || 'Retirada local' });

  // JSON-LD Product/Offer → rich results no Google (preço + disponibilidade). Só em anúncio
  // publicamente visível. Carimba o nonce da CSP (o proxy expõe em x-nonce) p/ não ser bloqueado.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const ldCond = typeof a.condition === 'string' && /(novo|lacrad)/.test(a.condition) ? 'NewCondition' : 'UsedCondition';
  const productLd = isPubliclyVisible(l.status)
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: [l.brand?.name, title].filter(Boolean).join(' '),
        ...(photos.length ? { image: photos.slice(0, 5) } : {}),
        ...(l.brand?.name ? { brand: { '@type': 'Brand', name: l.brand.name } } : {}),
        offers: {
          '@type': 'Offer',
          price: (l.price / 100).toFixed(2),
          priceCurrency: 'BRL',
          availability: `https://schema.org/${l.status === 'active' ? 'InStock' : 'OutOfStock'}`,
          itemCondition: `https://schema.org/${ldCond}`,
          url: appUrl(`/anuncio/${l.id}`),
        },
      }
    : null;

  return (
    <>
      {productLd && <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />}
      <div className="only-mobile"><MobileAppBar initialMe={navMe} /></div>
      <div className="only-desktop"><SiteHeader /></div>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 24px 0' }}>
        <div style={{ fontSize: 13.5, color: color.inkFaint, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: color.inkFaint, textDecoration: 'none' }}>Comprar</Link><span>›</span>
          <a href={`/?cat=${l.category?.slug ?? ''}`} style={{ color: color.inkFaint, textDecoration: 'none' }}>{l.category?.slug === 'kite' ? 'Kites' : l.category?.namePt}</a><span>›</span>
          <span style={{ color: color.ink, fontWeight: 600 }}>{title}</span>
        </div>
      </div>
      <main className="detail-grid" style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 24px 0' }}>
        <Gallery photos={photos} listingId={l.id} favorited={favorited} />

        <div className="detail-rail">
          <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 17, color: color.primary, marginBottom: 8 }}>
            {l.brand?.name}{l.year ? ` · ${l.year}` : ''}
          </div>
          <h1 style={{ fontFamily: font.serif, fontSize: 36, fontWeight: 600, letterSpacing: '-0.5px', lineHeight: 1.05, margin: '0 0 12px' }}>{title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14.5, color: color.inkMute, marginBottom: 22 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: l.shippable ? color.primary : color.accent }} />
            {l.city}{l.spot ? ` · ${l.spot}` : ''} · {[l.pickup && 'retirada no spot', l.shippable && 'envio'].filter(Boolean).join(' ou ') || 'retirada no spot'}
          </div>
          {l.status !== 'active' && statusLabel[l.status] && (
            <div style={{ background: '#fbf0d8', border: '1px solid #ecdcb0', color: '#7a5e1f', fontSize: 13.5, fontWeight: 600, padding: '10px 14px', borderRadius: 10, marginBottom: 16 }}>
              {statusLabel[l.status]}
            </div>
          )}

          {/* Buy box (Lifestyle): preço num card rotulado, como o rail de preço do Stitch. */}
          <div style={{ border: `1px solid ${color.lineCard}`, background: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, boxShadow: '0 6px 24px rgba(20,72,62,0.06)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: color.inkFaint2, marginBottom: 10 }}>Preço</div>
            {isKit ? (
              <div>
                <div style={{ fontFamily: font.sans, fontSize: 38, fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1, color: color.primary }}>{formatBRL(primaryPrice)}</div>
                <div style={{ fontSize: 13.5, color: color.inkMute, marginTop: 4 }}>{primaryPriceNote}</div>
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
              <div style={{ fontFamily: font.sans, fontSize: 38, fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1, color: color.primary }}>{formatBRL(l.price)}</div>
            )}
            <div style={{ fontSize: 12.5, color: color.inkFaint2, marginTop: 12, lineHeight: 1.4 }}>Pagamento e entrega são combinados direto com o vendedor.</div>
          </div>

          {/* Compartilhar — só em anúncio publicamente visível (link que o amigo consegue abrir).
              O card rico no WhatsApp/IG já vem das meta tags OG da página. */}
          {isPubliclyVisible(l.status) && (
            <div style={{ marginBottom: 24 }}>
              <ShareButton
                url={appUrl(`/anuncio/${l.id}`)}
                title={[l.brand?.name, l.model?.name ?? l.title].filter(Boolean).join(' ')}
                text={`Olha esse ${l.category?.namePt ?? 'equipamento'} na Kitetropos: ${[l.brand?.name, l.model?.name ?? l.title].filter(Boolean).join(' ')} — ${formatBRL(l.price)}`}
              />
            </div>
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
                <div style={{ fontFamily: font.serif, fontSize: 18, fontWeight: 600 }}>{barraName}</div>
              </div>
              <BarraPhotos photos={barraPhotos} />
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 14, color: color.ink }}>
                {barraBrandName && <div><span style={{ color: color.inkFaint }}>Marca: </span><b>{barraBrandName}</b></div>}
                {barraModelName && <div><span style={{ color: color.inkFaint }}>Modelo: </span><b>{barraModelName}</b></div>}
                {barraYear && <div><span style={{ color: color.inkFaint }}>Ano: </span><b>{barraYear}</b></div>}
                {ba.condition && <div><span style={{ color: color.inkFaint }}>Estado: </span><b>{CONDITION[ba.condition] ?? ba.condition}</b></div>}
              </div>
            </div>
          )}

          {isOwner ? (
            <OwnerControls listingId={l.id} status={l.status} saleRecord={saleRecord} />
          ) : l.status === 'active' && targets.length > 0 ? (
            <div id="contato" style={{ scrollMarginTop: 80 }}>
              <ContactActions listingId={l.id} targets={targets} stateByComponent={reqState} />
              {/* §7 — kit com uma peça reservada: a outra segue disponível acima; aqui o estado da reservada. */}
              {reservedLabels.length > 0 && (
                <div style={{ background: '#f3e7d3', border: '1px solid #e6d3ad', borderRadius: 12, padding: '12px 15px', marginBottom: 16, fontSize: 13, color: '#8a6a3a', lineHeight: 1.45 }}>
                  <strong>{reservedLabels.join(' e ')}:</strong> venda em andamento. Disponível de novo se não se concretizar.
                </div>
              )}
            </div>
          ) : l.status === 'active' && reservedLabels.length > 0 ? (
            // §7 — todas as peças reservadas (venda aguardando confirmação): sem CTA, com estado.
            (<div style={{ background: '#f3e7d3', border: '1px solid #e6d3ad', borderRadius: 13, padding: '16px 18px', marginBottom: 16, fontSize: 14.5, fontWeight: 600, color: '#8a6a3a' }}>
              Venda em andamento. Este item está reservado. Volte mais tarde: se não se concretizar, ele fica disponível de novo.
            </div>)
          ) : (
            // Anúncio não-ativo: sem ações de contato (o backend já rejeita; aqui evitamos
            // a fricção de preencher uma oferta que vai falhar).
            (<div style={{ background: '#f3f1e9', border: `1px solid ${color.lineCard}`, borderRadius: 13, padding: '16px 18px', marginBottom: 16, fontSize: 14.5, fontWeight: 600, color: color.inkMute }}>
              {l.status === 'sold' ? 'Este item já foi vendido.' : 'Este anúncio está indisponível no momento.'}
            </div>)
          )}

          {/* SELLER — card escuro "Vendedor Verificado" (contraste teatral Lifestyle).
              Só apresentação: mesmos dados (nome, membro desde, telefone verificado, link). */}
          <div style={{ position: 'relative', overflow: 'hidden', background: color.dark, color: '#fff', borderRadius: 16, padding: 20 }}>
            <span aria-hidden="true" style={{ position: 'absolute', top: 16, right: 16, width: 16, height: 16, background: color.accent, transform: 'rotate(45deg)', borderRadius: 3, opacity: 0.5, boxShadow: '0 0 22px rgba(217,168,107,0.45)' }} />
            <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 14, color: color.aqua, marginBottom: 12 }}>Vendedor verificado</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 48, height: 48, borderRadius: 999, background: l.user?.avatarUrl ? `center/cover url("${l.user.avatarUrl}")` : color.primary, color: '#fff', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', border: '2px solid rgba(255,255,255,0.18)' }}>
                {!l.user?.avatarUrl && initials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.15, color: '#fff' }}>{l.user?.name}</div>
                <div style={{ fontSize: 13, color: '#9fb6ab' }}>
                  membro desde {memberSince}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
              {l.user?.phoneVerified && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: color.aqua, background: 'rgba(127,188,174,0.14)', border: '1px solid rgba(127,188,174,0.25)', padding: '6px 11px', borderRadius: 999 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: color.aqua }} />Telefone verificado
                </span>
              )}
            </div>
            <a href={`/perfil/${l.user?.id}`} style={{ display: 'inline-block', marginTop: 15, fontSize: 13.5, fontWeight: 600, color: color.aqua, textDecoration: 'none' }}>Ver perfil do vendedor ›</a>
          </div>
          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <ReportButton targetType="listing" targetId={l.id} label="Denunciar anúncio" />
          </div>
        </div>
      </main>
      {/* FICHA COMPLETA — 100% estruturado (handoff Anuncio.dc.html) */}
      <section style={{ maxWidth: 1240, margin: '56px auto 0', padding: '0 24px' }}>
        <div style={{ background: '#ece3d2', borderRadius: 22, padding: 'clamp(28px, 4vw, 44px) clamp(22px, 4vw, 48px)' }}>
          <h2 style={{ fontFamily: font.sans, fontSize: 32, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1.2px', margin: '0 0 28px' }}>Ficha completa</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, background: '#dccdb2', border: '1px solid #dccdb2', borderRadius: 16, overflow: 'hidden' }}>
            {ficha.map((f) => (
              <div key={f.k} style={{ background: color.bg, padding: '18px 20px' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: color.inkFaint2, marginBottom: 6 }}>{f.k}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: color.ink }}>{f.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="only-mobile" style={{ height: 84 }} />
      <div className="only-desktop"><Footer /></div>
      {/* Mobile: barra de ação fixa (preço + CTA) substitui a tab bar quando há o que
          contratar — padrão Stitch mobile. CTA só ancora no ContactActions (#contato),
          sem lógica nova. Demais casos (dono, vendido, reservado) caem na tab bar. */}
      <div className="only-mobile">
        {l.status === 'active' && !isOwner && targets.length > 0 ? (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)', borderTop: `1px solid ${color.lineCard}`, padding: '12px 18px calc(12px + env(safe-area-inset-bottom))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, boxShadow: '0 -4px 18px rgba(20,72,62,0.10)' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: color.inkFaint2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{primaryTarget ? primaryTarget.label : l.user?.name ? `Vendido por ${l.user.name}` : 'Preço'}</div>
              <div style={{ fontFamily: font.sans, fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', color: color.primary, lineHeight: 1.15 }}>{formatBRL(primaryPrice)}</div>
            </div>
            <a href="#contato" className="kl-lift" style={{ flex: 'none', background: color.primary, color: '#fff', fontFamily: font.sans, fontSize: 15, fontWeight: 800, padding: '14px 26px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 4px 14px rgba(20,72,62,0.16)' }}>Quero ver de perto</a>
          </div>
        ) : (
          <MobileTabBar initialAuthed={!!navMe} />
        )}
      </div>
    </>
  );
}
