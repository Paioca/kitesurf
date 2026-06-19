'use client';

// Criar anúncio — wizard, design Kite Life. MVP: Kite, Barra ou Kite+Barra (kit).
// Kit = anúncio de kite com hasBarra: seções de ficha/fotos por peça + 3 preços
// (conjunto / kite avulso / barra avulsa). Cookie auth. Fase 0 sem escrow.
import { useEffect, useMemo, useRef, useState } from 'react';
import { color, font } from '../../lib/tokens';
import { downscaleImage } from '../../lib/resizeImage';
import type { Brand, Category } from '../../lib/api';
import { MobileAppBar } from '../../components/MobileChrome';
import { Logo } from '../../components/ui';

const CONDITION_LABEL: Record<string, string> = { novo: 'Novo', seminovo: 'Seminovo', bom: 'Bom estado', usado: 'Usado', com_reparos: 'Com reparos' };
const KITE_SLOTS = ['Foto geral do kite', 'Outro ângulo', 'Detalhe da marca', 'Etiqueta / tamanho', 'Válvulas e bordas', 'Reparos (se houver)'];
const BARRA_SLOTS = ['Foto geral da barra', 'Linhas', 'Detalhe / chicken loop', 'Desgaste (se houver)'];

type Kind = '' | 'kite' | 'barra' | 'kit';
type Img = { url: string; thumbUrl?: string; component: 'kite' | 'barra' };

