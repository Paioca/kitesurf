'use client';

// Criar anúncio — wizard, design Kite Life. MVP: Kite, Barra ou Kite+Barra (kit).
// Kit = anúncio de kite com hasBarra: seções de ficha/fotos por peça + 3 preços
// (conjunto / kite avulso / barra avulsa). Cookie auth. Fase 0 sem escrow.
import { useEffect, useMemo, useRef, useState } from 'react';
import { color, font } from '../../lib/tokens';
import { downscaleImage } from '../../lib/resizeImage';
import type { Brand, Category } from '../../lib/api';
import { MobileAppBar } from '../../components/MobileChrome';

const CONDITION_LABEL: Record<string, string> = { novo: 'Novo', seminovo: 'Seminovo', bom: 'Bom estado', usado: 'Usado', com_reparos: 'Com reparos' };
const RAIL = ['O que você vende', 'Fotos guiadas', 'Preço & entrega', 'Revisão'];
const TIPS = [
  'Marca e modelo de listas fechadas é o que deixa a busca por tamanho funcionar de verdade.',
  'Fotos boas vendem. Mostre etiqueta, válvulas e qualquer reparo — honestidade gera review boa.',
  'No conjunto, você decide se vende as peças avulsas. Barra avulsa também aparece na busca de barra.',
  'Confira tudo antes de publicar — capriche na primeira foto e no preço, é o que mais converte.',
];
const KITE_SLOTS = ['Foto geral do kite', 'Outro ângulo', 'Detalhe da marca', 'Etiqueta / tamanho', 'Válvulas e bordas', 'Reparos (se houver)'];
const BARRA_SLOTS = ['Foto geral da barra', 'Linhas', 'Detalhe / chicken loop', 'Desgaste (se houver)'];

type Kind = '' | 'kite' | 'barra' | 'kit';
type Img = { url: string; thumbUrl?: string; component: 'kite' | 'barra' };

