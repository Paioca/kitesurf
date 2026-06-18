'use client';

// Home mobile "Kite Life" — handoff Kite Life Mobile.dc.html.
// Conectada aos anúncios reais da API. Adaptações Fase 0:
//  - "Enviável · escrow" -> "Enviável" (escrow cortado no Fase 0)
//  - sem rating falso (sem reviews ainda) -> mostra só a cidade
//  - tabs Favoritos/Mensagens/Perfil inertes (telas ainda não existem)
import { useEffect, useMemo, useState } from 'react';
import { API, formatBRL } from '../lib/api';

type Raw = {
  id: string;
  brand: string;
  model: string;
  year: number | '';
  price: string;
  priceNum: number;
  cat: string;
  ship: boolean;
  city: string;
  sizeM2: string | null;
  sizeLabel: string;
  repair: boolean;
  furos: boolean;
  photo?: string;
  ph: string;
};

const SIZES = ['7', '8', '9', '10', '12', '14'];
const PRICE_RANGES: Record<string, [number, number]> = {
  p1: [0, 500],
  p2: [500, 2000],
  p3: [2000, 5000],
  p4: [5000, 1e9],
};

export default function HomeMobile() {
  const [raw, setRaw] = useState<Raw[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [cat, setCat] = useState('Todos');
  const [size, setSize] = useState<string[]>([]);
  const [repair, setRepair] = useState<string[]>([]);
  const [furos, setFuros] = useState<string[]>([]);
  const [price, setPrice] = useState<string[]>([]);
  const [favs, setFavs] = useState<Record<string, boolean>>({});
  const [sheet, setSheet] = useState(false);
  const [me, setMe] = useState<{ name: string } | null>(null);

  useEffect(() => {
    fetch(`${API}/api/listings?page=1`)
      .then((r) => r.json())
      .then((d) => setRaw((d.items ?? []).map(mapListing)))
      .catch(() => {});
    fetch(`${API}/api/catalog/categories`)
      .then((r) => r.json())
      .then((cs: any[]) => setCats(['Todos', ...cs.map((c) => c.namePt)]))
      .catch(() => setCats(['Todos']));

    const token = typeof window !== 'undefined' ? localStorage.getItem('kite_token') : null;
    if (token) {
      fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((u) => u && setMe({ name: u.name }))
        .catch(() => {});
    }
  }, []);

  function toggle(setter: React.Dispatch<React.SetStateAction<string[]>>, key: string) {
    setter((arr) => (arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key]));
  }

  const items = useMemo(() => {
    return raw.filter((it) => {
      if (cat !== 'Todos' && it.cat !== cat) return false;
      if (size.length && !(it.sizeM2 && size.includes(it.sizeM2))) return false;
      if (repair.length && !repair.includes(it.repair ? 'rep' : 'norep')) return false;
      if (furos.length && !furos.includes(it.furos ? 'fur' : 'nofur')) return false;
      if (price.length) {
        const ok = price.some((k) => {
          const r = PRICE_RANGES[k];
          return it.priceNum >= r[0] && it.priceNum < r[1];
        });
        if (!ok) return false;
      }
      return true;
    });
  }, [raw, cat, size, repair, furos, price]);

  const filterCount = size.length + repair.length + furos.length + price.length;
  const n = items.length;
  const sizeBtnLabel = size.length
    ? size.length === 1
      ? `${size[0]} m²`
      : `${size.length} tamanhos`
    : 'Tamanho';
  const initials = me ? me.name.slice(0, 2).toUpperCase() : null;

  function clearAll() {
    setSize([]);
    setRepair([]);
    setFuros([]);
    setPrice([]);
  }

  return (
    <div style={shell}>
      {/* APP BAR */}
      <header style={appBar}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', color: '#23332e' }}>
          <span style={{ width: 16, height: 16, background: '#1f6b5c', transform: 'rotate(45deg)', borderRadius: 3 }} />
          <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
            Kite <span style={{ color: '#1f6b5c' }}>Life</span>
          </span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span title="Favoritos · em breve" style={{ fontSize: 19, color: '#c0492f' }}>♡</span>
          <a
            href={initials ? '#' : '/entrar'}
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              background: '#1f6b5c',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            {initials ?? 'Entrar'.slice(0, 2)}
          </a>
        </div>
      </header>

      <div style={{ flex: 1, paddingBottom: 84 }}>
        {/* HERO */}
        <div style={{ position: 'relative', height: 188, overflow: 'hidden' }}>
          <div style={heroBg} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(12,37,32,0.25),rgba(12,37,32,0.78))' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 18 }}>
            <div style={{ fontFamily: "'Spectral',serif", fontStyle: 'italic', fontSize: 13, color: '#e7c79a', marginBottom: 4 }}>
              Cumbuco · Ceará
            </div>
            <h1 style={{ fontSize: 23, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.5px', color: '#fff', lineHeight: 1.05, margin: 0 }}>
              Equipamento de kite
              <br />
              com confiança
            </h1>
          </div>
        </div>

        {/* SEARCH + FILTER BUTTONS */}
        <div style={{ padding: '16px 18px 8px' }}>
          <a href="/anuncios" style={searchPill}>
            <span style={{ color: '#bcccc4', fontSize: 16 }}>⌕</span>
            <span style={{ fontSize: 14.5, color: '#9aa49d' }}>Buscar marca, modelo, tamanho…</span>
          </a>
          <div style={{ display: 'flex', gap: 9 }}>
            <button onClick={() => setSheet(true)} style={filterBtn}>
              <span style={{ fontSize: 14 }}>⚙</span> Filtros
              {filterCount > 0 && <span style={filterBadge}>{filterCount}</span>}
            </button>
            <button onClick={() => setSheet(true)} style={sizeBtn}>
              <span style={{ width: 8, height: 8, background: '#1f6b5c', transform: 'rotate(45deg)', borderRadius: 1 }} />
              {sizeBtnLabel}
            </button>
          </div>
        </div>

        {/* CATEGORY CHIPS */}
        <div className="kl-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 18px 6px' }}>
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} style={catChip(c === cat)}>
              {c}
            </button>
          ))}
        </div>

        <div style={{ padding: '10px 18px 4px', fontSize: 13, color: '#8a948d' }}>
          {n} {n === 1 ? 'anúncio' : 'anúncios'} em Cumbuco e região
        </div>

        {/* CARDS */}
        <div style={{ padding: '6px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map((it) => (
            <div key={it.id} style={{ background: '#fff', border: '1px solid #ece6d8', borderRadius: 16, overflow: 'hidden' }}>
              <div style={cardImg}>
                {it.photo ? (
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("${it.photo}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#93a89d' }}>{it.ph}</span>
                )}
                <div style={sizeBadge}>{it.sizeLabel}</div>
                <button
                  onClick={() => setFavs((f) => ({ ...f, [it.id]: !f[it.id] }))}
                  title="Favoritar (não salvo ainda)"
                  style={favBtn}
                >
                  <span style={{ color: favs[it.id] ? '#c0492f' : '#7a8780' }}>{favs[it.id] ? '♥' : '♡'}</span>
                </button>
                <div style={deliveryTag}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: it.ship ? '#1f6b5c' : '#d9a86b' }} />
                  <span style={{ fontSize: 11.5, fontWeight: 600 }}>{it.ship ? 'Enviável' : 'Retirada local'}</span>
                </div>
              </div>
              <a href={`/anuncio/${it.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit', padding: '15px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#9aa49d', marginBottom: 4 }}>
                  {it.brand}
                  {it.year ? ` · ${it.year}` : ''}
                </div>
                <div style={{ fontFamily: "'Spectral',serif", fontSize: 19, fontWeight: 600, marginBottom: 11 }}>{it.model}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.5px' }}>{it.price}</div>
                  <div style={{ fontSize: 12.5, color: '#8a948d' }}>📍 {it.city}</div>
                </div>
              </a>
            </div>
          ))}

          {n === 0 && (
            <div style={{ textAlign: 'center', padding: '50px 20px', border: '1px dashed #d3ccbd', borderRadius: 16 }}>
              <div style={{ fontFamily: "'Spectral',serif", fontStyle: 'italic', fontSize: 16, color: '#9aa49d', marginBottom: 12 }}>
                {raw.length === 0 ? 'Ainda não há anúncios por aqui.' : 'Nada com esses filtros.'}
              </div>
              <button onClick={() => { setCat('Todos'); clearAll(); }} style={emptyBtn}>
                {raw.length === 0 ? 'Anunciar o primeiro' : 'Limpar'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM TAB BAR */}
      <nav style={tabBar}>
        <Tab active label="Início" href="/">
          <span style={{ width: 18, height: 18, background: '#1f6b5c', transform: 'rotate(45deg)', borderRadius: 3 }} />
        </Tab>
        <Tab label="Favoritos" disabled>
          <span style={{ fontSize: 19 }}>♡</span>
        </Tab>
        <a href="/anunciar" style={{ ...tabBase, marginTop: -14, color: '#23332e' }}>
          <span style={fabPlus}>+</span>
          <span style={{ fontSize: 10.5, fontWeight: 700 }}>Anunciar</span>
        </a>
        <Tab label="Mensagens" disabled>
          <span style={{ fontSize: 18 }}>✉</span>
        </Tab>
        <Tab label="Perfil" disabled>
          <span style={{ width: 19, height: 19, borderRadius: 999, background: '#cfd8d2', display: 'block' }} />
        </Tab>
      </nav>

      {/* FILTER BOTTOM SHEET */}
      {sheet && (
        <>
          <div onClick={() => setSheet(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(12,37,32,0.45)' }} />
          <div style={sheetBox}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 14px' }}>
              <div style={{ width: 42, height: 5, borderRadius: 999, background: '#d8d0bd' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: "'Spectral',serif", fontSize: 24, fontWeight: 600, margin: 0 }}>Filtros</h2>
              <button onClick={clearAll} style={{ background: 'none', border: 'none', fontFamily: "'Archivo',sans-serif", fontSize: 13.5, fontWeight: 700, color: '#1f6b5c', cursor: 'pointer' }}>
                Limpar tudo
              </button>
            </div>

            <SheetSection title="Tamanho do kite" star>
              {SIZES.map((s) => (
                <Chip key={s} on={size.includes(s)} onClick={() => toggle(setSize, s)} label={`${s} m²`} />
              ))}
            </SheetSection>
            <SheetSection title="Reparo">
              <Chip on={repair.includes('norep')} onClick={() => toggle(setRepair, 'norep')} label="Sem reparo" />
              <Chip on={repair.includes('rep')} onClick={() => toggle(setRepair, 'rep')} label="Com reparo" />
            </SheetSection>
            <SheetSection title="Micro furo">
              <Chip on={furos.includes('nofur')} onClick={() => toggle(setFuros, 'nofur')} label="Sem micro furo" />
              <Chip on={furos.includes('fur')} onClick={() => toggle(setFuros, 'fur')} label="Com micro furo" />
            </SheetSection>
            <SheetSection title="Preço">
              <Chip on={price.includes('p1')} onClick={() => toggle(setPrice, 'p1')} label="Até R$ 500" />
              <Chip on={price.includes('p2')} onClick={() => toggle(setPrice, 'p2')} label="R$ 500–2.000" />
              <Chip on={price.includes('p3')} onClick={() => toggle(setPrice, 'p3')} label="R$ 2.000–5.000" />
              <Chip on={price.includes('p4')} onClick={() => toggle(setPrice, 'p4')} label="R$ 5.000+" />
            </SheetSection>

            <button onClick={() => setSheet(false)} style={applyBtn}>
              Ver {n} {n === 1 ? 'anúncio' : 'anúncios'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function mapListing(l: any): Raw {
  const a = l.attributes ?? {};
  const sizeM2 = a.size_m2 != null ? String(a.size_m2) : null;
  const sizeLabel = sizeM2
    ? `${sizeM2} m²`
    : a.harness_size || a.bar_size || a.length_cm || l.category?.namePt || '—';
  return {
    id: l.id,
    brand: l.brand?.name ?? '',
    model: l.model?.name ?? l.title,
    year: l.year ?? '',
    price: formatBRL(l.price),
    priceNum: l.price / 100,
    cat: l.category?.namePt ?? '',
    ship: !!l.shippable,
    city: l.city,
    sizeM2,
    sizeLabel: String(sizeLabel),
    repair: Number(a.repairs_count ?? 0) > 0,
    furos: a.micro_furo === true,
    photo: l.images?.[0]?.url,
    ph: l.category?.namePt ? `${l.category.namePt}${sizeM2 ? ` · ${sizeM2} m²` : ''}` : 'Anúncio',
  };
}

/* ---- subcomponents ---- */
function Tab({ label, href, active, disabled, children }: { label: string; href?: string; active?: boolean; disabled?: boolean; children: React.ReactNode }) {
  const color = active ? '#1f6b5c' : '#9aa49d';
  const content = (
    <>
      {children}
      <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 600 }}>{label}</span>
    </>
  );
  if (disabled) return <span title="Em breve" style={{ ...tabBase, color, opacity: 0.55 }}>{content}</span>;
  return <a href={href} style={{ ...tabBase, color }}>{content}</a>;
}

function SheetSection({ title, star, children }: { title: string; star?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase', color: '#5a6b65', marginBottom: 12 }}>
        {star && <span style={{ width: 8, height: 8, background: '#1f6b5c', transform: 'rotate(45deg)', borderRadius: 1 }} />}
        {title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>{children}</div>
    </div>
  );
}

function Chip({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "'Archivo',sans-serif",
        fontSize: 13.5,
        fontWeight: 600,
        padding: '10px 16px',
        borderRadius: 999,
        cursor: 'pointer',
        background: on ? '#1f6b5c' : '#fff',
        color: on ? '#fff' : '#23332e',
        border: `1.5px solid ${on ? '#1f6b5c' : '#ddd5c5'}`,
      }}
    >
      {label}
    </button>
  );
}

/* ---- styles ---- */
const shell: React.CSSProperties = { width: '100%', maxWidth: 430, minHeight: '100vh', margin: '0 auto', background: '#f6f3ec', position: 'relative', display: 'flex', flexDirection: 'column' };
const appBar: React.CSSProperties = { position: 'sticky', top: 0, zIndex: 30, background: 'rgba(246,243,236,0.94)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #e6dfd0', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const heroBg: React.CSSProperties = { position: 'absolute', inset: 0, background: 'linear-gradient(120deg,#1f6b5c,#0c3a52)' };
const searchPill: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1.5px solid #e6dfd0', borderRadius: 999, padding: '13px 18px', marginBottom: 13, textDecoration: 'none' };
const filterBtn: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#1f6b5c', color: '#fff', border: 'none', borderRadius: 12, padding: 13, fontFamily: "'Archivo',sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const filterBadge: React.CSSProperties = { background: '#d9a86b', color: '#3a2e18', fontSize: 11, fontWeight: 800, minWidth: 19, height: 19, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' };
const sizeBtn: React.CSSProperties = { flex: 'none', display: 'flex', alignItems: 'center', gap: 7, background: '#f2f8f5', color: '#1f6b5c', border: '1.5px solid #cfe3d9', borderRadius: 12, padding: '13px 16px', fontFamily: "'Archivo',sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const cardImg: React.CSSProperties = { position: 'relative', height: 200, overflow: 'hidden', backgroundImage: 'repeating-linear-gradient(135deg,#e3ece5 0px,#e3ece5 13px,#d8e4dc 13px,#d8e4dc 26px)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const sizeBadge: React.CSSProperties = { position: 'absolute', top: 12, left: 12, background: 'rgba(20,72,62,0.92)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 };
const favBtn: React.CSSProperties = { position: 'absolute', top: 9, right: 9, width: 36, height: 36, border: 'none', borderRadius: 999, background: 'rgba(255,255,255,0.94)', cursor: 'pointer', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const deliveryTag: React.CSSProperties = { position: 'absolute', bottom: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.94)', padding: '5px 11px', borderRadius: 999 };
const tabBar: React.CSSProperties = { position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, bottom: 0, zIndex: 30, background: '#fff', borderTop: '1px solid #e6dfd0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '10px 14px 16px' };
const tabBase: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none' };
const fabPlus: React.CSSProperties = { width: 48, height: 48, borderRadius: 999, background: '#d9a86b', color: '#3a2e18', fontSize: 26, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(217,168,107,0.5)' };
const emptyBtn: React.CSSProperties = { background: '#1f6b5c', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontFamily: "'Archivo',sans-serif", fontSize: 13.5, fontWeight: 700, cursor: 'pointer' };
const sheetBox: React.CSSProperties = { position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, bottom: 0, zIndex: 41, background: '#f6f3ec', borderRadius: '22px 22px 0 0', maxHeight: '86%', overflowY: 'auto', padding: '8px 20px 24px' };
const applyBtn: React.CSSProperties = { position: 'sticky', bottom: 0, width: '100%', background: '#1f6b5c', color: '#fff', border: 'none', borderRadius: 13, padding: 16, fontFamily: "'Archivo',sans-serif", fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 6 };

function catChip(active: boolean): React.CSSProperties {
  return { flex: 'none', fontFamily: "'Archivo',sans-serif", fontSize: 13.5, fontWeight: 600, padding: '9px 16px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap', background: active ? '#1f6b5c' : '#fff', color: active ? '#fff' : '#23332e', border: `1px solid ${active ? '#1f6b5c' : '#ddd5c5'}` };
}