export default function Criar() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [kind, setKind] = useState<Kind>('');
  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [year, setYear] = useState('');
  const [attrs, setAttrs] = useState<Record<string, any>>({}); // ficha da peça principal (kite, ou barra no barra-only)
  const [barraAttrs, setBarraAttrs] = useState<Record<string, any>>({}); // ficha da barra do kit
  const [images, setImages] = useState<Img[]>([]);
  const [price, setPrice] = useState(''); // conjunto (kit) ou peça única
  const [sellKiteAlone, setSellKiteAlone] = useState(false);
  const [sellBarraAlone, setSellBarraAlone] = useState(false);
  const [kitePrice, setKitePrice] = useState('');
  const [barraPrice, setBarraPrice] = useState('');
  const [city, setCity] = useState('Cumbuco');
  const [spot, setSpot] = useState('');
  const [shippable, setShippable] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<'kite' | 'barra'>('kite');
  const [error, setError] = useState('');
  const [createdId, setCreatedId] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((u) => setAuthed(!!(u && u.id))).catch(() => setAuthed(false));
    fetch('/api/catalog/categories').then((r) => r.json()).then(setCategories).catch(() => {});
    fetch('/api/catalog/brands').then((r) => r.json()).then(setBrands).catch(() => {});
  }, []);

  const kiteCat = useMemo(() => categories.find((c) => c.slug === 'kite'), [categories]);
  const barraCat = useMemo(() => categories.find((c) => c.slug === 'barra'), [categories]);
  const brand = useMemo(() => brands.find((b) => b.id === brandId), [brands, brandId]);

  const isKit = kind === 'kit';
  const mainCat = kind === 'barra' ? barraCat : kiteCat; // categoria primária enviada
  const mainProps = mainCat?.attributeSchema?.properties ?? {};
  const mainRequired = mainCat?.attributeSchema?.required ?? [];
  const barraProps = barraCat?.attributeSchema?.properties ?? {};
  const barraRequired = barraCat?.attributeSchema?.required ?? [];
  const showKitePhotos = kind === 'kite' || kind === 'kit';
  const showBarraPhotos = kind === 'barra' || kind === 'kit';
  const kitePhotos = images.filter((i) => i.component === 'kite');
  const barraPhotos = images.filter((i) => i.component === 'barra');

  const autoTitle = useMemo(() => {
    const b = brand?.name;
    const model = brand?.models.find((m) => m.id === modelId)?.name;
    if (kind === 'barra') return ['Barra', b, attrs.line_length_m ? `${attrs.line_length_m} m` : ''].filter(Boolean).join(' · ');
    const base = [b, model, attrs.size_m2 ? `${attrs.size_m2} m²` : '', year, attrs.condition ? CONDITION_LABEL[attrs.condition] : ''].filter(Boolean).join(' · ');
    return kind === 'kit' ? (base ? `${base} + Barra` : '') : base;
  }, [brand, modelId, attrs, year, kind]);

  function selectKind(k: Kind) {
    setKind(k);
    setAttrs({});
    setBarraAttrs({});
    setImages([]);
  }
  function pickPhotos(component: 'kite' | 'barra') {
    setUploadTarget(component);
    fileRef.current?.click();
  }
  function removePhoto(img: Img) {
    setImages((imgs) => imgs.filter((i) => i.url !== img.url));
  }
  async function upload(files: FileList | null) {
    if (!files) return;
    const component = uploadTarget;
    setUploading(true); setError('');
    try {
      for (const file of Array.from(files).slice(0, 40 - images.length)) {
        const small = await downscaleImage(file, 1600); // reduz no cliente: upload rápido, sem estourar 4,5MB
        const fd = new FormData(); fd.append('file', small);
        const res = await fetch('/api/uploads/image', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Falha no upload.');
        setImages((imgs) => [...imgs, { url: data.url, thumbUrl: data.thumbUrl, component }]);
      }
    } catch (e: any) { setError(e.message); } finally { setUploading(false); }
  }

  const fichaOk = !!kind
    && mainRequired.every((k) => attrs[k] != null && attrs[k] !== '')
    && (isKit ? barraRequired.every((k) => barraAttrs[k] != null && barraAttrs[k] !== '') : true);
  const photosOk = images.length >= 3 && (isKit ? kitePhotos.length >= 1 && barraPhotos.length >= 1 : true);
  const priceOk = Number(price) > 0
    && (!sellKiteAlone || Number(kitePrice) > 0)
    && (!sellBarraAlone || Number(barraPrice) > 0);
  const canPublish = !!kind && fichaOk && photosOk && priceOk && !uploading;
  const missing = !kind ? 'Escolha o tipo' : !fichaOk ? 'Complete a ficha' : !photosOk ? `Faltam fotos (mín. 3${isKit ? ', uma do kite e uma da barra' : ''})` : !priceOk ? 'Defina o preço' : '';

  async function publish() {
    setError('');
    try {
      const res = await fetch('/api/listings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: mainCat?.id, brandId: brandId || undefined, modelId: modelId || undefined,
          year: year ? Number(year) : undefined, attributes: attrs,
          title: autoTitle || mainCat?.namePt || 'Anúncio', price: Math.round(Number(price) * 100),
          city, spot: spot || undefined, shippable, images,
          hasBarra: isKit,
          kitePrice: isKit && sellKiteAlone ? Math.round(Number(kitePrice) * 100) : null,
          barraPrice: isKit && sellBarraAlone ? Math.round(Number(barraPrice) * 100) : null,
          barraAttributes: isKit ? barraAttrs : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erro ao publicar.');
      setCreatedId(data.id);
    } catch (e: any) { setError(e.message); }
  }

  if (authed === false) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <h1 style={{ fontFamily: font.serif, fontSize: 30, fontWeight: 600, margin: '0 0 10px' }}>Entre pra anunciar</h1>
          <p style={{ fontSize: 15, color: color.inkMute, margin: '0 0 24px' }}>Anunciar exige conta com telefone verificado.</p>
          <a href="/entrar" style={primary}>Entrar ou criar conta</a>
        </div>
      </Shell>
    );
  }

  if (createdId) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, background: '#e8f1ec', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: color.primary, fontSize: 30 }}>✓</span></div>
          <h1 style={{ fontFamily: font.serif, fontSize: 32, fontWeight: 600, margin: '0 0 10px' }}>Anúncio publicado!</h1>
          <p style={{ fontSize: 15.5, color: color.inkMute, margin: '0 auto 26px', maxWidth: 400 }}>Já está no ar em Cumbuco. Avisamos quando alguém te chamar.</p>
          <div style={{ display: 'flex', gap: 11, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={`/anuncio/${createdId}`} style={primary}>Ver anúncio</a>
            <a href="/" style={outline}>Voltar à busca</a>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />

        <H1>Anunciar</H1>
        <Lead>Numa tela só. No kit (kite + barra) você descreve as duas peças e decide se vende avulso.</Lead>

        <UpLabel>O que você está vendendo?</UpLabel>
        <div className="criar-cats" style={{ display: 'grid', gap: 10, marginBottom: 6 }}>
          <KindBtn on={kind === 'kite'} onClick={() => selectKind('kite')} title="Kite" desc="Só o kite" />
          <KindBtn on={kind === 'barra'} onClick={() => selectKind('barra')} title="Barra" desc="Só a barra" />
          <KindBtn on={kind === 'kit'} onClick={() => selectKind('kit')} title="Kite + Barra (kit)" desc="As duas peças no mesmo anúncio" />
        </div>

        {kind && (
          <>
            {/* FICHA */}
            <Section title="Ficha">
              <div className="criar-fields" style={{ display: 'grid', gap: '16px 18px' }}>
                <Cell><Label>Marca</Label><select className="kl-select" value={brandId} onChange={(e) => { setBrandId(e.target.value); setModelId(''); }}><option value="">—</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Cell>
                {kind !== 'barra' && <Cell><Label>Modelo</Label><select className="kl-select" value={modelId} onChange={(e) => setModelId(e.target.value)}><option value="">—</option>{(brand?.models ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Cell>}
                {kind !== 'barra' && <Cell><Label>Ano</Label><select className="kl-select" value={year} onChange={(e) => setYear(e.target.value)}><option value="">—</option>{Array.from({ length: 12 }, (_, i) => 2025 - i).map((y) => <option key={y} value={y}>{y}</option>)}</select></Cell>}
                {isKit && <SubHead style={{ gridColumn: '1 / -1' }}>Kite</SubHead>}
                <Fields props={mainProps} required={mainRequired} values={attrs} onChange={(k, v) => setAttrs((a) => ({ ...a, [k]: v }))} />
              </div>
              {isKit && (
                <div className="criar-fields" style={{ display: 'grid', gap: '16px 18px', marginTop: 22 }}>
                  <SubHead style={{ gridColumn: '1 / -1' }}>Barra</SubHead>
                  <Fields props={barraProps} required={barraRequired} values={barraAttrs} onChange={(k, v) => setBarraAttrs((a) => ({ ...a, [k]: v }))} />
                </div>
              )}
              {autoTitle && (
                <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10, background: '#f3f1e9', border: '1.5px dashed #d8d0bd', borderRadius: 11, padding: '12px 15px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: color.primary, flex: 'none' }}>Título</span>
                  <span style={{ fontFamily: font.serif, fontSize: 15.5, fontWeight: 600, color: color.ink }}>{autoTitle}</span>
                </div>
              )}
            </Section>

            {/* FOTOS */}
            <Section title="Fotos">
              <div style={{ fontSize: 13, color: color.inkMute, marginBottom: 12 }}>Mínimo 3.{isKit ? ' No kit, ao menos uma do kite e uma da barra.' : ' O GPS das imagens é removido automaticamente.'}</div>
              {showKitePhotos && <PhotoSection title={isKit ? 'Fotos do kite' : 'Fotos'} slots={KITE_SLOTS} photos={kitePhotos} uploading={uploading} onPick={() => pickPhotos('kite')} onRemove={removePhoto} />}
              {showBarraPhotos && <PhotoSection title={isKit ? 'Fotos da barra' : 'Fotos'} slots={BARRA_SLOTS} photos={barraPhotos} uploading={uploading} onPick={() => pickPhotos('barra')} onRemove={removePhoto} />}
              <div style={{ fontSize: 13, color: color.inkFaint }}>{images.length} foto(s)</div>
            </Section>

            {/* PREÇO + ENTREGA */}
            <Section title="Preço e entrega">
              {isKit ? (
                <div>
                  <Label>Preço do conjunto (kite + barra) *</Label>
                  <PriceInput value={price} onChange={setPrice} />
                  <Helper>É por esse preço que você vende as duas peças juntas.</Helper>
                  <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
                    <Toggle on={sellKiteAlone} onClick={() => setSellKiteAlone((v) => !v)} title="Também vendo o kite separado" desc="Aparece na busca de kite com o preço avulso." />
                    {sellKiteAlone && <div style={{ paddingLeft: 4 }}><Label>Preço do kite sozinho *</Label><PriceInput value={kitePrice} onChange={setKitePrice} /></div>}
                    <Toggle on={sellBarraAlone} onClick={() => setSellBarraAlone((v) => !v)} title="Também vendo a barra separada" desc="Aí a barra também aparece na busca de barra." />
                    {sellBarraAlone && <div style={{ paddingLeft: 4 }}><Label>Preço da barra sozinha *</Label><PriceInput value={barraPrice} onChange={setBarraPrice} /></div>}
                  </div>
                </div>
              ) : (
                <><Label>Preço *</Label><PriceInput value={price} onChange={setPrice} /></>
              )}
              <div style={{ marginTop: 22 }}>
                <Label>Forma de entrega</Label>
                <div className="criar-delivery" style={{ display: 'grid', gap: 14, marginTop: 4 }}>
                  <DeliveryOpt on={!shippable} onClick={() => setShippable(false)} title="Retirada local" desc="Encontro em Cumbuco. Combina com o vendedor." />
                  <DeliveryOpt on={shippable} onClick={() => setShippable(true)} title="Enviável" desc="Manda pelos Correios. Ideal pra acessórios." />
                </div>
              </div>
              <div className="criar-loc" style={{ marginTop: 20, display: 'grid', gap: 16 }}>
                <Cell><Label>Cidade</Label><input className="kl-input" value={city} onChange={(e) => setCity(e.target.value)} /></Cell>
                <Cell><Label>Spot (opcional)</Label><input className="kl-input" value={spot} onChange={(e) => setSpot(e.target.value)} /></Cell>
              </div>
            </Section>

            {error && <div style={{ background: '#fdecea', color: '#b3261e', padding: 12, borderRadius: 10, fontSize: 13, marginTop: 24 }}>{error}</div>}

            {/* PUBLICAR — fixo no rodapé, mostra o que falta */}
            <div style={{ position: 'sticky', bottom: 0, background: color.bg, paddingTop: 14, paddingBottom: 6, marginTop: 18, borderTop: `1px solid ${color.line}` }}>
              <button onClick={publish} disabled={!canPublish} style={{ width: '100%', background: canPublish ? color.primary : '#dfe3df', color: canPublish ? '#fff' : color.inkFaint2, border: 'none', borderRadius: 12, padding: 16, fontFamily: font.sans, fontSize: 16, fontWeight: 700, cursor: canPublish ? 'pointer' : 'not-allowed' }}>
                {canPublish ? 'Publicar anúncio' : (missing || 'Publicar anúncio')}
              </button>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: `1px solid ${color.line}`, marginTop: 28, paddingTop: 22 }}>
      <SubHead>{title}</SubHead>
      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
  );
}

/* ---- campos da ficha (a partir do attributeSchema) ---- */
function Fields({ props, required, values, onChange }: { props: Record<string, any>; required: string[]; values: Record<string, any>; onChange: (k: string, v: any) => void }) {
  return (
    <>
      {Object.entries(props).map(([key, spec]: any) => {
        const req = required.includes(key);
        return (
          <Cell key={key}>
            <Label>{(spec.label ?? key)}{req ? ' *' : ''}</Label>
            {spec.enum && (spec.type === 'number' || spec.type === 'integer') ? (
              <ChipSelect options={spec.enum} value={values[key]} onChange={(v) => onChange(key, v)} />
            ) : spec.enum ? (
              <select className="kl-select" value={values[key] ?? ''} onChange={(e) => onChange(key, e.target.value)}>
                <option value="">—</option>
                {spec.enum.map((o: string) => <option key={o} value={o}>{CONDITION_LABEL[o] ?? o}</option>)}
              </select>
            ) : spec.type === 'boolean' ? (
              <select className="kl-select" value={String(!!values[key])} onChange={(e) => onChange(key, e.target.value === 'true')}><option value="false">Não</option><option value="true">Sim</option></select>
            ) : (
              <input className="kl-input" type={spec.type === 'number' || spec.type === 'integer' ? 'number' : 'text'} value={values[key] ?? ''} onChange={(e) => onChange(key, e.target.value)} />
            )}
          </Cell>
        );
      })}
    </>
  );
}

function ChipSelect({ options, value, onChange }: { options: (string | number)[]; value: any; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = String(value) === String(o);
        return (
          <button key={String(o)} onClick={() => onChange(String(o))} style={{ fontFamily: font.sans, fontSize: 14.5, fontWeight: 600, padding: '9px 16px', borderRadius: 999, cursor: 'pointer', background: on ? color.primary : '#fff', color: on ? '#fff' : color.ink, border: `1.5px solid ${on ? color.primary : color.lineInput}` }}>{o}</button>
        );
      })}
    </div>
  );
}

