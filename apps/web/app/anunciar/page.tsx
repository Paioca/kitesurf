'use client';

// Criar anúncio — wizard, design Kitetropos (Design Book v2). MVP: Kite, Barra ou Kite+Barra (kit).
// Kit = anúncio de kite com hasBarra: seções de ficha/fotos por peça + 3 preços
// (conjunto / kite avulso / barra avulsa). Cookie auth. Fase 0 sem escrow.
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { color, font, radius } from '../../lib/tokens';
import { downscaleImage } from '../../lib/resizeImage';
import type { Brand, Category } from '../../lib/api';
import { MobileAppBar } from '../../components/MobileChrome';
import { Logo, Diamond } from '../../components/ui';
import { SearchSelect } from '../../components/SearchSelect';
import { storedLocale } from '../../components/LanguageToggle';

// Rótulos das opções de enum da ficha (condição do kite/barra, bladder, mangueiras).
const CONDITION_LABELS: Record<Locale, Record<string, string>> = {
  pt: {
    novo_lacrado: 'Novo, lacrado',
    novo_10x: 'Pouco usado',
    semi_otimo: 'Seminovo, em ótimo estado',
    semi_desgaste: 'Seminovo, com sinais de uso',
    usado_desgaste: 'Usado, com desgaste visível',
    novo: 'Novo', seminovo: 'Seminovo', bom: 'Bom estado', usado: 'Usado',
    zero: 'Sem furo', microfuro_adesivado: 'Microfuro reparado',
    original: 'Originais', ja_trocadas: 'Trocadas',
  },
  en: {
    novo_lacrado: 'New, sealed',
    novo_10x: 'Lightly used',
    semi_otimo: 'Excellent used condition',
    semi_desgaste: 'Used, with signs of wear',
    usado_desgaste: 'Used, visible wear',
    novo: 'New', seminovo: 'Like new', bom: 'Good condition', usado: 'Used',
    zero: 'No leak', microfuro_adesivado: 'Repaired micro leak',
    original: 'Original', ja_trocadas: 'Replaced',
  },
};
const FIELD_LABELS: Record<Locale, Record<string, string>> = {
  pt: {
    size_m2: 'Tamanho do kite',
    condition: 'Estado do equipamento',
    reparos: 'Reparos no tecido',
    microfuros: 'Microfuros no bladder',
  },
  en: {
    size_m2: 'Kite size',
    condition: 'Gear condition',
    reparos: 'Canopy repairs',
    microfuros: 'Bladder micro leaks',
  },
};
const SPOTS = ['Cumbuco', 'Taíba', 'Fortaleza', 'Praia do Futuro', 'Paracuru', 'Ilha do Guajiru', 'Preá'];
const KITE_SLOTS: Record<Locale, string[]> = {
  pt: ['Foto geral do equipamento', 'Outro ângulo', 'Marca e modelo', 'Etiqueta e tamanho', 'Válvulas e bordas', 'Reparos ou desgastes'],
  en: ['Full gear photo', 'Another angle', 'Brand and model', 'Label and size', 'Valves and edges', 'Repairs or wear'],
};
const BARRA_SLOTS: Record<Locale, string[]> = {
  pt: ['Foto geral da barra', 'Detalhe / chicken loop', 'Trim e grip', 'Desgaste (se houver)'],
  en: ['Full bar photo', 'Chicken loop detail', 'Trim and grip', 'Wear, if any'],
};
const DRAFT_KEY = 'vaya:anunciar-draft';

type Kind = '' | 'kite' | 'barra' | 'kit';
type Img = { url: string; thumbUrl?: string; component: 'kite' | 'barra' };
type Locale = 'pt' | 'en';

