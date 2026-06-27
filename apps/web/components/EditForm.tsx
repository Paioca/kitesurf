'use client';

// Edição de anúncio — campos pré-preenchidos. Não muda tipo/categoria (kite vs kit);
// edita ficha, fotos (add/remove), preços e entrega. Salva via PATCH.
import { useEffect, useMemo, useRef, useState } from 'react';
import { color, font } from '../lib/tokens';
import { downscaleImage } from '../lib/resizeImage';
import { SearchSelect } from './SearchSelect';
import type { Brand } from '../lib/api';

type Img = { url: string; thumbUrl?: string | null; component?: 'kite' | 'barra' | null };
type Spec = { type: string; enum?: (string | number)[]; label?: string };
type Schema = { required?: string[]; properties?: Record<string, Spec> };
const CONDITION_LABEL: Record<string, string> = { novo: 'Novo', seminovo: 'Seminovo', bom: 'Bom estado', usado: 'Usado', com_reparos: 'Com reparos' };
const MIN_PRICE = 100; // R$100 (MIN_LISTING_PRICE_CENTS = 10000) — espelha a criação e o backend

// Ficha completa = todos os campos do schema preenchidos (mesma regra do cadastro,
// que valida com requireAll). Sem isto a edição podia salvar esvaziando um atributo
// essencial (ex.: tamanho/condição) e o anúncio sumia dos filtros.
function fichaComplete(schema: Schema, values: Record<string, any>): boolean {
  const props = schema?.properties ?? {};
  return Object.keys(props).every((k) => {
    const v = values[k];
    return v !== undefined && v !== null && String(v).trim() !== '';
  });
}