export default function Criar() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [step, setStep] = useState(0);
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
  const canNext = step === 0 ? fichaOk : step === 1 ? photosOk : step === 2 ? priceOk : true;

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
      <div className="criar-grid">
        {/* RAIL */}
        <div className="only-desktop" style={{ position: 'sticky', top: 24, alignSelf: 'start' }}>
          {RAIL.map((title, i) => {
            const done = i < step, active = i === step;
            return (
              <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 0' }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 700, background: done || active ? color.primary : '#ece6d8', color: done || active ? '#fff' : color.inkFaint2 }}>{done ? '✓' : i + 1}</div>
                <div style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: active || done ? color.ink : color.inkFaint2 }}>{title}</div>
              </div>
            );
          })}
          <div style={{ marginTop: 18, padding: '14px 16px', background: '#ece3d2', borderRadius: 13 }}>
            <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 14, color: color.primary, marginBottom: 5 }}>Dica</div>
            <p style={{ fontSize: 12.5, lineHeight: 1.5, color: '#6b6353', margin: 0 }}>{TIPS[step]}</p>
          </div>
        </div>

        {/* CONTENT */}
        <div>
          {error && <div style={{ background: '#fdecea', color: '#b3261e', padding: 12, borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 17, color: color.primary, marginBottom: 6 }}>Passo {step + 1} de 4</div>

          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />

          {step === 0 && (
            <>
              <H1>O que você está vendendo?</H1>
              <Lead>Escolha o tipo. No kit (kite + barra) você descreve as duas peças e decide se vende avulso.</Lead>
              <UpLabel>Tipo de anúncio</UpLabel>
              <div className="criar-cats" style={{ display: 'grid', gap: 10, marginBottom: 28 }}>
                <KindBtn on={kind === 'kite'} onClick={() => selectKind('kite')} title="Kite" desc="Só o kite" />
                <KindBtn on={kind === 'barra'} onClick={() => selectKind('barra')} title="Barra" desc="Só a barra" />
                <KindBtn on={kind === 'kit'} onClick={() => selectKind('kit')} title="Kite + Barra (kit)" desc="As duas peças no mesmo anúncio" />
              </div>

              {kind && (
                <>
                  <div className="criar-fields" style={{ display: 'grid', gap: '16px 18px' }}>
                    <Cell><Label>Marca</Label><select className="kl-select" value={brandId} onChange={(e) => { setBrandId(e.target.value); setModelId(''); }}><option value="">—</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Cell>
                    {kind !== 'barra' && <Cell><Label>Modelo</Label><select className="kl-select" value={modelId} onChange={(e) => setModelId(e.target.value)}><option value="">—</option>{(brand?.models ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Cell>}
                    {kind !== 'barra' && <Cell><Label>Ano</Label><select className="kl-select" value={year} onChange={(e) => setYear(e.target.value)}><option value="">—</option>{Array.from({ length: 12 }, (_, i) => 2025 - i).map((y) => <option key={y} value={y}>{y}</option>)}</select></Cell>}
                    {isKit && <SubHead style={{ gridColumn: '1 / -1' }}>Ficha do kite</SubHead>}
                    <Fields props={mainProps} required={mainRequired} values={attrs} onChange={(k, v) => setAttrs((a) => ({ ...a, [k]: v }))} />
                  </div>

                  {isKit && (
                    <div className="criar-fields" style={{ display: 'grid', gap: '16px 18px', marginTop: 22 }}>
                      <SubHead style={{ gridColumn: '1 / -1' }}>Ficha da barra</SubHead>
                      <Fields props={barraProps} required={barraRequired} values={barraAttrs} onChange={(k, v) => setBarraAttrs((a) => ({ ...a, [k]: v }))} />
                    </div>
                  )}

                  <div style={{ marginTop: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                      <Label>Título do anúncio</Label>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: color.primary, background: '#e8f1ec', padding: '3px 9px', borderRadius: 999 }}>
                        <span style={{ width: 7, height: 7, background: color.primary, transform: 'rotate(45deg)', borderRadius: 1 }} />Gerado automaticamente
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f3f1e9', border: '1.5px dashed #d8d0bd', borderRadius: 11, padding: '14px 15px', minHeight: 50 }}>
                      <span style={{ fontFamily: font.serif, fontSize: 16, fontWeight: 600, color: color.ink }}>{autoTitle || 'Preencha marca e ficha…'}</span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <H1>Fotos guiadas</H1>
              <Lead>Mínimo de 3 no total. {isKit ? 'No kit, envie fotos do kite E da barra (a barra precisa da própria foto pra aparecer na busca de barra).' : 'O GPS das imagens é removido automaticamente.'}</Lead>
              {showKitePhotos && <PhotoSection title={isKit ? 'Fotos do kite' : 'Fotos'} slots={KITE_SLOTS} photos={kitePhotos} uploading={uploading} onPick={() => pickPhotos('kite')} onRemove={removePhoto} />}
              {showBarraPhotos && <PhotoSection title={isKit ? 'Fotos da barra' : 'Fotos'} slots={BARRA_SLOTS} photos={barraPhotos} uploading={uploading} onPick={() => pickPhotos('barra')} onRemove={removePhoto} />}
              <div style={{ fontSize: 13, color: color.inkFaint, marginTop: 12 }}>{images.length} foto(s) · mínimo 3</div>
            </>
          )}

          {step === 2 && (
            <>
              <H1>Preço e entrega</H1>
              <Lead>{isKit ? 'Defina o preço do conjunto e, se quiser, o preço de cada peça avulsa.' : 'Como o comprador recebe define a forma de entrega.'}</Lead>

              {isKit ? (
                <div style={{ maxWidth: 620 }}>
                  <Label>Preço do conjunto (kite + barra) *</Label>
                  <PriceInput value={price} onChange={setPrice} />
                  <Helper>É por esse preço que você vende as duas peças juntas.</Helper>

                  <div style={{ marginTop: 22, display: 'grid', gap: 14 }}>
                    <Toggle on={sellKiteAlone} onClick={() => setSellKiteAlone((v) => !v)} title="Também vendo o kite separado" desc="Aparece na busca de kite com o preço avulso." />
                    {sellKiteAlone && <div style={{ paddingLeft: 4 }}><Label>Preço do kite sozinho *</Label><PriceInput value={kitePrice} onChange={setKitePrice} /></div>}
                    <Toggle on={sellBarraAlone} onClick={() => setSellBarraAlone((v) => !v)} title="Também vendo a barra separada" desc="Aí a barra também aparece na busca de barra." />
                    {sellBarraAlone && <div style={{ paddingLeft: 4 }}><Label>Preço da barra sozinha *</Label><PriceInput value={barraPrice} onChange={setBarraPrice} /></div>}
                  </div>
                  <Helper>Deixe as duas desmarcadas pra vender só o conjunto.</Helper>
                </div>
              ) : (
                <>
                  <Label>Preço</Label>
                  <div style={{ maxWidth: 260, marginBottom: 8 }}><PriceInput value={price} onChange={setPrice} /></div>
                </>
              )}

              <div style={{ marginTop: 26 }}>
                <Label>Forma de entrega</Label>
                <div className="criar-delivery" style={{ display: 'grid', gap: 14, maxWidth: 620, marginTop: 4 }}>
                  <DeliveryOpt on={!shippable} onClick={() => setShippable(false)} title="Retirada local" desc="Encontro em Cumbuco. Combina com o vendedor." />
                  <DeliveryOpt on={shippable} onClick={() => setShippable(true)} title="Enviável" desc="Manda pelos Correios. Ideal pra acessórios." />
                </div>
              </div>
              <div className="criar-loc" style={{ marginTop: 24, display: 'grid', gap: 18, maxWidth: 620 }}>
                <Cell><Label>Cidade</Label><input className="kl-input" value={city} onChange={(e) => setCity(e.target.value)} /></Cell>
                <Cell><Label>Spot (opcional)</Label><input className="kl-input" value={spot} onChange={(e) => setSpot(e.target.value)} /></Cell>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <H1>Revisão</H1>
              <Lead>É assim que seu anúncio vai aparecer.</Lead>
              <div style={{ maxWidth: 320, background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ position: 'relative', height: 196, backgroundImage: images[0] ? `url("${images[0].thumbUrl ?? images[0].url}")` : 'repeating-linear-gradient(135deg,#e3ece5 0px,#e3ece5 13px,#d8e4dc 13px,#d8e4dc 26px)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                  {attrs.size_m2 && <div style={{ position: 'absolute', top: 13, left: 13, background: 'rgba(20,72,62,0.92)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }}>{attrs.size_m2} m²</div>}
                  {isKit && <div style={{ position: 'absolute', top: 13, right: 13, background: color.gold, color: color.primaryDeep, fontSize: 11.5, fontWeight: 800, padding: '5px 11px', borderRadius: 999 }}>+ Barra</div>}
                </div>
                <div style={{ padding: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: color.inkFaint2, marginBottom: 5 }}>{brand?.name}{year ? ` · ${year}` : ''}</div>
                  <div style={{ fontFamily: font.serif, fontSize: 21, fontWeight: 600, marginBottom: 12 }}>{autoTitle || mainCat?.namePt}</div>
                  <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-0.5px' }}>{price ? Number(price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ —'}</div>
                  {isKit && (sellKiteAlone || sellBarraAlone) && (
                    <div style={{ fontSize: 12.5, color: color.inkMute, marginTop: 8, lineHeight: 1.5 }}>
                      {sellKiteAlone && <div>Kite avulso: {Number(kitePrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>}
                      {sellBarraAlone && <div>Barra avulsa: {Number(barraPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* erro também perto do botão de ação (no mobile o banner do topo fica fora de vista) */}
          {error && <div style={{ background: '#fdecea', color: '#b3261e', padding: 12, borderRadius: 10, fontSize: 13, marginTop: 24 }}>{error}</div>}

          {/* NAV */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 16, paddingTop: 24, borderTop: `1px solid ${color.line}` }}>
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} style={{ ...outline, opacity: step === 0 ? 0.4 : 1, pointerEvents: step === 0 ? 'none' : 'auto', border: 'none', cursor: 'pointer' }}>‹ Voltar</button>
            <button onClick={() => (step < 3 ? setStep((s) => s + 1) : publish())} disabled={!canNext} style={{ background: canNext ? color.primary : '#dfe3df', color: canNext ? '#fff' : color.inkFaint2, border: 'none', borderRadius: 12, padding: '15px 30px', fontFamily: font.sans, fontSize: 15, fontWeight: 700, cursor: canNext ? 'pointer' : 'not-allowed' }}>
              {step === 3 ? 'Publicar anúncio' : 'Continuar'}
            </button>
          </div>
        </div>
      </div>
    </Shell>
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
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', color: color.ink }}>
            <span style={{ width: 17, height: 17, background: color.primary, transform: 'rotate(45deg)', borderRadius: 3 }} />
            <span style={{ fontWeight: 900, fontSize: 21, letterSpacing: '-0.5px', textTransform: 'uppercase' }}>Kite <span style={{ color: color.primary }}>Life</span></span>
          </a>
          <span style={{ fontSize: 14, fontWeight: 600, color: color.inkMute }}>Criar anúncio</span>
          <a href="/" style={{ fontSize: 13.5, color: color.inkFaint, textDecoration: 'none' }}>Salvar e sair</a>
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