const AD_COPY = {
  pt: {
    loading: 'Carregando…',
    preparing: 'Preparando o formulário.',
    redirecting: 'Redirecionando…',
    confirmPhone: 'Confirme seu telefone para criar o anúncio.',
    createdTitle: 'Seu anúncio está no ar',
    createdBody: 'Quando alguém fizer uma oferta ou pedir uma visita, você acompanha tudo em Minhas negociações.',
    viewListing: 'Ver anúncio',
    viewGear: 'Ver outros equipamentos',
    restored: 'Rascunho recuperado. Continue de onde parou.',
    clearDraft: 'Começar do zero',
    sideKicker: 'Compartilhe o vento',
    sideTitle: 'Mantenha a comunidade voando',
    step: 'Passo',
    of: 'de',
    rail: ['Tipo & ficha', 'Fotos do equipamento', 'Preço & entrega', 'Revisão'],
    tips: [
      'As listas padronizadas fazem a busca por tamanho funcionar. Informe furos e reparos para que o comprador saiba exatamente o que está avaliando.',
      'Fotos boas vendem. Mostre etiqueta, válvulas e qualquer reparo. Mínimo de 3.',
      'Sem pagamento na plataforma. Marque ao menos uma forma de entrega: retirada no spot ou envio.',
      'Tudo certo? Revise antes de publicar. Anúncios ativos ou pausados podem ser editados depois.',
    ],
    missing: {
      kind: 'Escolha o tipo',
      required: 'Preencha os dados obrigatórios',
      photos: (kit: boolean) => `Faltam fotos (mín. 3${kit ? ', uma do kite e uma da barra' : ''})`,
      price: 'Defina o preço',
      spot: 'Escolha o spot',
      delivery: 'Escolha retirada e/ou envio',
      minPrice: (min: number) => `O preço mínimo é R$ ${min}.`,
    },
    typeTitle: 'O que você está vendendo?',
    typeLead: 'Escolha o tipo e preencha a ficha principal.',
    typeLabel: 'Tipo',
    onlyKite: 'Só o kite',
    onlyBar: 'Só a barra',
    kitDesc: 'Conjunto',
    warningTitle: 'Atenção: descreva fielmente',
    warningBody: 'Informe estado real e reparos. Informações incorretas podem remover o anúncio e restringir a conta.',
    brand: 'Marca',
    model: 'Modelo',
    selectBrand: 'Selecione a marca',
    chooseBrandFirst: 'Escolha a marca primeiro',
    noModels: 'Sem modelos para esta marca',
    select: 'Selecione',
    year: 'Ano',
    kiteYear: 'Ano do kite',
    barBrand: 'Marca da barra',
    selectBarBrand: 'Selecione a marca da barra',
    barModel: 'Modelo da barra',
    barYear: 'Ano da barra',
    selectYear: 'Selecione o ano',
    selectBarYear: 'Selecione o ano da barra',
    detailsTitle: 'Detalhes do estado',
    detailsBody: 'Informe os pontos que impactam o uso e a negociação.',
    listingTitle: 'Título do anúncio',
    autoGenerated: 'Gerado automaticamente',
    titleHelper: 'Padronizado a partir da ficha. Todo anúncio segue o mesmo formato, e é isso que faz a busca por tamanho funcionar.',
    photosTitle: 'Fotos do equipamento',
    photosLead: 'Adicione pelo menos 3 fotos para mostrar bem o estado do equipamento.',
    minPhotos: (n: number) => `${n} de 3 fotos mínimas`,
    kitePhotos: 'Fotos do kite',
    barPhotos: 'Fotos da barra',
    priceTitle: 'Preço e entrega',
    priceLead: 'Defina o preço, o spot e como o comprador pode receber o equipamento.',
    kitPrice: 'Preço do conjunto (kite + barra)',
    kitPriceHelper: 'É por esse preço que você vende as duas peças juntas.',
    sellKiteOnly: 'Também vendo o kite separado',
    sellKiteOnlyDesc: 'Aparece na busca de kite com o preço de só o kite.',
    kiteOnlyPrice: 'Preço de só o kite',
    sellBarOnly: 'Também vendo a barra separada',
    sellBarOnlyDesc: 'Aí a barra também aparece na busca de barra.',
    barOnlyPrice: 'Preço de só a barra',
    price: 'Preço',
    referencePoint: 'Ponto de referência opcional',
    referencePlaceholder: 'Ex.: Lagoa do Cauípe',
    deliveryQuestion: 'Como o comprador pode receber?',
    pickup: 'Retirada no spot',
    pickupDesc: 'Vocês combinam pelo WhatsApp o melhor ponto para retirada.',
    shipping: 'Envio',
    shippingDesc: 'Frete, transportadora e pagamento são combinados diretamente entre comprador e vendedor.',
    paymentHelper: 'A Kitetropos não processa pagamentos. Combine pagamento e entrega diretamente com o comprador.',
    reviewTitle: 'Revisão',
    reviewLead: 'É assim que seu anúncio vai aparecer na busca.',
    noPrice: 'Sem preço',
    back: '‹ Voltar',
    next: 'Continuar →',
    publishing: 'Publicando…',
    publish: 'Publicar anúncio',
    createListing: 'Criar anúncio',
    exit: 'Sair',
    no: 'Não',
    yes: 'Sim',
    none: 'Nenhum',
    numberInvalid: 'Informe um número válido (use ponto, ex.: 8.1).',
    min: 'Mínimo',
    max: 'Máximo',
    decimalPlaceholder: 'Ex.: 9 ou 8.1',
    between: 'entre',
    decimalHelper: 'Use ponto para decimais. Ex.: 8.1',
    decimalRangeHelper: (min: number, max: number) => `Use ponto para decimais (ex.: 8.1). Entre ${min} e ${max}.`,
    uploading: (done: number, total: number) => `Enviando ${done} de ${total}…`,
    removePhoto: 'Remover foto',
    fallbackTitle: 'Seu anúncio',
    bar: 'Barra',
    pickupLabel: 'Retirada',
    shippingLabel: 'Envio',
  },
  en: {
    loading: 'Loading…',
    preparing: 'Preparing the form.',
    redirecting: 'Redirecting…',
    confirmPhone: 'Confirm your phone to create the listing.',
    createdTitle: 'Your listing is live',
    createdBody: 'When someone sends an offer or visit request, you follow everything in My deals.',
    viewListing: 'View listing',
    viewGear: 'See more gear',
    restored: 'Draft restored. Continue where you left off.',
    clearDraft: 'Start over',
    sideKicker: 'Share the wind',
    sideTitle: 'Keep the community riding',
    step: 'Step',
    of: 'of',
    rail: ['Type & specs', 'Gear photos', 'Price & delivery', 'Review'],
    tips: [
      'Standard lists make size search work. Add leaks and repairs so the buyer knows exactly what they are evaluating.',
      'Good photos sell. Show the label, valves, and any repair. Minimum of 3.',
      'No payment on the platform. Select at least one delivery option: local pickup or shipping.',
      'All good? Review before publishing. Active or paused listings can be edited later.',
    ],
    missing: {
      kind: 'Choose the type',
      required: 'Fill in the required details',
      photos: (kit: boolean) => `Missing photos (min. 3${kit ? ', one kite photo and one bar photo' : ''})`,
      price: 'Set the price',
      spot: 'Choose the spot',
      delivery: 'Choose pickup and/or shipping',
      minPrice: (min: number) => `Minimum price is R$ ${min}.`,
    },
    typeTitle: 'What are you selling?',
    typeLead: 'Choose the type and fill in the main specs.',
    typeLabel: 'Type',
    onlyKite: 'Kite only',
    onlyBar: 'Bar only',
    kitDesc: 'Bundle',
    warningTitle: 'Important: describe it accurately',
    warningBody: 'Add the real condition and repairs. Incorrect information can remove the listing and restrict the account.',
    brand: 'Brand',
    model: 'Model',
    selectBrand: 'Select brand',
    chooseBrandFirst: 'Choose the brand first',
    noModels: 'No models for this brand',
    select: 'Select',
    year: 'Year',
    kiteYear: 'Kite year',
    barBrand: 'Bar brand',
    selectBarBrand: 'Select bar brand',
    barModel: 'Bar model',
    barYear: 'Bar year',
    selectYear: 'Select year',
    selectBarYear: 'Select bar year',
    detailsTitle: 'Condition details',
    detailsBody: 'Add the points that affect usage and negotiation.',
    listingTitle: 'Listing title',
    autoGenerated: 'Auto-generated',
    titleHelper: 'Standardized from the specs. Every listing follows the same format, which makes size search work.',
    photosTitle: 'Gear photos',
    photosLead: 'Add at least 3 photos to show the gear condition clearly.',
    minPhotos: (n: number) => `${n} of 3 minimum photos`,
    kitePhotos: 'Kite photos',
    barPhotos: 'Bar photos',
    priceTitle: 'Price and delivery',
    priceLead: 'Set the price, spot, and how the buyer can receive the gear.',
    kitPrice: 'Bundle price (kite + bar)',
    kitPriceHelper: 'This is the price for selling both pieces together.',
    sellKiteOnly: 'I also sell the kite separately',
    sellKiteOnlyDesc: 'It appears in kite search with the kite-only price.',
    kiteOnlyPrice: 'Kite-only price',
    sellBarOnly: 'I also sell the bar separately',
    sellBarOnlyDesc: 'The bar also appears in bar search.',
    barOnlyPrice: 'Bar-only price',
    price: 'Price',
    referencePoint: 'Optional reference point',
    referencePlaceholder: 'Ex.: Cauipe Lagoon',
    deliveryQuestion: 'How can the buyer receive it?',
    pickup: 'Pickup at the spot',
    pickupDesc: 'You agree on the best pickup point by WhatsApp.',
    shipping: 'Shipping',
    shippingDesc: 'Shipping, carrier, and payment are arranged directly between buyer and seller.',
    paymentHelper: 'Kitetropos does not process payments. Arrange payment and delivery directly with the buyer.',
    reviewTitle: 'Review',
    reviewLead: 'This is how your listing will appear in search.',
    noPrice: 'No price',
    back: '‹ Back',
    next: 'Continue →',
    publishing: 'Publishing…',
    publish: 'Publish listing',
    createListing: 'Create listing',
    exit: 'Exit',
    no: 'No',
    yes: 'Yes',
    none: 'None',
    numberInvalid: 'Enter a valid number (use a dot, e.g. 8.1).',
    min: 'Minimum',
    max: 'Maximum',
    decimalPlaceholder: 'Ex.: 9 or 8.1',
    between: 'between',
    decimalHelper: 'Use a dot for decimals. Ex.: 8.1',
    decimalRangeHelper: (min: number, max: number) => `Use a dot for decimals (e.g. 8.1). Between ${min} and ${max}.`,
    uploading: (done: number, total: number) => `Uploading ${done} of ${total}…`,
    removePhoto: 'Remove photo',
    fallbackTitle: 'Your listing',
    bar: 'Bar',
    pickupLabel: 'Pickup',
    shippingLabel: 'Shipping',
  },
};

