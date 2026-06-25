'use client';

// Criar anúncio — wizard, design Kitetropos (Design Book v2). MVP: Kite, Barra ou Kite+Barra (kit).
// Kit = anúncio de kite com hasBarra: seções de ficha/fotos por peça + 3 preços
// (conjunto / kite avulso / barra avulsa). Cookie auth. Fase 0 sem escrow.
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { color, font } from '../../lib/tokens';
import { downscaleImage } from '../../lib/resizeImage';
import type { Brand, Category } from '../../lib/api';
import { MobileAppBar } from '../../components/MobileChrome';
import { Logo, Diamond } from '../../components/ui';
import { SearchSelect } from '../../components/SearchSelect';

// Rótulos das opções de enum da ficha (condição do kite/barra, bladder, mangueiras).
const CONDITION_LABEL: Record<string, string> = {
  // condição do kite (tecido)
  novo_lacrado: 'Novo (lacrado)',
  novo_10x: 'Usado menos de 10 vezes',
  semi_otimo: 'Seminovo (tecido em ótimo estado)',
  semi_desgaste: 'Seminovo (tecido com início de desgaste)',
  usado_desgaste: 'Usado (tecido com bastante desgaste)',
  // condição da barra
  novo: 'Novo', seminovo: 'Seminovo', bom: 'Bom estado', usado: 'Usado',
  // bladder + mangueiras
  zero: 'Zero', microfuro_adesivado: 'Microfuro adesivado',
  original: 'Original', ja_trocadas: 'Já trocadas',
};
const SPOTS = ['Cumbuco', 'Taíba', 'Fortaleza', 'Praia do Futuro', 'Paracuru', 'Ilha do Guajiru', 'Preá'];
const KITE_SLOTS = ['Foto geral do kite', 'Outro ângulo', 'Detalhe da marca', 'Etiqueta / tamanho', 'Válvulas e bordas', 'Reparos (se houver)'];
const BARRA_SLOTS = ['Foto geral da barra', 'Linhas', 'Detalhe / chicken loop', 'Desgaste (se houver)'];
const DRAFT_KEY = 'vaya:anunciar-draft';

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
  const [city, setCity] = useState('Cumbuco'); // spot principal (lista)
  const [spot, setSpot] = useState(''); // ponto específico opcional
  const [pickup, setPickup] = useState(true); // retirada no local
  const [shippable, setShippable] = useState(false); // envio
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [uploadPct, setUploadPct] = useState(0); // % média de bytes do lote em voo
  const [uploadTarget, setUploadTarget] = useState<'kite' | 'barra'>('kite');
  const [error, setError] = useState('');
  const [createdId, setCreatedId] = useState('');
  const [publishing, setPublishing] = useState(false); // trava anti duplo-clique no Publicar
  const [step, setStep] = useState(0); // wizard: 0 tipo&ficha · 1 fotos · 2 preço&entrega · 3 revisão
  const [restored, setRestored] = useState(false); // rascunho recuperado
  const [detailOpen, setDetailOpen] = useState(false); // seção "Estado detalhado" colapsável (auditoria #02)
  const fileRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((u) => setAuthed(!!(u && u.id))).catch(() => setAuthed(false));
    fetch('/api/catalog/categories').then((r) => r.json()).then(setCategories).catch(() => {});
    fetch('/api/catalog/brands').then((r) => r.json()).then(setBrands).catch(() => {});
  }, []);

  // --- rascunho/autosave (localStorage): não perde o anúncio meio-preenchido ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.kind) {
          setKind(d.kind); setBrandId(d.brandId ?? ''); setModelId(d.modelId ?? ''); setYear(d.year ?? '');
          setAttrs(d.attrs ?? {}); setBarraAttrs(d.barraAttrs ?? {}); setImages(d.images ?? []);
          setPrice(d.price ?? ''); setSellKiteAlone(!!d.sellKiteAlone); setSellBarraAlone(!!d.sellBarraAlone);
          setKitePrice(d.kitePrice ?? ''); setBarraPrice(d.barraPrice ?? '');
          setCity(d.city ?? 'Cumbuco'); setSpot(d.spot ?? ''); setPickup(d.pickup !== false); setShippable(!!d.shippable);
          setStep(typeof d.step === 'number' ? d.step : 0);
          setRestored(true);
        }
      }
    } catch {}
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current || !kind) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ kind, brandId, modelId, year, attrs, barraAttrs, images, price, sellKiteAlone, sellBarraAlone, kitePrice, barraPrice, city, spot, pickup, shippable, step }));
    } catch {}
  }, [kind, brandId, modelId, year, attrs, barraAttrs, images, price, sellKiteAlone, sellBarraAlone, kitePrice, barraPrice, city, spot, pickup, shippable, step]);

  useEffect(() => { if (createdId) { try { localStorage.removeItem(DRAFT_KEY); } catch {} } }, [createdId]);

  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch {} window.location.reload(); }

  const kiteCat = useMemo(() => categories.find((c) => c.slug === 'kite'), [categories]);
  const barraCat = useMemo(() => categories.find((c) => c.slug === 'barra'), [categories]);
  const brand = useMemo(() => brands.find((b) => b.id === brandId), [brands, brandId]);

  const isKit = kind === 'kit';
  const mainCat = kind === 'barra' ? barraCat : kiteCat; // categoria primária enviada
  const mainProps = mainCat?.attributeSchema?.properties ?? {};
  const barraProps = barraCat?.attributeSchema?.properties ?? {};
  // Essencial = campos `required` do schema; o resto vai pro "Estado detalhado" colapsável (auditoria #02).
  const pickProps = (props: Record<string, any>, keys: string[], want: boolean) =>
    Object.fromEntries(Object.entries(props).filter(([k]) => keys.includes(k) === want));
  const mainReq: string[] = (mainCat?.attributeSchema as any)?.required ?? [];
  const barraReq: string[] = (barraCat?.attributeSchema as any)?.required ?? [];
  const mainEss = pickProps(mainProps, mainReq, true);
  const mainDet = pickProps(mainProps, mainReq, false);
  const barraEss = pickProps(barraProps, barraReq, true);
  const barraDet = pickProps(barraProps, barraReq, false);
  const hasDetail = Object.keys(mainDet).length > 0 || (kind === 'kit' && Object.keys(barraDet).length > 0);
  const brandOpts = useMemo(() => brands.map((b) => ({ value: b.id, label: b.name })), [brands]);
  const modelOpts = useMemo(() => (brand?.models ?? []).map((m) => ({ value: m.id, label: m.name })), [brand]);
  const yearOpts = useMemo(() => Array.from({ length: 16 }, (_, i) => String(2027 - i)), []);
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
    const list = Array.from(files).slice(0, 40 - images.length);
    const total = list.length;
    const fracs = new Array(total).fill(0); // progresso de bytes (0..1) por foto do lote
    let done = 0;
    setUploadCount({ done: 0, total }); setUploadPct(0);
    const CONCURRENCY = 3; // fila com concorrência limitada: rápido em rede móvel sem afogar o servidor
    const uploadOne = async (file: File, idx: number) => {
      const small = await downscaleImage(file, 1600); // reduz no cliente: upload rápido, sem estourar 4,5MB
      // XHR (não fetch) porque só ele expõe upload.onprogress: no 4G a foto demora
      // segundos e sem barra o usuário acha que travou e reclica/abandona.
      const data = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/uploads/image');
        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable) return;
          fracs[idx] = e.loaded / e.total;
          setUploadPct(Math.round((fracs.reduce((a, b) => a + b, 0) / total) * 100));
        };
        xhr.onload = () => {
          let body: any = {};
          try { body = JSON.parse(xhr.responseText); } catch {}
          if (xhr.status >= 200 && xhr.status < 300) resolve(body);
          else reject(new Error(body.message ?? 'Falha no upload.'));
        };
        xhr.onerror = () => reject(new Error('Falha de rede no upload.'));
        const fd = new FormData(); fd.append('file', small);
        xhr.send(fd);
      });
      fracs[idx] = 1;
      done += 1;
      setUploadCount({ done, total });
      setUploadPct(Math.round((fracs.reduce((a, b) => a + b, 0) / total) * 100));
      setImages((imgs) => [...imgs, { url: data.url, thumbUrl: data.thumbUrl, component }]);
    };
    try {
      for (let i = 0; i < list.length; i += CONCURRENCY) {
        await Promise.all(list.slice(i, i + CONCURRENCY).map((file, j) => uploadOne(file, i + j)));
      }
    } catch (e: any) { setError(e.message); } finally { setUploading(false); setUploadCount({ done: 0, total: 0 }); setUploadPct(0); }
  }

  // Fase 0: TODA a ficha é obrigatória (não só o que o schema marca como required),
  // além de marca, ano e modelo (modelo só quando a marca tem modelos cadastrados).
  const headOk = !!brandId && (kind === 'barra' || (!!year && ((brand?.models?.length ?? 0) === 0 || !!modelId)));
  // Erro de faixa dos campos numéricos (ex.: tamanho 3–20), client-side: bloqueia o
  // avanço de passo ANTES do publish — o erro não fica só na tela final.
  const numError = (props: Record<string, any>, vals: Record<string, any>): string => {
    for (const [k, spec] of Object.entries(props)) {
      if (spec?.type !== 'number') continue;
      const raw = vals[k];
      if (raw == null || raw === '') continue;
      const n = Number(String(raw).replace(',', '.'));
      const lbl = spec.label ?? k;
      if (Number.isNaN(n)) return `${lbl}: informe um número válido (use ponto, ex.: 8.1).`;
      if (spec.min != null && n < spec.min) return `${lbl}: mínimo ${spec.min}.`;
      if (spec.max != null && n > spec.max) return `${lbl}: máximo ${spec.max}.`;
    }
    return '';
  };
  const attrErr = numError(mainProps, attrs) || (isKit ? numError(barraProps, barraAttrs) : '');
  const fichaOk = !!kind && headOk && !attrErr
    && Object.keys(mainProps).every((k) => attrs[k] != null && attrs[k] !== '')
    && (isKit ? Object.keys(barraProps).every((k) => barraAttrs[k] != null && barraAttrs[k] !== '') : true);
  const photosOk = images.length >= 3 && (isKit ? kitePhotos.length >= 1 && barraPhotos.length >= 1 : true);
  // Preço mínimo R$100 — espelha MIN_LISTING_PRICE_CENTS (servidor). Erro na hora,
  // não só no publish: bloqueia o avanço e mostra inline no campo.
  const MIN_PRICE = 100;
  const priceErr = (v: string) => (v && Number(v) > 0 && Number(v) < MIN_PRICE ? `O preço mínimo é R$ ${MIN_PRICE}.` : '');
  const priceOk = Number(price) >= MIN_PRICE
    && (!sellKiteAlone || Number(kitePrice) >= MIN_PRICE)
    && (!sellBarraAlone || Number(barraPrice) >= MIN_PRICE);
  const priceMsg = priceErr(price) || (sellKiteAlone ? priceErr(kitePrice) : '') || (sellBarraAlone ? priceErr(barraPrice) : '') || (!priceOk ? 'Defina o preço' : '');
  const deliveryOk = pickup || shippable;
  const canPublish = !!kind && fichaOk && photosOk && priceOk && deliveryOk && !!city && !uploading && !publishing;
  const missing = !kind ? 'Escolha o tipo' : attrErr ? attrErr : !fichaOk ? 'Complete a ficha' : !photosOk ? `Faltam fotos (mín. 3${isKit ? ', uma do kite e uma da barra' : ''})` : !priceOk ? priceMsg : !city ? 'Escolha o spot' : !deliveryOk ? 'Escolha retirada e/ou envio' : '';

  // wizard: validade e mensagem por passo
  const RAIL = ['Tipo & ficha', 'Fotos guiadas', 'Preço & entrega', 'Revisão'];
  const TIPS = [
    'As listas padronizadas fazem a busca por tamanho funcionar. Informe furos e reparos para que o comprador saiba exatamente o que está avaliando.',
    'Fotos boas vendem. Mostre etiqueta, válvulas e qualquer reparo. Mínimo de 3.',
    'Sem pagamento na plataforma. Marque ao menos uma forma de entrega — retirada no spot ou envio.',
    'Tudo certo? Revise antes de publicar. Anúncios ativos ou pausados podem ser editados depois.',
  ];
  const stepValid = [!!kind && fichaOk, photosOk, priceOk && deliveryOk && !!city, canPublish];
  const stepMissing = [
    !kind ? 'Escolha o tipo' : attrErr ? attrErr : !fichaOk ? 'Complete a ficha' : '',
    !photosOk ? `Faltam fotos (mín. 3${isKit ? ', uma do kite e uma da barra' : ''})` : '',
    !priceOk ? priceMsg : !city ? 'Escolha o spot' : !deliveryOk ? 'Escolha retirada e/ou envio' : '',
    missing,
  ];
  const goNext = () => {
    if (step === 0 && !stepValid[0] && hasDetail) setDetailOpen(true); // revela os campos detalhados que faltam
    if (step < 3 && stepValid[step]) setStep(step + 1);
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  async function publish() {
    if (publishing) return; // guarda extra contra duplo-clique / Enter repetido
    setError('');
    setPublishing(true);
    try {
      const res = await fetch('/api/listings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: mainCat?.id, brandId: brandId || undefined, modelId: modelId || undefined,
          year: year ? Number(year) : undefined, attributes: attrs,
          title: autoTitle || mainCat?.namePt || 'Anúncio', price: Math.round(Number(price) * 100),
          city, spot: spot || undefined, pickup, shippable, images,
          hasBarra: isKit,
          kitePrice: isKit && sellKiteAlone ? Math.round(Number(kitePrice) * 100) : null,
          barraPrice: isKit && sellBarraAlone ? Math.round(Number(barraPrice) * 100) : null,
          barraAttributes: isKit ? barraAttrs : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erro ao publicar.');
      setCreatedId(data.id);
    } catch (e: any) { setError(e.message); } finally { setPublishing(false); }
  }

  if (authed === null) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '70px 0' }}>
          <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 18, color: color.primary, marginBottom: 10 }}>Carregando…</div>
          <p style={{ fontSize: 14, color: color.inkFaint2, margin: 0 }}>Preparando o formulário.</p>
        </div>
      </Shell>
    );
  }

  if (authed === false) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <h1 style={{ fontFamily: font.serif, fontSize: 30, fontWeight: 600, margin: '0 0 10px' }}>Entre pra anunciar</h1>
          <p style={{ fontSize: 15, color: color.inkMute, margin: '0 0 24px' }}>Anunciar exige conta com telefone verificado.</p>
          <Link href="/entrar?next=%2Fanunciar" style={primary}>Entrar ou criar conta</Link>
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
          <p style={{ fontSize: 15.5, color: color.inkMute, margin: '0 auto 26px', maxWidth: 400 }}>Já está no ar. Ofertas e pedidos de visita aparecem em Minhas negociações; as notificações dependem do canal disponível.</p>
          <div style={{ display: 'flex', gap: 11, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={`/anuncio/${createdId}`} style={primary}>Ver anúncio</a>
            <Link href="/" style={outline}>Voltar à busca</Link>
          </div>
        </div>
      </Shell>
    );
  }

  // ---- preview da revisão (passo 4) ----
  const previewBrand = brand?.name ?? '';
  const previewModel = kind === 'barra' ? `Barra${previewBrand ? ` ${previewBrand}` : ''}` : (brand?.models.find((m) => m.id === modelId)?.name || autoTitle || 'Seu anúncio');
  const previewCond = attrs.condition ? CONDITION_LABEL[attrs.condition] : null;
  const previewSize = kind === 'barra' ? (attrs.line_length_m ? `${attrs.line_length_m} m` : '—') : (attrs.size_m2 ? `${attrs.size_m2} m²` : '—');
  const previewDelivery = pickup && shippable ? 'Retirada · Envio' : shippable ? 'Envio' : 'Retirada';
  const previewPhoto = images[0]?.thumbUrl ?? images[0]?.url ?? null;
  const tipoLabel = kind === 'barra' ? 'Barra' : kind === 'kit' ? 'Kit' : 'Kite';

  return (
    <Shell>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
      {restored && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#e8f1ec', border: '1px solid #cfe3d9', borderRadius: 12, padding: '11px 15px', marginBottom: 20, fontSize: 13.5, color: color.ink }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: color.primary, flex: 'none' }} />
          <span>Rascunho recuperado — continue de onde parou.</span>
          <button onClick={clearDraft} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: color.primary, fontWeight: 700, cursor: 'pointer', fontFamily: font.sans, fontSize: 13.5 }}>Começar do zero</button>
        </div>
      )}
      <div className="criar-grid">
        {/* STEP RAIL (desktop) */}
        <div className="only-desktop" style={{ position: 'sticky', top: 24 }}>
          {RAIL.map((title, i) => {
            const done = i < step, active = i === step;
            const bg = done || active ? color.primary : '#ece6d8';
            const fg = done || active ? '#fff' : color.inkFaint2;
            return (
              <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 0' }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 700, background: bg, color: fg }}>{done ? '✓' : i + 1}</div>
                <div style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: active || done ? color.ink : color.inkFaint2 }}>{title}</div>
              </div>
            );
          })}
          <div style={{ marginTop: 18, padding: '14px 16px', background: '#ece3d2', borderRadius: 13 }}>
            <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 14, color: color.primary, marginBottom: 5 }}>Dica</div>
            <p style={{ fontSize: 12.5, lineHeight: 1.5, color: '#6b6353', margin: 0 }}>{TIPS[step]}</p>
          </div>
        </div>

        {/* STEP CONTENT */}
        <div className="criar-content">
          {/* progresso compacto (mobile) */}
          <div className="only-mobile" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
              {RAIL.map((t, i) => <div key={t} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= step ? color.primary : '#e6dfd0' }} />)}
            </div>
            <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 14, color: color.primary }}>Passo {step + 1} de 4 · {RAIL[step]}</div>
          </div>

          {/* PASSO 1 — TIPO & FICHA */}
          {step === 0 && (
            <>
              <StepHead n={1} title="O que você está vendendo?" lead="Tipo e ficha padronizada. Tudo sai de listas controladas — sem texto solto, sem descrição livre." />
              <UpLabel>Tipo</UpLabel>
              <div className="criar-tipos" style={{ marginBottom: 28 }}>
                <KindBtn on={kind === 'kite'} onClick={() => selectKind('kite')} title="Kite" desc="Só o kite" />
                <KindBtn on={kind === 'barra'} onClick={() => selectKind('barra')} title="Barra" desc="Só a barra" />
                <KindBtn on={kind === 'kit'} onClick={() => selectKind('kit')} title="Kite + Barra" desc="Conjunto" />
              </div>

              <div style={{ display: 'flex', gap: 13, background: '#fbeae4', border: '1.5px solid #f0c9bd', borderRadius: 14, padding: '16px 18px', margin: '0 0 28px' }}>
                <span style={{ width: 24, height: 24, borderRadius: 7, background: '#c0492f', color: '#fff', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>!</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#8f3826', marginBottom: 3 }}>Atenção — descreva fielmente</div>
                  <p style={{ fontSize: 13, lineHeight: 1.55, color: '#9a5040', margin: 0 }}>Informe furos, reparos, estado do bladder e troca de mangueiras. Informações incorretas podem remover o anúncio e restringir a conta.</p>
                </div>
              </div>

              {kind && (
                <>
                  {/* ESSENCIAL — sempre visível */}
                  <div className="criar-fields" style={{ display: 'grid', gap: '16px 18px' }}>
                    <Cell><Label>Marca *</Label><SearchSelect value={brandId} options={brandOpts} onChange={(v) => { setBrandId(v); setModelId(''); }} /></Cell>
                    {kind !== 'barra' && <Cell><Label>Modelo *</Label><SearchSelect value={modelId} options={modelOpts} placeholder={brandId ? '—' : 'Escolha a marca primeiro'} onChange={setModelId} disabled={!brandId} /></Cell>}
                    {kind !== 'barra' && <Cell style={{ gridColumn: '1 / -1' }}><Label>Ano *</Label><ChipSelect options={yearOpts} value={year} onChange={setYear} /></Cell>}
                    {isKit && <SubHead style={{ gridColumn: '1 / -1' }}>Kite</SubHead>}
                    <Fields props={mainEss} required={Object.keys(mainEss)} values={attrs} onChange={(k, v) => setAttrs((a) => ({ ...a, [k]: v }))} />
                  </div>
                  {isKit && Object.keys(barraEss).length > 0 && (
                    <div className="criar-fields" style={{ display: 'grid', gap: '16px 18px', marginTop: 22 }}>
                      <SubHead style={{ gridColumn: '1 / -1' }}>Barra</SubHead>
                      <Fields props={barraEss} required={Object.keys(barraEss)} values={barraAttrs} onChange={(k, v) => setBarraAttrs((a) => ({ ...a, [k]: v }))} />
                    </div>
                  )}

                  {/* ESTADO DETALHADO — colapsável (divulgação progressiva) */}
                  {hasDetail && (
                    <div style={{ marginTop: 22, border: `1px solid ${color.lineCard}`, borderRadius: 14, overflow: 'hidden' }}>
                      <button type="button" onClick={() => setDetailOpen((o) => !o)} aria-expanded={detailOpen} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#faf7f0', border: 'none', padding: '15px 16px', cursor: 'pointer', textAlign: 'left' }}>
                        <span>
                          <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: color.ink }}>Estado detalhado</span>
                          <span style={{ display: 'block', fontSize: 12.5, color: color.inkFaint2, marginTop: 2 }}>Furos, reparos, bladder e mangueiras — pra um anúncio honesto.</span>
                        </span>
                        <span aria-hidden="true" style={{ fontSize: 13, color: color.inkMute, flex: 'none', transform: detailOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
                      </button>
                      {detailOpen && (
                        <div style={{ padding: 16, borderTop: `1px solid ${color.line}` }}>
                          {Object.keys(mainDet).length > 0 && (
                            <>
                              {isKit && <SubHead>Kite</SubHead>}
                              <div className="criar-fields" style={{ display: 'grid', gap: '16px 18px', marginTop: isKit ? 12 : 0 }}>
                                <Fields props={mainDet} required={Object.keys(mainDet)} values={attrs} onChange={(k, v) => setAttrs((a) => ({ ...a, [k]: v }))} />
                              </div>
                            </>
                          )}
                          {isKit && Object.keys(barraDet).length > 0 && (
                            <>
                              <SubHead style={{ marginTop: 18 }}>Barra</SubHead>
                              <div className="criar-fields" style={{ display: 'grid', gap: '16px 18px', marginTop: 12 }}>
                                <Fields props={barraDet} required={Object.keys(barraDet)} values={barraAttrs} onChange={(k, v) => setBarraAttrs((a) => ({ ...a, [k]: v }))} />
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {autoTitle && (
                    <div style={{ marginTop: 22 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                        <Label>Título do anúncio</Label>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: color.primary, background: '#e8f1ec', padding: '3px 9px', borderRadius: 999 }}><Diamond size={7} c={color.primary} />Gerado automaticamente</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f3f1e9', border: '1.5px dashed #d8d0bd', borderRadius: 11, padding: '14px 15px' }}>
                        <span style={{ fontFamily: font.serif, fontSize: 16, fontWeight: 600, color: color.ink }}>{autoTitle}</span>
                      </div>
                      <Helper>Padronizado a partir da ficha — todo anúncio segue o mesmo formato, e é isso que faz a busca por tamanho funcionar.</Helper>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* PASSO 2 — FOTOS */}
          {step === 1 && (
            <>
              <StepHead n={2} title="Fotos guiadas" lead={`Mínimo de 3 fotos — obrigatório.${isKit ? ' No kit, ao menos uma do kite e uma da barra.' : ' O GPS das imagens é removido automaticamente.'}`} />
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: color.primary, background: '#e8f1ec', padding: '8px 14px', borderRadius: 999, marginBottom: 22 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: color.primary }} />{images.length} de no mínimo 3 — pode adicionar mais
              </div>
              {showKitePhotos && <PhotoSection title={isKit ? 'Fotos do kite' : 'Fotos'} slots={KITE_SLOTS} photos={kitePhotos} uploading={uploading} progress={uploadCount.total ? { ...uploadCount, pct: uploadPct } : null} onPick={() => pickPhotos('kite')} onRemove={removePhoto} />}
              {showBarraPhotos && <PhotoSection title={isKit ? 'Fotos da barra' : 'Fotos'} slots={BARRA_SLOTS} photos={barraPhotos} uploading={uploading} progress={uploadCount.total ? { ...uploadCount, pct: uploadPct } : null} onPick={() => pickPhotos('barra')} onRemove={removePhoto} />}
            </>
          )}

          {/* PASSO 3 — PREÇO, LOCAL E ENTREGA */}
          {step === 2 && (
            <>
              <StepHead n={3} title="Preço, local e entrega" lead="Sem pagamento na plataforma — o combinado é direto entre as partes." />
              {isKit ? (
                <div>
                  <Label>Preço do conjunto (kite + barra) *</Label>
                  <PriceInput value={price} onChange={setPrice} />
                  {priceErr(price) ? <ErrorText>{priceErr(price)}</ErrorText> : <Helper>É por esse preço que você vende as duas peças juntas.</Helper>}
                  <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
                    <Toggle on={sellKiteAlone} onClick={() => setSellKiteAlone((v) => !v)} title="Também vendo o kite separado" desc="Aparece na busca de kite com o preço de só o kite." />
                    {sellKiteAlone && <div style={{ paddingLeft: 4 }}><Label>Preço de só o kite *</Label><PriceInput value={kitePrice} onChange={setKitePrice} />{priceErr(kitePrice) && <ErrorText>{priceErr(kitePrice)}</ErrorText>}</div>}
                    <Toggle on={sellBarraAlone} onClick={() => setSellBarraAlone((v) => !v)} title="Também vendo a barra separada" desc="Aí a barra também aparece na busca de barra." />
                    {sellBarraAlone && <div style={{ paddingLeft: 4 }}><Label>Preço de só a barra *</Label><PriceInput value={barraPrice} onChange={setBarraPrice} />{priceErr(barraPrice) && <ErrorText>{priceErr(barraPrice)}</ErrorText>}</div>}
                  </div>
                </div>
              ) : (
                <><Label>Preço *</Label><PriceInput value={price} onChange={setPrice} />{priceErr(price) && <ErrorText>{priceErr(price)}</ErrorText>}</>
              )}

              <div className="criar-loc" style={{ display: 'grid', gap: 16, marginTop: 28 }}>
                <Cell><Label>Spot *</Label><select className="kl-select" value={city} onChange={(e) => setCity(e.target.value)}>{SPOTS.map((s) => <option key={s} value={s}>{s}</option>)}</select></Cell>
                <Cell><Label>Outro ponto (opcional)</Label><input className="kl-input" value={spot} onChange={(e) => setSpot(e.target.value)} placeholder="Ex.: Lagoa do Cauípe" /></Cell>
              </div>
              <div style={{ marginTop: 24 }}>
                <Label>Como entrega? <span style={{ color: color.inkFaint2, fontWeight: 500 }}>· escolha ao menos uma</span></Label>
                <div className="criar-delivery" style={{ display: 'grid', gap: 14, marginTop: 10 }}>
                  <Toggle on={pickup} onClick={() => setPickup((v) => !v)} title="Retirada no spot" desc="Encontro presencial. Combinam o ponto no WhatsApp." />
                  <Toggle on={shippable} onClick={() => setShippable((v) => !v)} title="Envio" desc="A transportadora, o valor e o pagamento são combinados diretamente com o comprador." />
                </div>
              </div>
            </>
          )}

          {/* PASSO 4 — REVISÃO */}
          {step === 3 && (
            <>
              <StepHead n={4} title="Revisão" lead="É assim que seu anúncio vai aparecer na busca." />
              <div style={{ maxWidth: 300, background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ position: 'relative', height: 196, backgroundImage: previewPhoto ? `url("${previewPhoto}")` : 'repeating-linear-gradient(135deg,#e3ece5 0px,#e3ece5 13px,#d8e4dc 13px,#d8e4dc 26px)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                  <div style={{ position: 'absolute', top: 13, left: 13, background: color.primaryDeep, color: '#fff', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }}>{previewSize}</div>
                  <div style={{ position: 'absolute', bottom: 13, left: 13, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.94)', padding: '5px 11px', borderRadius: 999 }}><span style={{ width: 6, height: 6, borderRadius: 999, background: shippable ? color.primary : color.accent }} /><span style={{ fontSize: 11.5, fontWeight: 600 }}>{previewDelivery}</span></div>
                </div>
                <div style={{ padding: 18 }}>
                  {(previewBrand || year) && <div style={{ fontSize: 13, fontWeight: 600, color: color.inkFaint2, marginBottom: 5 }}>{[previewBrand, year].filter(Boolean).join(' · ')}</div>}
                  <div style={{ fontFamily: font.serif, fontSize: 21, fontWeight: 600, marginBottom: 12, lineHeight: 1.1 }}>{previewModel}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: color.primary, background: color.chipSoftBg, padding: '4px 10px', borderRadius: 999 }}>{tipoLabel}</span>
                    {previewCond && <span style={{ fontSize: 11.5, fontWeight: 600, color: '#8a7a5c', background: '#f1ebdd', padding: '4px 10px', borderRadius: 999 }}>{previewCond}</span>}
                  </div>
                  <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-0.5px' }}>{price ? `R$ ${Number(price).toLocaleString('pt-BR')}` : '—'}</div>
                </div>
              </div>
            </>
          )}

          {error && <div style={{ background: '#fdecea', color: '#b3261e', padding: 12, borderRadius: 10, fontSize: 13, marginTop: 24 }}>{error}</div>}

          {/* NAV — fixa no rodapé no mobile (auditoria #05); inline no desktop */}
          <div className="criar-nav">
            {!stepValid[step] && stepMissing[step] && <div className="criar-nav-msg">{stepMissing[step]}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <button onClick={goBack} disabled={step === 0} style={{ background: '#fff', border: `1.5px solid ${color.lineChip}`, color: color.ink, borderRadius: 12, padding: '15px 24px', fontFamily: font.sans, fontSize: 15, fontWeight: 600, cursor: step === 0 ? 'default' : 'pointer', opacity: step === 0 ? 0.4 : 1 }}>‹ Voltar</button>
              {step < 3 ? (
                // sempre clicável: se o passo está incompleto, abre o detalhado / mostra o que falta (não fica "morto")
                <button onClick={goNext} style={{ border: 'none', borderRadius: 12, padding: '15px 30px', flex: 1, maxWidth: 280, fontFamily: font.sans, fontSize: 15, fontWeight: 700, cursor: 'pointer', background: stepValid[step] ? color.primary : '#dfe3df', color: stepValid[step] ? '#fff' : color.inkFaint2 }}>Continuar ›</button>
              ) : (
                <button onClick={publish} disabled={!canPublish} style={{ border: 'none', borderRadius: 12, padding: '15px 30px', flex: 1, maxWidth: 280, fontFamily: font.sans, fontSize: 15, fontWeight: 700, cursor: canPublish ? 'pointer' : 'not-allowed', background: canPublish ? color.primary : '#dfe3df', color: canPublish ? '#fff' : color.inkFaint2 }}>{publishing ? 'Publicando…' : 'Publicar anúncio'}</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function StepHead({ n, title, lead }: { n: number; title: string; lead: string }) {
  return (
    <>
      <div className="only-desktop" style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 17, color: color.primary, marginBottom: 6 }}>Passo {n} de 4</div>
      <h1 style={{ fontFamily: font.serif, fontSize: 'clamp(28px,5vw,34px)', fontWeight: 600, letterSpacing: '-0.5px', margin: '0 0 8px' }}>{title}</h1>
      <p style={{ fontSize: 15.5, color: color.inkMute, margin: '0 0 28px' }}>{lead}</p>
    </>
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
            {spec.enum ? (
              // listas curtas → chips on-brand (sem picker cinza do iOS)
              <ChipSelect options={spec.enum} value={values[key]} onChange={(v) => onChange(key, v)} labels={CONDITION_LABEL} />
            ) : spec.type === 'boolean' ? (
              <ChipSelect options={['false', 'true']} value={String(!!values[key])} onChange={(v) => onChange(key, v === 'true')} labels={{ false: 'Não', true: 'Sim' }} />
            ) : spec.type === 'integer' ? (
              <ChipSelect options={Array.from({ length: 11 }, (_, i) => i)} value={values[key]} onChange={(v) => onChange(key, Number(v))} labels={{ '0': 'Nenhum' }} />
            ) : spec.type === 'number' ? (() => {
              // erro de faixa na hora (sem esperar o "Continuar")
              const raw = values[key];
              const has = raw != null && String(raw) !== '' && String(raw) !== '.';
              const n = has ? Number(String(raw).replace(',', '.')) : NaN;
              let err = '';
              if (has) {
                if (Number.isNaN(n)) err = 'Informe um número válido (use ponto, ex.: 8.1).';
                else if (spec.min != null && n < spec.min) err = `Mínimo ${spec.min}.`;
                else if (spec.max != null && n > spec.max) err = `Máximo ${spec.max}.`;
              }
              return (
                <>
                  <input
                    className="kl-input"
                    type="text"
                    inputMode="decimal"
                    value={values[key] ?? ''}
                    placeholder={spec.min != null && spec.max != null ? `Ex.: 9 ou 8.1 (entre ${spec.min} e ${spec.max})` : 'Ex.: 9 ou 8.1'}
                    onChange={(e) => {
                      // máscara: vírgula→ponto, só dígitos; máx. 2 dígitos inteiros + 1 decimal
                      // (tamanho de kite/barra nunca passa de 2 dígitos) — impede 3º dígito.
                      let v = e.target.value.replace(',', '.').replace(/[^\d.]/g, '');
                      const dot = v.indexOf('.');
                      if (dot === -1) v = v.slice(0, 2);
                      else v = v.slice(0, dot).slice(0, 2) + '.' + v.slice(dot + 1).replace(/\./g, '').slice(0, 1);
                      onChange(key, v);
                    }}
                  />
                  {err ? <ErrorText>{err}</ErrorText> : spec.min != null && spec.max != null ? (
                    <Helper>Use ponto para decimais (ex.: 8.1). Entre {spec.min} e {spec.max}.</Helper>
                  ) : null}
                </>
              );
            })() : (
              <input className="kl-input" type="text" value={values[key] ?? ''} onChange={(e) => onChange(key, e.target.value)} />
            )}
          </Cell>
        );
      })}
    </>
  );
}

function ChipSelect({ options, value, onChange, labels }: { options: (string | number)[]; value: any; onChange: (v: string) => void; labels?: Record<string, string> }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = String(value) === String(o);
        const label = labels?.[String(o)] ?? String(o);
        return (
          <button type="button" key={String(o)} onClick={() => onChange(String(o))} style={{ fontFamily: font.sans, fontSize: 15, fontWeight: 600, padding: '11px 16px', minHeight: 44, borderRadius: 999, cursor: 'pointer', background: on ? color.primary : '#fff', color: on ? '#fff' : color.ink, border: `1.5px solid ${on ? color.primary : color.lineInput}` }}>{label}</button>
        );
      })}
    </div>
  );
}

function PhotoSection({ title, slots, photos, uploading, progress, onPick, onRemove }: { title: string; slots: string[]; photos: Img[]; uploading: boolean; progress?: { done: number; total: number; pct: number } | null; onPick: () => void; onRemove: (img: Img) => void }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <SubHead>{title}</SubHead>
      {progress && (
        // Barra de progresso real do lote (bytes enviados) — substitui o "…" mudo.
        <div role="status" aria-live="polite" style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, color: color.inkFaint, marginBottom: 6 }}>
            <span>Enviando {Math.min(progress.done + 1, progress.total)} de {progress.total}…</span>
            <span>{progress.pct}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: '#e8e2d4', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress.pct}%`, background: color.primary, transition: 'width 0.2s ease' }} />
          </div>
        </div>
      )}
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
          <Link href="/" style={{ textDecoration: 'none', color: color.ink }}><Logo size={20} /></Link>
          <span style={{ fontSize: 14, fontWeight: 600, color: color.inkMute }}>Criar anúncio</span>
          <Link href="/" style={{ fontSize: 13.5, color: color.inkFaint, textDecoration: 'none' }}>Sair</Link>
        </div>
      </header>
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px 90px' }}>{children}</main>
    </>
  );
}
function UpLabel({ children }: { children: React.ReactNode }) { return <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase', color: color.inkFaint2, marginBottom: 12 }}>{children}</div>; }
function Label({ children }: { children: React.ReactNode }) { return <label style={{ fontSize: 13, fontWeight: 600, color: color.inkSoft, display: 'block', marginBottom: 7 }}>{children}</label>; }
function Cell({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) { return <div style={style}>{children}</div>; }
function SubHead({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) { return <div style={{ fontFamily: font.serif, fontSize: 18, fontWeight: 600, color: color.ink, ...style }}>{children}</div>; }
function Helper({ children }: { children: React.ReactNode }) { return <div style={{ fontSize: 12.5, color: color.inkFaint2, marginTop: 8 }}>{children}</div>; }
function ErrorText({ children }: { children: React.ReactNode }) { return <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#b3261e', marginTop: 8 }}><span style={{ width: 5, height: 5, borderRadius: 999, background: '#b3261e', flex: 'none' }} />{children}</div>; }
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
      <span style={{ width: 14, height: 14, background: on ? color.primary : '#cdd8d1', transform: 'rotate(45deg)', borderRadius: 2, flex: 'none' }} />
      <span style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: on ? color.primary : color.inkFaint, marginTop: 1 }}>{desc}</div>
      </span>
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
const primary: React.CSSProperties = { display: 'inline-block', background: color.primary, color: '#fff', textDecoration: 'none', padding: '14px 24px', borderRadius: 11, fontSize: 14.5, fontWeight: 700 };
const outline: React.CSSProperties = { display: 'inline-block', background: '#fff', border: '1.5px solid #d3ccbd', color: color.ink, textDecoration: 'none', padding: '13px 24px', borderRadius: 11, fontSize: 14.5, fontWeight: 600 };
