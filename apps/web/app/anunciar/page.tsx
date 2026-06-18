'use client';

import { useEffect, useMemo, useState } from 'react';
import { API, type Brand, type Category } from '../../lib/api';

const CONDITION_LABEL: Record<string, string> = {
  novo: 'Novo',
  seminovo: 'Seminovo',
  bom: 'Bom',
  usado: 'Usado',
  com_reparos: 'Com reparos',
};

export default function AnunciarPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [year, setYear] = useState('');
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('Cumbuco');
  const [spot, setSpot] = useState('');
  const [shippable, setShippable] = useState(false);
  const [images, setImages] = useState<{ url: string; thumbUrl?: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [createdId, setCreatedId] = useState('');

  useEffect(() => {
    fetch(`${API}/api/catalog/categories`).then((r) => r.json()).then(setCategories).catch(() => {});
    fetch(`${API}/api/catalog/brands`).then((r) => r.json()).then(setBrands).catch(() => {});
  }, []);

  const category = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
  );
  const brand = useMemo(() => brands.find((b) => b.id === brandId), [brands, brandId]);

  function setAttr(key: string, value: any) {
    setAttributes((a) => ({ ...a, [key]: value }));
  }

  async function uploadFiles(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    setError('');
    try {
      for (const file of Array.from(files).slice(0, 20 - images.length)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`${API}/api/uploads/image`, {
          method: 'POST',
          // cookie de sessão vai junto (mesma origem)
          body: fd,
        });
        if (!res.ok) throw new Error('Falha no upload. Você está logado?');
        const data = await res.json();
        setImages((imgs) => [...imgs, { url: data.url, thumbUrl: data.thumbUrl }]);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setError('');
    if (images.length < 3) return setError('Envie pelo menos 3 fotos.');
    try {
      const res = await fetch(`${API}/api/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          brandId: brandId || undefined,
          modelId: modelId || undefined,
          year: year ? Number(year) : undefined,
          attributes,
          title,
          description: description || undefined,
          price: Math.round(Number(price) * 100),
          city,
          spot: spot || undefined,
          shippable,
          images,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erro ao publicar.');
      setCreatedId(data.id);
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (createdId) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-lg font-semibold text-ocean-700">✅ Anúncio publicado!</p>
        <a href={`/anuncio/${createdId}`} className="mt-3 inline-block text-ocean-600 underline">
          Ver anúncio
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-bold text-ocean-700">Novo anúncio</h1>
      <p className="text-xs text-ocean-900/50">
        Precisa estar logado. Taxonomia controlada = anúncio comparável.
      </p>
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Field label="Categoria">
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setAttributes({});
          }}
          className={inp}
        >
          <option value="">Selecione</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.namePt}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-3 gap-2">
        <Field label="Marca">
          <select value={brandId} onChange={(e) => { setBrandId(e.target.value); setModelId(''); }} className={inp}>
            <option value="">—</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Modelo">
          <select value={modelId} onChange={(e) => setModelId(e.target.value)} className={inp}>
            <option value="">—</option>
            {(brand?.models ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Ano">
          <input value={year} onChange={(e) => setYear(e.target.value)} className={inp} placeholder="2023" />
        </Field>
      </div>

      {/* Atributos dinâmicos da categoria */}
      {category && (
        <div className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-ocean-900/50">
            Atributos de {category.namePt}
          </p>
          {Object.entries(category.attributeSchema.properties ?? {}).map(([key, spec]) => {
            const required = category.attributeSchema.required?.includes(key);
            return (
              <Field key={key} label={(spec.label ?? key) + (required ? ' *' : '')}>
                {spec.enum ? (
                  <select value={attributes[key] ?? ''} onChange={(e) => setAttr(key, e.target.value)} className={inp}>
                    <option value="">—</option>
                    {spec.enum.map((opt) => (
                      <option key={String(opt)} value={String(opt)}>
                        {CONDITION_LABEL[String(opt)] ?? String(opt)}
                      </option>
                    ))}
                  </select>
                ) : spec.type === 'boolean' ? (
                  <input type="checkbox" checked={!!attributes[key]} onChange={(e) => setAttr(key, e.target.checked)} />
                ) : (
                  <input
                    type={spec.type === 'number' || spec.type === 'integer' ? 'number' : 'text'}
                    value={attributes[key] ?? ''}
                    onChange={(e) => setAttr(key, e.target.value)}
                    className={inp}
                  />
                )}
              </Field>
            );
          })}
        </div>
      )}

      <Field label="Título">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inp} />
      </Field>
      <Field label="Descrição (opcional)">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inp} rows={3} />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Preço (R$)">
          <input value={price} onChange={(e) => setPrice(e.target.value)} className={inp} placeholder="1500" />
        </Field>
        <Field label="Cidade">
          <input value={city} onChange={(e) => setCity(e.target.value)} className={inp} />
        </Field>
      </div>
      <Field label="Spot (opcional)">
        <input value={spot} onChange={(e) => setSpot(e.target.value)} className={inp} />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={shippable} onChange={(e) => setShippable(e.target.checked)} />
        É enviável (entra no fluxo de pagamento online + escrow)
      </label>

      {/* Fotos guiadas */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold text-ocean-900/50">
          Fotos guiadas (mín 3, máx 20) — completo, extremidades, reparos, válvulas
        </p>
        <p className="mb-2 text-[11px] text-ocean-900/40">
          EXIF/GPS é removido no upload (protege sua localização).
        </p>
        <div className="mb-2 grid grid-cols-4 gap-2">
          {images.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={img.url} src={img.thumbUrl ?? img.url} alt="" className="aspect-square rounded-lg object-cover" />
          ))}
        </div>
        <input type="file" accept="image/*" multiple onChange={(e) => uploadFiles(e.target.files)} disabled={uploading} />
        {uploading && <p className="text-xs text-ocean-900/50">Enviando...</p>}
      </div>

      <button onClick={submit} className="w-full rounded-lg bg-ocean-600 py-3 font-semibold text-white">
        Publicar anúncio
      </button>
    </div>
  );
}

const inp = 'w-full rounded-lg border border-ocean-100 px-3 py-2 text-sm outline-none focus:border-ocean-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ocean-900/60">{label}</span>
      {children}
    </label>
  );
}