export default function Criar() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [kind, setKind] = useState<Kind>('');
  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [barraBrandId, setBarraBrandId] = useState('');
  const [barraModelId, setBarraModelId] = useState('');
  const [year, setYear] = useState('');
  const [barraYear, setBarraYear] = useState('');
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
  const [detailOpen, setDetailOpen] = useState(true); // seção "Estado detalhado" visível no refresh, ainda colapsável
  const [lang, setLang] = useState<Locale>('pt');
  const fileRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    setLang(storedLocale());
    fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' }).then((r) => r.json()).then((u) => setAuthed(!!(u && u.id))).catch(() => setAuthed(false));
    fetch('/api/catalog/categories').then((r) => r.json()).then(setCategories).catch(() => {});
    fetch('/api/catalog/brands').then((r) => r.json()).then(setBrands).catch(() => {});
  }, []);

  useEffect(() => {
    if (authed === false) window.location.replace('/entrar?next=%2Fanunciar');
  }, [authed]);

  // --- rascunho/autosave (localStorage): não perde o anúncio meio-preenchido ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.kind) {
          setKind(d.kind); setBrandId(d.brandId ?? ''); setModelId(d.modelId ?? '');
          setBarraBrandId(d.barraBrandId ?? ''); setBarraModelId(d.barraModelId ?? '');
          setYear(d.year ?? ''); setBarraYear(d.barraYear ?? '');
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
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ kind, brandId, modelId, barraBrandId, barraModelId, year, barraYear, attrs, barraAttrs, images, price, sellKiteAlone, sellBarraAlone, kitePrice, barraPrice, city, spot, pickup, shippable, step }));
    } catch {}
  }, [kind, brandId, modelId, barraBrandId, barraModelId, year, barraYear, attrs, barraAttrs, images, price, sellKiteAlone, sellBarraAlone, kitePrice, barraPrice, city, spot, pickup, shippable, step]);

  useEffect(() => { if (createdId) { try { localStorage.removeItem(DRAFT_KEY); } catch {} } }, [createdId]);

  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch {} window.location.reload(); }

  const kiteCat = useMemo(() => categories.find((c) => c.slug === 'kite'), [categories]);
  const barraCat = useMemo(() => categories.find((c) => c.slug === 'barra'), [categories]);
  const brand = useMemo(() => brands.find((b) => b.id === brandId), [brands, brandId]);
  const barraBrand = useMemo(() => brands.find((b) => b.id === barraBrandId), [brands, barraBrandId]);

  const isKit = kind === 'kit';
  const mainCat = kind === 'barra' ? barraCat : kiteCat; // categoria primária enviada
  const visibleBarraSchema = useMemo(() => {
    const condition = barraCat?.attributeSchema?.properties?.condition;
    return { required: ['condition'], properties: condition ? { condition } : {} };
  }, [barraCat]);
  const mainProps = kind === 'barra' ? visibleBarraSchema.properties : mainCat?.attributeSchema?.properties ?? {};
  const barraProps = visibleBarraSchema.properties;
  // Essencial = campos `required` do schema; o resto vai pro "Estado detalhado" colapsável (auditoria #02).
  const pickProps = (props: Record<string, any>, keys: string[], want: boolean) =>
    Object.fromEntries(Object.entries(props).filter(([k]) => keys.includes(k) === want));
  const mainReq: string[] = kind === 'barra' ? visibleBarraSchema.required : (mainCat?.attributeSchema as any)?.required ?? [];
  const barraReq: string[] = visibleBarraSchema.required;
  const mainEss = pickProps(mainProps, mainReq, true);
  const mainDet = pickProps(mainProps, mainReq, false);
  const barraEss = pickProps(barraProps, barraReq, true);
  const barraDet = pickProps(barraProps, barraReq, false);
  const hasDetail = Object.keys(mainDet).length > 0 || (kind === 'kit' && Object.keys(barraDet).length > 0);
  const mainBrandOpts = useMemo(() => brands.filter((b) => !mainCat?.id || b.models.some((m) => m.categoryId === mainCat.id)).map((b) => ({ value: b.id, label: b.name })), [brands, mainCat]);
  const barraBrandOpts = useMemo(() => brands.filter((b) => !barraCat?.id || b.models.some((m) => m.categoryId === barraCat.id)).map((b) => ({ value: b.id, label: b.name })), [brands, barraCat]);
  // Modelos da categoria atual: kite/kit usam modelos de kite, barra usa modelos de barra
  // (mainCat já reflete isso). Sem o filtro, o dropdown listaria modelos das duas categorias.
  const kindModels = useMemo(() => (brand?.models ?? []).filter((m) => m.categoryId === mainCat?.id), [brand, mainCat]);
  const modelOpts = useMemo(() => kindModels.map((m) => ({ value: m.id, label: m.name })), [kindModels]);
  const barraKindModels = useMemo(() => (barraBrand?.models ?? []).filter((m) => m.categoryId === barraCat?.id), [barraBrand, barraCat]);
  const barraModelOpts = useMemo(() => barraKindModels.map((m) => ({ value: m.id, label: m.name })), [barraKindModels]);
  const yearOpts = useMemo(() => Array.from({ length: 16 }, (_, i) => String(2027 - i)), []);
  const showKitePhotos = kind === 'kite' || kind === 'kit';
  const showBarraPhotos = kind === 'barra' || kind === 'kit';
  const kitePhotos = images.filter((i) => i.component === 'kite');
  const barraPhotos = images.filter((i) => i.component === 'barra');
  const t = AD_COPY[lang];
  const conditionLabels = CONDITION_LABELS[lang];
  const fieldLabels = FIELD_LABELS[lang];

  const autoTitle = useMemo(() => {
    const b = brand?.name;
    const model = brand?.models.find((m) => m.id === modelId)?.name;
    const bmBarra = [barraBrand?.name, barraBrand?.models.find((m) => m.id === barraModelId)?.name, barraYear].filter(Boolean).join(' ');
    if (kind === 'barra') return ['Barra', b, model, year].filter(Boolean).join(' · ');
    const base = [b, model, attrs.size_m2 ? `${attrs.size_m2} m²` : '', year, attrs.condition ? conditionLabels[attrs.condition] : ''].filter(Boolean).join(' · ');
    return kind === 'kit' ? (base ? `${base} + ${bmBarra || 'Barra'}` : '') : base;
  }, [brand, modelId, barraBrand, barraModelId, attrs, year, barraYear, kind, conditionLabels]);

  function selectKind(k: Kind) {
    const prev = kind;
    setKind(k);
    setError('');
    if (k === 'kite') {
      if (prev === 'barra') {
        setBrandId('');
        setModelId('');
        setAttrs({});
      }
      setBarraBrandId('');
      setBarraModelId('');
      setBarraYear('');
      setBarraAttrs({});
      setSellBarraAlone(false);
      setBarraPrice('');
      setImages((imgs) => imgs.filter((i) => i.component !== 'barra'));
    } else if (k === 'barra') {
      setBrandId('');
      setModelId('');
      setBarraBrandId('');
      setBarraModelId('');
      setBarraYear('');
      setYear('');
      setAttrs({});
      setBarraAttrs({});
      setSellKiteAlone(false);
      setSellBarraAlone(false);
      setKitePrice('');
      setBarraPrice('');
      setImages([]);
    } else if (k === 'kit') {
      if (prev === 'barra') {
        setBrandId('');
        setModelId('');
        setAttrs({});
        setImages([]);
      }
      setBarraBrandId('');
      setBarraModelId('');
      setBarraYear('');
      setBarraAttrs({});
    }
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
  const mainHeadOk = !!brandId && (kindModels.length === 0 || !!modelId) && !!year;
  const barraHeadOk = !isKit || (!!barraBrandId && (barraKindModels.length === 0 || !!barraModelId) && !!barraYear);
  const headOk = mainHeadOk && barraHeadOk;
  // Erro de faixa dos campos numéricos (ex.: tamanho 3–20), client-side: bloqueia o
  // avanço de passo ANTES do publish — o erro não fica só na tela final.
  const numError = (props: Record<string, any>, vals: Record<string, any>): string => {
    for (const [k, spec] of Object.entries(props)) {
      if (spec?.type !== 'number') continue;
      const raw = vals[k];
      if (raw == null || raw === '') continue;
      const n = Number(String(raw).replace(',', '.'));
      const lbl = spec.label ?? k;
      if (Number.isNaN(n)) return `${lbl}: ${t.numberInvalid}`;
      if (spec.min != null && n < spec.min) return `${lbl}: ${t.min.toLowerCase()} ${spec.min}.`;
      if (spec.max != null && n > spec.max) return `${lbl}: ${t.max.toLowerCase()} ${spec.max}.`;
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
  const priceErr = (v: string) => (v && Number(v) > 0 && Number(v) < MIN_PRICE ? t.missing.minPrice(MIN_PRICE) : '');
  const priceOk = Number(price) >= MIN_PRICE
    && (!sellKiteAlone || Number(kitePrice) >= MIN_PRICE)
    && (!sellBarraAlone || Number(barraPrice) >= MIN_PRICE);
  const priceMsg = priceErr(price) || (sellKiteAlone ? priceErr(kitePrice) : '') || (sellBarraAlone ? priceErr(barraPrice) : '') || (!priceOk ? t.missing.price : '');
  const deliveryOk = pickup || shippable;
  const canPublish = !!kind && fichaOk && photosOk && priceOk && deliveryOk && !!city && !uploading && !publishing;
  const missing = !kind ? t.missing.kind : attrErr ? attrErr : !fichaOk ? t.missing.required : !photosOk ? t.missing.photos(isKit) : !priceOk ? priceMsg : !city ? t.missing.spot : !deliveryOk ? t.missing.delivery : '';

  // wizard: validade e mensagem por passo
  const RAIL = t.rail;
  const TIPS = t.tips;
  const stepValid = [!!kind && fichaOk, photosOk, priceOk && deliveryOk && !!city, canPublish];
  const stepMissing = [
    !kind ? t.missing.kind : attrErr ? attrErr : !fichaOk ? t.missing.required : '',
    !photosOk ? t.missing.photos(isKit) : '',
    !priceOk ? priceMsg : !city ? t.missing.spot : !deliveryOk ? t.missing.delivery : '',
    missing,
  ];
  const scrollToWizardTop = () => {
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  };
  const goNext = () => {
    if (step === 0 && !stepValid[0] && hasDetail) setDetailOpen(true); // revela os campos detalhados que faltam
    if (step < 3 && stepValid[step]) {
      setStep(step + 1);
      scrollToWizardTop();
    }
  };
  const goBack = () => {
    setStep((s) => Math.max(0, s - 1));
    scrollToWizardTop();
  };

  async function publish() {
    if (publishing) return; // guarda extra contra duplo-clique / Enter repetido
    setError('');
    setPublishing(true);
    try {
      const res = await fetch('/api/listings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: mainCat?.id, brandId: brandId || undefined, modelId: modelId || undefined,
          barraBrandId: isKit ? barraBrandId || undefined : undefined,
          barraModelId: isKit ? barraModelId || undefined : undefined,
          year: year ? Number(year) : undefined,
          barraYear: isKit && barraYear ? Number(barraYear) : undefined,
          attributes: attrs,
          title: autoTitle || mainCat?.namePt || 'Anúncio', price: Math.round(Number(price) * 100),
          city, spot: spot || undefined, pickup, shippable, images,
          hasBarra: isKit,
          kitePrice: isKit && sellKiteAlone ? Math.round(Number(kitePrice) * 100) : null,
          barraPrice: isKit && sellBarraAlone ? Math.round(Number(barraPrice) * 100) : null,
          barraAttributes: isKit ? barraAttrs : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? (lang === 'en' ? 'Error publishing listing.' : 'Erro ao publicar.'));
      setCreatedId(data.id);
    } catch (e: any) { setError(e.message); } finally { setPublishing(false); }
  }

  if (authed === null) {
    return (
      <Shell t={t}>
        <div style={{ textAlign: 'center', padding: '70px 0' }}>
          <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 18, color: color.primary, marginBottom: 10 }}>{t.loading}</div>
          <p style={{ fontSize: 14, color: color.inkFaint2, margin: 0 }}>{t.preparing}</p>
        </div>
      </Shell>
    );
  }

  if (authed === false) {
    return (
      <Shell t={t}>
        <div style={{ textAlign: 'center', padding: '70px 0' }}>
          <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 18, color: color.primary, marginBottom: 10 }}>{t.redirecting}</div>
          <p style={{ fontSize: 14, color: color.inkFaint2, margin: 0 }}>{t.confirmPhone}</p>
        </div>
      </Shell>
    );
  }

  if (createdId) {
    return (
      <Shell t={t}>
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, background: '#e8f1ec', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: color.primary, fontSize: 30 }}>✓</span></div>
          <h1 style={{ fontFamily: font.serif, fontSize: 32, fontWeight: 600, margin: '0 0 10px' }}>{t.createdTitle}</h1>
          <p style={{ fontSize: 15.5, color: color.inkMute, margin: '0 auto 26px', maxWidth: 400 }}>{t.createdBody}</p>
          <div style={{ display: 'flex', gap: 11, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={`/anuncio/${createdId}`} style={primary}>{t.viewListing}</a>
            <Link href="/" style={outline}>{t.viewGear}</Link>
          </div>
        </div>
      </Shell>
    );
  }

  // ---- preview da revisão (passo 4) ----
  const previewBrand = brand?.name ?? '';
  const previewModel = kind === 'barra'
    ? (brand?.models.find((m) => m.id === modelId)?.name || `${t.bar}${previewBrand ? ` ${previewBrand}` : ''}`)
    : (brand?.models.find((m) => m.id === modelId)?.name || autoTitle || t.fallbackTitle);
  const previewCond = attrs.condition ? conditionLabels[attrs.condition] : null;
  const previewSize = kind === 'barra' ? t.bar : (attrs.size_m2 ? `${attrs.size_m2} m²` : (lang === 'en' ? 'No size' : 'Sem tamanho'));
  const previewDelivery = pickup && shippable ? `${t.pickupLabel} · ${t.shippingLabel}` : shippable ? t.shippingLabel : t.pickupLabel;
  const previewPhoto = images[0]?.thumbUrl ?? images[0]?.url ?? null;
  const tipoLabel = kind === 'barra' ? 'Barra' : kind === 'kit' ? 'Kit' : 'Kite';

  return (
    <Shell t={t}>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
      {restored && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#e8f1ec', border: '1px solid #cfe3d9', borderRadius: 12, padding: '11px 15px', marginBottom: 20, fontSize: 13.5, color: color.ink }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: color.primary, flex: 'none' }} />
          <span>{t.restored}</span>
          <button onClick={clearDraft} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: color.primary, fontWeight: 700, cursor: 'pointer', fontFamily: font.sans, fontSize: 13.5 }}>{t.clearDraft}</button>
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
          {/* Card editorial (Lifestyle): foto + kicker gold + headline; a dica vira o corpo. */}
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, marginTop: 18, minHeight: 230 }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("/anunciar-comunidade.jpg")', backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(12,37,32,0.35) 0%, rgba(12,37,32,0.92) 100%)' }} />
            <span aria-hidden="true" style={{ position: 'absolute', top: 14, right: 14, width: 14, height: 14, background: color.accent, transform: 'rotate(45deg)', borderRadius: 3, opacity: 0.6, boxShadow: '0 0 22px rgba(217,168,107,0.5)' }} />
            <div style={{ position: 'absolute', inset: 0, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 15, color: color.gold, marginBottom: 8 }}>{t.sideKicker}</div>
              <div style={{ fontFamily: font.sans, fontSize: 19, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.0, color: '#fff', marginBottom: 10 }}>{t.sideTitle}</div>
              <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.82)', margin: 0 }}>{TIPS[step]}</p>
            </div>
          </div>
        </div>

        {/* STEP CONTENT */}
        <div className="criar-content">
          {/* progresso compacto (mobile) */}
          <div className="only-mobile" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
              {RAIL.map((t, i) => <div key={t} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= step ? color.primary : '#e6dfd0' }} />)}
            </div>
            <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 14, color: color.primary }}>{t.step} {step + 1} {t.of} 4 · {RAIL[step]}</div>
          </div>

          {/* PASSO 1 — TIPO & FICHA */}
          {step === 0 && (
            <>
              <StepHead n={1} title={t.typeTitle} lead={t.typeLead} t={t} />
              <UpLabel>{t.typeLabel}</UpLabel>
              <div className="criar-tipos" style={{ marginBottom: 28 }}>
                <KindBtn on={kind === 'kite'} onClick={() => selectKind('kite')} title="Kite" desc={t.onlyKite} icon={IconKite} />
                <KindBtn on={kind === 'barra'} onClick={() => selectKind('barra')} title={t.bar} desc={t.onlyBar} icon={IconBarra} />
                <KindBtn on={kind === 'kit'} onClick={() => selectKind('kit')} title={`Kite + ${t.bar}`} desc={t.kitDesc} icon={IconKit} />
              </div>

              {kind && (
                <>
                  <div style={{ display: 'flex', gap: 13, background: '#fbeae4', border: '1.5px solid #f0c9bd', borderRadius: 14, padding: '16px 18px', margin: '0 0 28px' }}>
                    <span style={{ width: 24, height: 24, borderRadius: 7, background: '#c0492f', color: '#fff', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>!</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#8f3826', marginBottom: 3 }}>{t.warningTitle}</div>
                      <p style={{ fontSize: 13, lineHeight: 1.55, color: '#9a5040', margin: 0 }}>{t.warningBody}</p>
                    </div>
                  </div>
                  {/* ESSENCIAL — sempre visível */}
                  <div className="criar-fields" style={{ display: 'grid', gap: '16px 18px' }}>
                    {isKit && <SubHead style={{ gridColumn: '1 / -1' }}>Kite</SubHead>}
                    <Cell><Label>{t.brand} *</Label><SearchSelect value={brandId} options={mainBrandOpts} placeholder={t.selectBrand} onChange={(v) => { setBrandId(v); setModelId(''); }} /></Cell>
                    <Cell><Label>{t.model}{kindModels.length > 0 ? ' *' : ''}</Label><SearchSelect value={modelId} options={modelOpts} placeholder={!brandId ? t.chooseBrandFirst : kindModels.length === 0 ? t.noModels : t.select} onChange={setModelId} disabled={!brandId || kindModels.length === 0} /></Cell>
                    <Cell style={{ gridColumn: '1 / -1' }}><Label>{isKit ? `${t.kiteYear} *` : `${t.year} *`}</Label><CompactSelect options={yearOpts} value={year} onChange={setYear} placeholder={t.selectYear} /></Cell>
                    <Fields props={mainEss} required={Object.keys(mainEss)} values={attrs} onChange={(k, v) => setAttrs((a) => ({ ...a, [k]: v }))} labels={conditionLabels} fieldLabels={fieldLabels} t={t} />
                  </div>
                  {isKit && (
                    <div className="criar-fields" style={{ display: 'grid', gap: '16px 18px', marginTop: 22 }}>
                      <SubHead style={{ gridColumn: '1 / -1' }}>{t.bar}</SubHead>
                      <Cell><Label>{t.barBrand} *</Label><SearchSelect value={barraBrandId} options={barraBrandOpts} placeholder={t.selectBarBrand} onChange={(v) => { setBarraBrandId(v); setBarraModelId(''); }} /></Cell>
                      <Cell><Label>{t.barModel}{barraKindModels.length > 0 ? ' *' : ''}</Label><SearchSelect value={barraModelId} options={barraModelOpts} placeholder={!barraBrandId ? t.chooseBrandFirst : barraKindModels.length === 0 ? t.noModels : t.select} onChange={setBarraModelId} disabled={!barraBrandId || barraKindModels.length === 0} /></Cell>
                      <Cell style={{ gridColumn: '1 / -1' }}><Label>{t.barYear} *</Label><CompactSelect options={yearOpts} value={barraYear} onChange={setBarraYear} placeholder={t.selectBarYear} /></Cell>
                      <Fields props={barraEss} required={Object.keys(barraEss)} values={barraAttrs} onChange={(k, v) => setBarraAttrs((a) => ({ ...a, [k]: v }))} labels={conditionLabels} fieldLabels={fieldLabels} t={t} />
                    </div>
                  )}

                  {/* ESTADO DETALHADO — colapsável (divulgação progressiva) */}
                  {hasDetail && (
                    <div style={{ marginTop: 22, border: `1px solid ${color.lineCard}`, borderRadius: 14, overflow: 'hidden' }}>
                      <button type="button" onClick={() => setDetailOpen((o) => !o)} aria-expanded={detailOpen} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#faf7f0', border: 'none', padding: '15px 16px', cursor: 'pointer', textAlign: 'left' }}>
                        <span>
                          <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: color.ink }}>{t.detailsTitle}</span>
                          <span style={{ display: 'block', fontSize: 12.5, color: color.inkFaint2, marginTop: 2 }}>{t.detailsBody}</span>
                        </span>
                        <span aria-hidden="true" style={{ fontSize: 13, color: color.inkMute, flex: 'none', transform: detailOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
                      </button>
                      {detailOpen && (
                        <div style={{ padding: 16, borderTop: `1px solid ${color.line}` }}>
                          {Object.keys(mainDet).length > 0 && (
                            <>
                              {isKit && <SubHead>Kite</SubHead>}
                              <div className="criar-fields" style={{ display: 'grid', gap: '16px 18px', marginTop: isKit ? 12 : 0 }}>
                                <Fields props={mainDet} required={Object.keys(mainDet)} values={attrs} onChange={(k, v) => setAttrs((a) => ({ ...a, [k]: v }))} labels={conditionLabels} fieldLabels={fieldLabels} t={t} />
                              </div>
                            </>
                          )}
                          {isKit && Object.keys(barraDet).length > 0 && (
                            <>
                              <SubHead style={{ marginTop: 18 }}>{t.bar}</SubHead>
                              <div className="criar-fields" style={{ display: 'grid', gap: '16px 18px', marginTop: 12 }}>
                                <Fields props={barraDet} required={Object.keys(barraDet)} values={barraAttrs} onChange={(k, v) => setBarraAttrs((a) => ({ ...a, [k]: v }))} labels={conditionLabels} fieldLabels={fieldLabels} t={t} />
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
                        <Label>{t.listingTitle}</Label>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: color.primary, background: '#e8f1ec', padding: '3px 9px', borderRadius: 999 }}><Diamond size={7} c={color.primary} />{t.autoGenerated}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f3f1e9', border: '1.5px dashed #d8d0bd', borderRadius: 11, padding: '14px 15px' }}>
                        <span style={{ fontFamily: font.serif, fontSize: 16, fontWeight: 600, color: color.ink }}>{autoTitle}</span>
                      </div>
                      <Helper>{t.titleHelper}</Helper>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* PASSO 2 — FOTOS */}
          {step === 1 && (
            <>
              <StepHead n={2} title={t.photosTitle} lead={t.photosLead} t={t} />
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: color.primary, background: '#e8f1ec', padding: '8px 14px', borderRadius: 999, marginBottom: 22 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: color.primary }} />{t.minPhotos(images.length)}
              </div>
              {showKitePhotos && <PhotoSection title={isKit ? t.kitePhotos : ''} slots={KITE_SLOTS[lang]} photos={kitePhotos} uploading={uploading} progress={uploadCount.total ? { ...uploadCount, pct: uploadPct } : null} onPick={() => pickPhotos('kite')} onRemove={removePhoto} t={t} />}
              {showBarraPhotos && <PhotoSection title={isKit ? t.barPhotos : ''} slots={BARRA_SLOTS[lang]} photos={barraPhotos} uploading={uploading} progress={uploadCount.total ? { ...uploadCount, pct: uploadPct } : null} onPick={() => pickPhotos('barra')} onRemove={removePhoto} t={t} />}
            </>
          )}

          {/* PASSO 3 — PREÇO, LOCAL E ENTREGA */}
          {step === 2 && (
            <>
              <StepHead n={3} title={t.priceTitle} lead={t.priceLead} t={t} />
              {isKit ? (
                <div>
                  <Label>{t.kitPrice} *</Label>
                  <PriceInput value={price} onChange={setPrice} />
                  {priceErr(price) ? <ErrorText>{priceErr(price)}</ErrorText> : <Helper>{t.kitPriceHelper}</Helper>}
                  <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
                    <Toggle on={sellKiteAlone} onClick={() => setSellKiteAlone((v) => !v)} title={t.sellKiteOnly} desc={t.sellKiteOnlyDesc} />
                    {sellKiteAlone && <div style={{ paddingLeft: 4 }}><Label>{t.kiteOnlyPrice} *</Label><PriceInput value={kitePrice} onChange={setKitePrice} />{priceErr(kitePrice) && <ErrorText>{priceErr(kitePrice)}</ErrorText>}</div>}
                    <Toggle on={sellBarraAlone} onClick={() => setSellBarraAlone((v) => !v)} title={t.sellBarOnly} desc={t.sellBarOnlyDesc} />
                    {sellBarraAlone && <div style={{ paddingLeft: 4 }}><Label>{t.barOnlyPrice} *</Label><PriceInput value={barraPrice} onChange={setBarraPrice} />{priceErr(barraPrice) && <ErrorText>{priceErr(barraPrice)}</ErrorText>}</div>}
                  </div>
                </div>
              ) : (
                <><Label>{t.price} *</Label><PriceInput value={price} onChange={setPrice} />{priceErr(price) && <ErrorText>{priceErr(price)}</ErrorText>}</>
              )}

              <div className="criar-loc" style={{ display: 'grid', gap: 16, marginTop: 28 }}>
                <Cell><Label>Spot *</Label><select className="kl-select" value={city} onChange={(e) => setCity(e.target.value)}>{SPOTS.map((s) => <option key={s} value={s}>{s}</option>)}</select></Cell>
                <Cell><Label>{t.referencePoint}</Label><input className="kl-input" value={spot} onChange={(e) => setSpot(e.target.value)} placeholder={t.referencePlaceholder} /></Cell>
              </div>
              <div style={{ marginTop: 24 }}>
                <Label>{t.deliveryQuestion}</Label>
                <div className="criar-delivery" style={{ display: 'grid', gap: 14, marginTop: 10 }}>
                  <Toggle on={pickup} onClick={() => setPickup((v) => !v)} title={t.pickup} desc={t.pickupDesc} />
                  <Toggle on={shippable} onClick={() => setShippable((v) => !v)} title={t.shipping} desc={t.shippingDesc} />
                </div>
                <Helper>{t.paymentHelper}</Helper>
              </div>
            </>
          )}

          {/* PASSO 4 — REVISÃO */}
          {step === 3 && (
            <>
              <StepHead n={4} title={t.reviewTitle} lead={t.reviewLead} t={t} />
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
                  <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-0.5px' }}>{price ? `R$ ${Number(price).toLocaleString('pt-BR')}` : t.noPrice}</div>
                </div>
              </div>
            </>
          )}

          {error && <div style={{ background: '#fdecea', color: '#b3261e', padding: 12, borderRadius: 10, fontSize: 13, marginTop: 24 }}>{error}</div>}

          {/* NAV — fixa no rodapé no mobile (auditoria #05); inline no desktop */}
          <div className="criar-nav">
            {!stepValid[step] && stepMissing[step] && <div className="criar-nav-msg">{stepMissing[step]}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <button onClick={goBack} disabled={step === 0} style={{ background: '#fff', border: `1.5px solid ${color.lineChip}`, color: color.ink, borderRadius: 12, padding: '15px 24px', fontFamily: font.sans, fontSize: 15, fontWeight: 600, cursor: step === 0 ? 'default' : 'pointer', opacity: step === 0 ? 0.4 : 1 }}>{t.back}</button>
              {step < 3 ? (
                // sempre clicável: se o passo está incompleto, abre o detalhado / mostra o que falta (não fica "morto")
                <button onClick={goNext} style={{ border: 'none', borderRadius: 12, padding: '15px 30px', flex: 1, maxWidth: 280, fontFamily: font.sans, fontSize: 15, fontWeight: 700, cursor: 'pointer', background: stepValid[step] ? color.dark : '#dfe3df', color: stepValid[step] ? '#fff' : color.inkFaint2 }}>{t.next}</button>
              ) : (
                <button onClick={publish} disabled={!canPublish} style={{ border: 'none', borderRadius: 12, padding: '15px 30px', flex: 1, maxWidth: 280, fontFamily: font.sans, fontSize: 15, fontWeight: 700, cursor: canPublish ? 'pointer' : 'not-allowed', background: canPublish ? color.dark : '#dfe3df', color: canPublish ? '#fff' : color.inkFaint2 }}>{publishing ? t.publishing : t.publish}</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function StepHead({ n, title, lead, t }: { n: number; title: string; lead: string; t: (typeof AD_COPY)[Locale] }) {
  return (
    <>
      <div className="only-desktop" style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 17, color: color.primary, marginBottom: 6 }}>{t.step} {n} {t.of} 4</div>
      <h1 style={{ fontFamily: font.sans, fontSize: 'clamp(28px,5vw,38px)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.0, margin: '0 0 10px' }}>{title}</h1>
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
function Fields({
  props,
  required,
  values,
  onChange,
  labels,
  fieldLabels,
  t,
}: {
  props: Record<string, any>;
  required: string[];
  values: Record<string, any>;
  onChange: (k: string, v: any) => void;
  labels: Record<string, string>;
  fieldLabels: Record<string, string>;
  t: (typeof AD_COPY)[Locale];
}) {
  return (
    <>
      {Object.entries(props).map(([key, spec]: any) => {
        const req = required.includes(key);
        return (
          <Cell key={key}>
            <Label>{(fieldLabels[key] ?? spec.label ?? key)}{req ? ' *' : ''}</Label>
            {spec.enum ? (
              // listas curtas → chips on-brand (sem picker cinza do iOS)
              <ChipSelect options={spec.enum} value={values[key]} onChange={(v) => onChange(key, v)} labels={labels} />
            ) : spec.type === 'boolean' ? (
              <ChipSelect options={['false', 'true']} value={String(!!values[key])} onChange={(v) => onChange(key, v === 'true')} labels={{ false: t.no, true: t.yes }} />
            ) : spec.type === 'integer' ? (
              <ChipSelect options={Array.from({ length: 11 }, (_, i) => i)} value={values[key]} onChange={(v) => onChange(key, Number(v))} labels={{ '0': t.none }} />
            ) : spec.type === 'number' ? (() => {
              // erro de faixa na hora (sem esperar o "Continuar")
              const raw = values[key];
              const has = raw != null && String(raw) !== '' && String(raw) !== '.';
              const n = has ? Number(String(raw).replace(',', '.')) : NaN;
              let err = '';
              if (has) {
                if (Number.isNaN(n)) err = t.numberInvalid;
                else if (spec.min != null && n < spec.min) err = `${t.min} ${spec.min}.`;
                else if (spec.max != null && n > spec.max) err = `${t.max} ${spec.max}.`;
              }
              return (
                <>
                  <input
                    className="kl-input"
                    type="text"
                    inputMode="decimal"
                    value={values[key] ?? ''}
                    placeholder={key === 'size_m2' ? t.decimalPlaceholder : spec.min != null && spec.max != null ? `${t.decimalPlaceholder} (${t.between} ${spec.min} - ${spec.max})` : t.decimalPlaceholder}
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
                  {err ? <ErrorText>{err}</ErrorText> : key === 'size_m2' ? (
                    <Helper>{t.decimalHelper}</Helper>
                  ) : spec.min != null && spec.max != null ? (
                    <Helper>{t.decimalRangeHelper(spec.min, spec.max)}</Helper>
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

function CompactSelect({ options, value, onChange, placeholder }: { options: string[]; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <select className="kl-select" value={value} onChange={(e) => onChange(e.target.value)} style={{ maxWidth: 220 }}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function PhotoSection({ title, slots, photos, uploading, progress, onPick, onRemove, t }: { title: string; slots: string[]; photos: Img[]; uploading: boolean; progress?: { done: number; total: number; pct: number } | null; onPick: () => void; onRemove: (img: Img) => void; t: (typeof AD_COPY)[Locale] }) {
  return (
    <div style={{ marginBottom: 22 }}>
      {title && <SubHead>{title}</SubHead>}
      {progress && (
        // Barra de progresso real do lote (bytes enviados) — substitui o "…" mudo.
        <div role="status" aria-live="polite" style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, color: color.inkFaint, marginBottom: 6 }}>
            <span>{t.uploading(Math.min(progress.done + 1, progress.total), progress.total)}</span>
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
            <button key={label} onClick={onPick} className={img ? undefined : 'kl-lift'} style={{ position: 'relative', height: 150, borderRadius: radius.card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 10, overflow: 'hidden', cursor: 'pointer', border: img ? `1.5px solid ${color.primary}` : `2px dashed ${color.lineInput}`, background: img ? undefined : '#fbfaf6' }}>
              {img && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("${img.thumbUrl ?? img.url}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
              {img && <span role="button" aria-label={t.removePhoto} onClick={(e) => { e.stopPropagation(); onRemove(img); }} style={{ position: 'absolute', top: 9, left: 9, width: 26, height: 26, borderRadius: 999, background: 'rgba(20,20,20,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, zIndex: 2 }}>✕</span>}
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
function Shell({ children, t }: { children: React.ReactNode; t: (typeof AD_COPY)[Locale] }) {
  return (
    <>
      <div className="only-mobile"><MobileAppBar /></div>
      <header className="only-desktop" style={{ background: '#fff', borderBottom: `1px solid ${color.line}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 36px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none', color: color.ink }}><Logo size={20} /></Link>
          <span style={{ fontSize: 14, fontWeight: 600, color: color.inkMute }}>{t.createListing}</span>
          <Link href="/" style={{ fontSize: 13.5, color: color.inkFaint, textDecoration: 'none' }}>{t.exit}</Link>
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
// Ícones temáticos dos cards de categoria (refresh). Stroke = currentColor (herda do card).
const IconKite = (
  <svg width="34" height="34" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 4.5 25 15.4 16 27.5 7 15.4 16 4.5Z" />
    <path d="M16 4.5v23" />
    <path d="M7 15.4c3.3-1.5 6.3-1.4 9 .1 2.7-1.5 5.7-1.6 9-.1" />
    <path d="M16 27.5c-1.1 1-2.2 1.5-3.5 1.5" />
  </svg>
);
const IconBarra = (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="3" y1="8" x2="21" y2="8" /><path d="M4 8V5.5M20 8V5.5" /><path d="M12 8v10" /><circle cx="12" cy="19.5" r="1.7" />
  </svg>
);
const IconKit = (
  <svg width="34" height="34" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 3.8 23.3 12.4 16 21.8 8.7 12.4 16 3.8Z" />
    <path d="M16 3.8v18" />
    <path d="M8.7 12.4c2.7-1.1 5.1-1.1 7.3.1 2.2-1.2 4.6-1.2 7.3-.1" />
    <path d="M10.5 27.2h11" />
    <path d="M12.3 25.8v2.8M19.7 25.8v2.8" />
    <path d="M15 21.5 12.3 25.8M17 21.5l2.7 4.3" />
  </svg>
);

function KindBtn({ on, onClick, title, desc, icon }: { on: boolean; onClick: () => void; title: string; desc: string; icon?: React.ReactNode }) {
  // Card de categoria (refresh): vertical, ícone temático, hover sobe (.kl-lift),
  // ativo = borda primary + sombra tintada de verde-floresta (= .active-category do Stitch).
  return (
    <button onClick={onClick} className="kl-lift" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: font.sans, padding: '22px 16px', borderRadius: radius.card, cursor: 'pointer', textAlign: 'center', background: '#fff', border: `1.5px solid ${on ? color.primary : color.lineCard}`, color: on ? color.primary : color.ink, boxShadow: on ? '0 10px 25px -5px rgba(20,72,62,0.18)' : undefined }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: on ? color.primary : '#9aa9a1', flex: 'none' }}>{icon ?? <span style={{ width: 26, height: 26, background: on ? color.primary : '#cdd8d1', transform: 'rotate(45deg)', borderRadius: 5, display: 'block' }} />}</span>
      <span>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.02em' }}>{title}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: on ? color.primary : color.inkFaint, marginTop: 2 }}>{desc}</div>
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