function PhotoSection({ title, slots, photos, uploading, onPick, onRemove }: { title: string; slots: string[]; photos: Img[]; uploading: boolean; onPick: () => void; onRemove: (img: Img) => void }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <SubHead>{title}</SubHead>
      <div className="criar-photos" style={{ display: 'grid', gap: 14, marginTop: 10 }}>
        {slots.map((label, i) => {
          const img = photos[i];
          return (
            <button key={label} onClick={onPick} style={{ position: 'relative', height: 150, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 10, overflow: 'hidden', cursor: 'pointer', border: img ? `1.5px solid ${color.primary}` : '1.5px dashed #cbc3b2', background: img ? undefined : '#fbfaf6' }}>
              {img && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("${img.thumbUrl ?? img.url}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
              {img && <span role="button" aria-label="Remover foto" onClick={(e) => { e.stopPropagation(); onRemove(img); }} style={{ position: 'absolute', top: 9, left: 9, width: 26, height: 26, borderRadius: 999, background: 'rgba(20,20,20,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, zIndex: 2 }}>✕</span>}
              {img && <div style={{ position: 'absolute', top: 9, right: 9, width: 24, height: 24, borderRadius: 999, background: color.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✓</div>}
              {!img && <div style={{ fontSize: 26, color: '#bcccc4', lineHeight: 1, marginBottom: 8 }}>{uploading ? '…' : '+'}</div>}
              <div style={img ? { position: 'relative', zIndex: 1, background: 'rgba(20,48,42,0.78)', color: '#fff', fontSize: 11.5, fontWeight: 600, padding: '5px 11px', borderRadius: 999 } : { fontSize: 13, fontWeight: 600, color: color.inkFaint }}>{label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---- pequenos helpers de layout ---- */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="only-mobile"><MobileAppBar /></div>
      <header className="only-desktop" style={{ background: '#fff', borderBottom: `1px solid ${color.line}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 36px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ textDecoration: 'none', color: color.ink }}><Logo size={20} /></a>
          <span style={{ fontSize: 14, fontWeight: 600, color: color.inkMute }}>Criar anúncio</span>
          <a href="/" style={{ fontSize: 13.5, color: color.inkFaint, textDecoration: 'none' }}>Sair</a>
        </div>
      </header>
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px 90px' }}>{children}</main>
    </>
  );
}
function H1({ children }: { children: React.ReactNode }) { return <h1 style={{ fontFamily: font.serif, fontSize: 32, fontWeight: 600, letterSpacing: '-0.5px', margin: '0 0 8px' }}>{children}</h1>; }
function Lead({ children }: { children: React.ReactNode }) { return <p style={{ fontSize: 15.5, color: color.inkMute, margin: '0 0 26px' }}>{children}</p>; }
function UpLabel({ children }: { children: React.ReactNode }) { return <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase', color: color.inkFaint2, marginBottom: 12 }}>{children}</div>; }
function Label({ children }: { children: React.ReactNode }) { return <label style={{ fontSize: 13, fontWeight: 600, color: color.inkSoft, display: 'block', marginBottom: 7 }}>{children}</label>; }
function Cell({ children }: { children: React.ReactNode }) { return <div>{children}</div>; }
function SubHead({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) { return <div style={{ fontFamily: font.serif, fontSize: 18, fontWeight: 600, color: color.ink, ...style }}>{children}</div>; }
function Helper({ children }: { children: React.ReactNode }) { return <div style={{ fontSize: 12.5, color: color.inkFaint2, marginTop: 8 }}>{children}</div>; }
// value = string de dígitos (reais inteiros). Display formatado pt-BR. Sem type=number
// (evita o bug onde "1.500" virava 1,5 → R$1,50).
function PriceInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const display = value ? Number(value).toLocaleString('pt-BR') : '';
  return (
    <div style={{ position: 'relative', maxWidth: 260 }}>
      <span style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', fontSize: 15, fontWeight: 700, color: color.inkFaint }}>R$</span>
      <input className="kl-input" type="text" inputMode="numeric" value={display} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} placeholder="0" style={{ paddingLeft: 42, fontWeight: 700, fontSize: 17 }} />
    </div>
  );
}
function KindBtn({ on, onClick, title, desc }: { on: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 11, fontFamily: font.sans, padding: '14px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', background: on ? '#e8f1ec' : '#fff', border: `1.5px solid ${on ? color.primary : color.lineInput}`, color: on ? color.primary : color.ink }}>
      <span style={{ width: 13, height: 13, background: on ? color.primary : '#cdd8d1', transform: 'rotate(45deg)', borderRadius: 2, flex: 'none' }} />
      <span><span style={{ fontSize: 14.5, fontWeight: 700 }}>{title}</span><span style={{ fontSize: 12.5, color: on ? color.primary : color.inkFaint, marginLeft: 8 }}>{desc}</span></span>
    </button>
  );
}
function Toggle({ on, onClick, title, desc }: { on: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, textAlign: 'left', cursor: 'pointer', background: '#fff', border: on ? `2px solid ${color.primary}` : '1.5px solid #e0d9c9', borderRadius: 13, padding: '14px 16px' }}>
      <span style={{ width: 20, height: 20, borderRadius: 6, flex: 'none', marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? color.primary : '#fff', border: `1.5px solid ${on ? color.primary : '#cbc3b2'}` }}>{on && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}</span>
      <span><div style={{ fontSize: 14.5, fontWeight: 700, color: color.ink }}>{title}</div><div style={{ fontSize: 12.5, color: '#7c857c', marginTop: 2 }}>{desc}</div></span>
    </button>
  );
}
function DeliveryOpt({ on, onClick, title, desc }: { on: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button onClick={onClick} style={{ borderRadius: 13, padding: '16px 18px', cursor: 'pointer', textAlign: 'left', fontFamily: font.sans, background: '#fff', border: on ? `2px solid ${color.primary}` : '1.5px solid #e0d9c9', boxShadow: on ? '0 0 0 3px rgba(31,107,92,0.1)' : 'none' }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 5 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#7c857c', lineHeight: 1.45 }}>{desc}</div>
    </button>
  );
}
const primary: React.CSSProperties = { display: 'inline-block', background: color.primary, color: '#fff', textDecoration: 'none', padding: '14px 24px', borderRadius: 11, fontSize: 14.5, fontWeight: 700 };
const outline: React.CSSProperties = { display: 'inline-block', background: '#fff', border: '1.5px solid #d3ccbd', color: color.ink, textDecoration: 'none', padding: '13px 24px', borderRadius: 11, fontSize: 14.5, fontWeight: 600 };