export function EditForm({ data, mainSchema, barraSchema }: { data: any; mainSchema: Schema; barraSchema: Schema | null }) {
  const isKit = !!data.hasBarra;
  const [title, setTitle] = useState<string>(data.title ?? '');
  const [attrs, setAttrs] = useState<Record<string, any>>(data.attributes ?? {});
  const [barraAttrs, setBarraAttrs] = useState<Record<string, any>>(data.barraAttributes ?? {});
  const [year, setYear] = useState<string>(data.year != null ? String(data.year) : '');
  const [barraBrandId, setBarraBrandId] = useState<string>(data.barraBrandId ?? '');
  const [barraModelId, setBarraModelId] = useState<string>(data.barraModelId ?? '');
  const [barraYear, setBarraYear] = useState<string>(data.barraYear != null ? String(data.barraYear) : '');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [images, setImages] = useState<Img[]>(data.images ?? []);
  const [price, setPrice] = useState<string>(String(Math.round((data.price ?? 0) / 100)));
  const [sellKite, setSellKite] = useState<boolean>(data.kitePrice != null);
  const [sellBarra, setSellBarra] = useState<boolean>(data.barraPrice != null);
  const [kitePrice, setKitePrice] = useState<string>(data.kitePrice != null ? String(Math.round(data.kitePrice / 100)) : '');
  const [barraPrice, setBarraPrice] = useState<string>(data.barraPrice != null ? String(Math.round(data.barraPrice / 100)) : '');
  const [city, setCity] = useState<string>(data.city ?? '');
  const [spot, setSpot] = useState<string>(data.spot ?? '');
  const [shippable, setShippable] = useState<boolean>(!!data.shippable);
  const [uploadTarget, setUploadTarget] = useState<'kite' | 'barra'>('kite');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const kitePhotos = images.filter((i) => (i.component ?? 'kite') === 'kite' || !isKit);
  const barraPhotos = images.filter((i) => i.component === 'barra');
  const barraBrand = useMemo(() => brands.find((b) => b.id === barraBrandId), [brands, barraBrandId]);
  const barraBrandOpts = useMemo(() => brands.filter((b) => b.models.some((m) => m.categoryId === data.barraCategoryId)).map((b) => ({ value: b.id, label: b.name })), [brands, data.barraCategoryId]);
  const barraModels = useMemo(() => (barraBrand?.models ?? []).filter((m) => m.categoryId === data.barraCategoryId), [barraBrand, data.barraCategoryId]);
  const barraModelOpts = useMemo(() => barraModels.map((m) => ({ value: m.id, label: m.name })), [barraModels]);
  const yearOpts = useMemo(() => Array.from({ length: 16 }, (_, i) => String(2027 - i)), []);

  useEffect(() => {
    if (!isKit) return;
    fetch('/api/catalog/brands').then((r) => r.json()).then(setBrands).catch(() => {});
  }, [isKit]);

  function pick(target: 'kite' | 'barra') { setUploadTarget(target); fileRef.current?.click(); }
  function removePhoto(img: Img) { setImages((imgs) => imgs.filter((i) => i.url !== img.url)); }
  async function upload(files: FileList | null) {
    if (!files) return;
    const component = isKit ? uploadTarget : 'kite';
    setUploading(true); setError('');
    try {
      for (const file of Array.from(files).slice(0, 40 - images.length)) {
        const small = await downscaleImage(file, 1600);
        const fd = new FormData(); fd.append('file', small);
        const res = await fetch('/api/uploads/image', { method: 'POST', body: fd });
        const d = await res.json();
        if (!res.ok) throw new Error(d.message ?? 'Falha no upload.');
        setImages((imgs) => [...imgs, { url: d.url, thumbUrl: d.thumbUrl, component }]);
      }
    } catch (e: any) { setError(e.message); } finally { setUploading(false); }
  }

  async function save() {
    setSaving(true); setError('');
    try {
      const body: any = {
        title, price: Math.round(Number(price) * 100),
        year: year ? Number(year) : null,
        city, spot: spot || null, shippable, attributes: attrs, images,
      };
      if (isKit) {
        body.kitePrice = sellKite ? Math.round(Number(kitePrice) * 100) : null;
        body.barraPrice = sellBarra ? Math.round(Number(barraPrice) * 100) : null;
        body.barraAttributes = barraAttrs;
        if (barraYear) body.barraYear = Number(barraYear);
        if (barraBrandId) body.barraBrandId = barraBrandId;
        if (barraModelId) body.barraModelId = barraModelId;
      }
      const res = await fetch(`/api/listings/${data.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Erro ao salvar.');
      window.location.href = `/anuncio/${data.id}`;
    } catch (e: any) { setError(e.message); setSaving(false); }
  }

  // Preço mínimo R$100 validado inline (antes só o backend reclamava, tarde, após o PATCH).
  const priceErr =
    price !== '' && Number(price) < MIN_PRICE ? 'O preço mínimo é R$100.'
    : sellKite && kitePrice !== '' && Number(kitePrice) < MIN_PRICE ? 'O preço do kite avulso mínimo é R$100.'
    : sellBarra && barraPrice !== '' && Number(barraPrice) < MIN_PRICE ? 'O preço da barra avulsa mínimo é R$100.'
    : '';
  const priceOk = Number(price) >= MIN_PRICE && (!sellKite || Number(kitePrice) >= MIN_PRICE) && (!sellBarra || Number(barraPrice) >= MIN_PRICE);
  const fichaOk = fichaComplete(mainSchema, attrs) && (!isKit || !barraSchema || fichaComplete(barraSchema, barraAttrs));
  const barraCatalogOk = !isKit || !barraBrandId || (barraModels.length === 0 || !!barraModelId);
  const canSave = title.trim().length >= 4 && images.length >= 3 && priceOk && fichaOk && barraCatalogOk && !saving && !uploading;

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <h1 style={{ fontFamily: font.serif, fontSize: 30, fontWeight: 600, letterSpacing: '-0.4px', margin: '0 0 20px' }}>Editar anúncio</h1>
      {error && <div style={{ background: '#fdecea', color: '#b3261e', padding: 12, borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />

      <Section title="Título">
        <input className="kl-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Section>

      <Section title={isKit ? 'Ano do kite' : 'Ano'}>
        <CompactSelect options={yearOpts} value={year} onChange={setYear} placeholder="Selecione o ano" />
      </Section>

      <Section title={isKit ? 'Ficha do kite' : 'Ficha'}>
        <Fields schema={mainSchema} values={attrs} onChange={(k, v) => setAttrs((a) => ({ ...a, [k]: v }))} />
      </Section>
      {isKit && barraSchema && (
        <Section title="Barra">
          <div style={{ display: 'grid', gap: 14, marginBottom: 14 }}>
            <div>
              <Label>Marca da barra</Label>
              <SearchSelect value={barraBrandId} options={barraBrandOpts} placeholder="Selecione a marca da barra" onChange={(v) => { setBarraBrandId(v); setBarraModelId(''); }} />
            </div>
            <div>
              <Label>Modelo da barra{barraModels.length > 0 ? ' *' : ''}</Label>
              <SearchSelect value={barraModelId} options={barraModelOpts} placeholder={!barraBrandId ? 'Escolha a marca primeiro' : barraModels.length === 0 ? 'Sem modelos para esta marca' : 'Selecione'} onChange={setBarraModelId} disabled={!barraBrandId || barraModels.length === 0} />
            </div>
            <div>
              <Label>Ano da barra</Label>
              <CompactSelect options={yearOpts} value={barraYear} onChange={setBarraYear} placeholder="Selecione o ano da barra" />
            </div>
          </div>
          <Fields schema={barraSchema} values={barraAttrs} onChange={(k, v) => setBarraAttrs((a) => ({ ...a, [k]: v }))} />
        </Section>
      )}

      <Section title={isKit ? 'Fotos do kite' : 'Fotos'}>
        <PhotoRow photos={kitePhotos} onAdd={() => pick('kite')} onRemove={removePhoto} uploading={uploading} />
      </Section>
      {isKit && (
        <Section title="Fotos da barra">
          <PhotoRow photos={barraPhotos} onAdd={() => pick('barra')} onRemove={removePhoto} uploading={uploading} />
        </Section>
      )}

      <Section title="Preço">
        {isKit ? (
          <>
            <Label>Conjunto (kite + barra)</Label>
            <PriceInput value={price} onChange={setPrice} />
            <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
              <Toggle on={sellKite} onClick={() => setSellKite((v) => !v)} label="Vendo o kite separado" />
              {sellKite && <div><Label>Preço do kite avulso</Label><PriceInput value={kitePrice} onChange={setKitePrice} /></div>}
              <Toggle on={sellBarra} onClick={() => setSellBarra((v) => !v)} label="Vendo a barra separada" />
              {sellBarra && <div><Label>Preço da barra avulsa</Label><PriceInput value={barraPrice} onChange={setBarraPrice} /></div>}
            </div>
          </>
        ) : (
          <PriceInput value={price} onChange={setPrice} />
        )}
        {priceErr && <div style={{ color: '#b3261e', fontSize: 12.5, marginTop: 10 }}>{priceErr}</div>}
      </Section>

      <Section title="Entrega e local">
        <div style={{ display: 'grid', gap: 12 }}>
          <Toggle on={!shippable} onClick={() => setShippable(false)} label="Retirada local" />
          <Toggle on={shippable} onClick={() => setShippable(true)} label="Enviável" />
        </div>
        <div style={{ display: 'grid', gap: 14, marginTop: 14 }}>
          <div><Label>Cidade</Label><input className="kl-input" value={city} onChange={(e) => setCity(e.target.value)} /></div>
          <div><Label>Spot (opcional)</Label><input className="kl-input" value={spot} onChange={(e) => setSpot(e.target.value)} /></div>
        </div>
      </Section>

      {!fichaOk && title.trim().length >= 4 && images.length >= 3 && priceOk && (
        <div style={{ color: '#8a6d00', background: '#fdf6e3', fontSize: 12.5, padding: '9px 12px', borderRadius: 9, marginTop: 4 }}>
          Preencha todos os campos da ficha antes de salvar. Campos vazios fazem o anúncio sumir dos filtros de busca.
        </div>
      )}
      {!barraCatalogOk && (
        <div style={{ color: '#8a6d00', background: '#fdf6e3', fontSize: 12.5, padding: '9px 12px', borderRadius: 9, marginTop: 4 }}>
          Se escolher a marca da barra, selecione também o modelo.
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
        <a href={`/anuncio/${data.id}`} style={{ ...btn, background: '#fff', border: `1.5px solid ${color.lineCard}`, color: color.ink }}>Cancelar</a>
        <button onClick={save} disabled={!canSave} style={{ ...btn, background: canSave ? color.primary : '#dfe3df', color: canSave ? '#fff' : color.inkFaint2, border: 'none', cursor: canSave ? 'pointer' : 'not-allowed', flex: 1 }}>
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  );
}

function Fields({ schema, values, onChange }: { schema: Schema; values: Record<string, any>; onChange: (k: string, v: any) => void }) {
  const props = schema?.properties ?? {};
  const required = schema?.required ?? [];
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {Object.entries(props).map(([key, spec]) => (
        <div key={key}>
          <Label>{(spec.label ?? key)}{required.includes(key) ? ' *' : ''}</Label>
          {spec.enum && (spec.type === 'number' || spec.type === 'integer') ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {spec.enum.map((o) => {
                const on = String(values[key]) === String(o);
                return <button key={String(o)} onClick={() => onChange(key, String(o))} style={{ fontFamily: font.sans, fontSize: 14.5, fontWeight: 600, padding: '9px 16px', borderRadius: 999, cursor: 'pointer', background: on ? color.primary : '#fff', color: on ? '#fff' : color.ink, border: `1.5px solid ${on ? color.primary : color.lineCard}` }}>{String(o)}</button>;
              })}
            </div>
          ) : spec.enum ? (
            <select className="kl-select" value={values[key] ?? ''} onChange={(e) => onChange(key, e.target.value)}>
              <option value="">Selecione</option>
              {spec.enum.map((o) => <option key={String(o)} value={String(o)}>{CONDITION_LABEL[String(o)] ?? String(o)}</option>)}
            </select>
          ) : spec.type === 'boolean' ? (
            <select className="kl-select" value={String(!!values[key])} onChange={(e) => onChange(key, e.target.value === 'true')}><option value="false">Não</option><option value="true">Sim</option></select>
          ) : spec.type === 'number' ? (
            <input className="kl-input" type="text" inputMode="decimal" value={values[key] ?? ''} placeholder="Ex.: 9 ou 8.1" onChange={(e) => onChange(key, e.target.value)} />
          ) : (
            <input className="kl-input" type={spec.type === 'integer' ? 'number' : 'text'} value={values[key] ?? ''} onChange={(e) => onChange(key, e.target.value)} />
          )}
        </div>
      ))}
    </div>
  );
}

function PhotoRow({ photos, onAdd, onRemove, uploading }: { photos: Img[]; onAdd: () => void; onRemove: (i: Img) => void; uploading: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {photos.map((img) => (
        <div key={img.url} style={{ position: 'relative', width: 92, height: 92, borderRadius: 12, backgroundImage: `url("${img.thumbUrl ?? img.url}")`, backgroundSize: 'cover', backgroundPosition: 'center', border: `1.5px solid ${color.primary}` }}>
          <span role="button" aria-label="Remover" onClick={() => onRemove(img)} style={{ position: 'absolute', top: 5, left: 5, width: 24, height: 24, borderRadius: 999, background: 'rgba(20,20,20,0.6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, cursor: 'pointer' }}>✕</span>
        </div>
      ))}
      <button onClick={onAdd} style={{ width: 92, height: 92, borderRadius: 12, border: '1.5px dashed #cbc3b2', background: '#fbfaf6', color: '#bcccc4', fontSize: 26, cursor: 'pointer' }}>{uploading ? '…' : '+'}</button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: font.serif, fontSize: 18, fontWeight: 600, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) { return <label style={{ fontSize: 13, fontWeight: 600, color: color.inkSoft, display: 'block', marginBottom: 7 }}>{children}</label>; }
function CompactSelect({ options, value, onChange, placeholder }: { options: string[]; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <select className="kl-select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
// value = dígitos (reais inteiros). Display formatado; sem type=number (bug do separador).
function PriceInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const display = value ? Number(value).toLocaleString('pt-BR') : '';
  return (
    <div style={{ position: 'relative', maxWidth: 260 }}>
      <span style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', fontSize: 15, fontWeight: 700, color: color.inkFaint }}>R$</span>
      <input className="kl-input" type="text" inputMode="numeric" value={display} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} placeholder="0" style={{ paddingLeft: 42, fontWeight: 700, fontSize: 17 }} />
    </div>
  );
}
function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 11, textAlign: 'left', cursor: 'pointer', background: '#fff', border: on ? `2px solid ${color.primary}` : '1.5px solid #e0d9c9', borderRadius: 12, padding: '12px 15px' }}>
      <span style={{ width: 20, height: 20, borderRadius: 6, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? color.primary : '#fff', border: `1.5px solid ${on ? color.primary : '#cbc3b2'}` }}>{on && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}</span>
      <span style={{ fontSize: 14.5, fontWeight: 600, color: color.ink }}>{label}</span>
    </button>
  );
}
const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, padding: '14px 24px', borderRadius: 12, textDecoration: 'none' };
