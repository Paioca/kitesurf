'use client';

// Home/Busca desktop "Kite Life" (handoff Busca.dc.html) — layout web.
import type { Browse } from '../lib/useBrowse';
import { PRICE_LABELS } from '../lib/useBrowse';
import { SiteHeader } from './SiteHeader';

export function HomeDesktop({ b }: { b: Browse }) {
  const n = b.items.length;

  const activeChips: { label: string; onRemove: () => void }[] = [];
  b.size.forEach((k) => activeChips.push({ label: `${k} m²`, onRemove: () => b.toggle(b.setSize, k) }));
  b.brand.forEach((k) => activeChips.push({ label: k, onRemove: () => b.toggle(b.setBrand, k) }));
  b.city.forEach((k) => activeChips.push({ label: k, onRemove: () => b.toggle(b.setCity, k) }));
  b.price.forEach((k) => activeChips.push({ label: PRICE_LABELS[k], onRemove: () => b.toggle(b.setPrice, k) }));
  b.repair.forEach((k) => activeChips.push({ label: k === 'rep' ? 'Com reparo' : 'Sem reparo', onRemove: () => b.toggle(b.setRepair, k) }));
  if (b.cat !== 'Todos') activeChips.push({ label: b.cat, onRemove: () => b.setCat('Todos') });

  const sorts: [typeof b.sort, string][] = [
    ['recent', 'Recentes'],
    ['priceAsc', 'Menor preço'],
    ['priceDesc', 'Maior preço'],
  ];

  return (
    <>
      <SiteHeader />
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '34px 32px 80px', display: 'grid', gridTemplateColumns: '262px 1fr', gap: 36, alignItems: 'start' }}>
        {/* SIDEBAR */}
        <aside style={{ position: 'sticky', top: 96 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ fontFamily: "'Spectral',serif", fontSize: 22, fontWeight: 600, margin: 0 }}>Filtros</h2>
            <button onClick={() => { b.setCat('Todos'); b.clearAll(); }} style={linkBtn}>Limpar</button>
          </div>

          {/* Categoria (single-select via checkbox) */}
          <Block title="Categoria">
            {b.cats.filter((c) => c !== 'Todos').map((c) => (
              <Row key={c} label={c} checked={b.cat === c} count={b.count('cat', c)} onClick={() => b.setCat(b.cat === c ? 'Todos' : c)} />
            ))}
          </Block>

          {b.sizeOpts.length > 0 && (
            <Block title="Tamanho do kite">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {b.sizeOpts.map((s) => (
                  <ChipOpt key={s} label={`${s} m²`} on={b.size.includes(s)} onClick={() => b.toggle(b.setSize, s)} />
                ))}
              </div>
            </Block>
          )}

          {b.brandOpts.length > 0 && (
            <Block title="Marca">
              {b.brandOpts.map((br) => (
                <Row key={br} label={br} checked={b.brand.includes(br)} count={b.count('brand', br)} onClick={() => b.toggle(b.setBrand, br)} />
              ))}
            </Block>
          )}

          {b.cityOpts.length > 0 && (
            <Block title="Cidade">
              {b.cityOpts.map((c) => (
                <Row key={c} label={c} checked={b.city.includes(c)} count={b.count('city', c)} onClick={() => b.toggle(b.setCity, c)} />
              ))}
            </Block>
          )}

          <Block title="Reparo">
            <Row label="Sem reparo" checked={b.repair.includes('norep')} count={b.count('repair', 'norep')} onClick={() => b.toggle(b.setRepair, 'norep')} />
            <Row label="Com reparo" checked={b.repair.includes('rep')} count={b.count('repair', 'rep')} onClick={() => b.toggle(b.setRepair, 'rep')} />
          </Block>

          <Block title="Preço">
            {(['p1', 'p2', 'p3', 'p4'] as const).map((p) => (
              <Row key={p} label={PRICE_LABELS[p]} checked={b.price.includes(p)} count={b.count('price', p)} onClick={() => b.toggle(b.setPrice, p)} />
            ))}
          </Block>
        </aside>

        {/* RESULTS */}
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 18 }}>
            <div>
              <h1 style={{ fontFamily: "'Spectral',serif", fontSize: 32, fontWeight: 600, letterSpacing: '-0.4px', margin: '0 0 4px' }}>Equipamento à venda</h1>
              <div style={{ fontSize: 14, color: '#6b7a73' }}>{n} {n === 1 ? 'anúncio' : 'anúncios'} em Cumbuco e região</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {sorts.map(([key, label]) => (
                <button key={key} onClick={() => b.setSort(key)} style={sortBtn(b.sort === key)}>{label}</button>
              ))}
            </div>
          </div>

          {activeChips.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
              {activeChips.map((a, i) => (
                <button key={i} onClick={a.onRemove} style={activeChip}>{a.label} <span style={{ opacity: 0.6, fontSize: 14 }}>×</span></button>
              ))}
            </div>
          )}

          {n === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', border: '1px dashed #d3ccbd', borderRadius: 16 }}>
              <div style={{ fontFamily: "'Spectral',serif", fontStyle: 'italic', fontSize: 19, color: '#9aa49d', marginBottom: 14 }}>
                {b.raw.length === 0 ? 'Ainda não há anúncios por aqui.' : 'Nada com esses filtros.'}
              </div>
              <a href={b.raw.length === 0 ? '/anunciar' : '#'} onClick={() => { b.setCat('Todos'); b.clearAll(); }} style={{ ...emptyBtn, textDecoration: 'none' }}>
                {b.raw.length === 0 ? 'Anunciar o primeiro' : 'Limpar filtros'}
              </a>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
              {b.items.map((it) => (
                <a key={it.id} href={`/anuncio/${it.id}`} style={card}>
                  <div style={cardImg}>
                    {it.photo ? (
                      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("${it.photo}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#93a89d' }}>{it.ph}</span>
                    )}
                    <div style={sizeBadge}>{it.sizeLabel}</div>
                    <div style={deliveryTag}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: it.ship ? '#1f6b5c' : '#d9a86b' }} />
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#23332e' }}>{it.ship ? 'Enviável' : 'Retirada local'}</span>
                    </div>
                  </div>
                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#9aa49d', marginBottom: 4 }}>{it.brand}{it.year ? ` · ${it.year}` : ''}</div>
                    <div style={{ fontFamily: "'Spectral',serif", fontSize: 20, fontWeight: 600, letterSpacing: '-0.2px', marginBottom: 12, lineHeight: 1.1 }}>{it.model}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 'auto' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>{it.price}</div>
                      <div style={{ fontSize: 12.5, color: '#8a948d' }}>📍 {it.city}</div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: '1px solid #e6dfd0', padding: '18px 0' }}>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase', color: '#5a6b65', marginBottom: 13 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>{children}</div>
    </div>
  );
}

function Row({ label, checked, count, onClick }: { label: string; checked: boolean; count: number; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: "'Archivo',sans-serif" }}>
      <span style={{ width: 19, height: 19, borderRadius: 6, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: checked ? '#1f6b5c' : '#fff', border: `1.5px solid ${checked ? '#1f6b5c' : '#cbc3b2'}` }}>
        {checked && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
      </span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#23332e' }}>{label}</span>
      <span style={{ fontSize: 12.5, color: '#a8b1aa' }}>{count}</span>
    </button>
  );
}

function ChipOpt({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ fontFamily: "'Archivo',sans-serif", fontSize: 13, fontWeight: 600, padding: '7px 13px', borderRadius: 999, cursor: 'pointer', background: on ? '#1f6b5c' : '#fff', color: on ? '#fff' : '#23332e', border: `1px solid ${on ? '#1f6b5c' : '#ddd5c5'}` }}>
      {label}
    </button>
  );
}

const linkBtn: React.CSSProperties = { background: 'none', border: 'none', fontFamily: "'Archivo',sans-serif", fontSize: 13, fontWeight: 600, color: '#1f6b5c', cursor: 'pointer', padding: 0 };
const sortBtn = (on: boolean): React.CSSProperties => ({ fontFamily: "'Archivo',sans-serif", fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 999, cursor: 'pointer', background: on ? '#23332e' : '#fff', color: on ? '#fff' : '#5a6b65', border: `1px solid ${on ? '#23332e' : '#ddd5c5'}` });
const activeChip: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, background: '#23332e', color: '#fff', border: 'none', borderRadius: 999, padding: '7px 13px', fontFamily: "'Archivo',sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const card: React.CSSProperties = { textDecoration: 'none', color: 'inherit', background: '#fff', border: '1px solid #ece6d8', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' };
const cardImg: React.CSSProperties = { position: 'relative', height: 180, overflow: 'hidden', backgroundImage: 'repeating-linear-gradient(135deg,#e3ece5 0px,#e3ece5 13px,#d8e4dc 13px,#d8e4dc 26px)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const sizeBadge: React.CSSProperties = { position: 'absolute', top: 12, left: 12, background: 'rgba(20,72,62,0.92)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 };
const deliveryTag: React.CSSProperties = { position: 'absolute', bottom: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.94)', padding: '5px 11px', borderRadius: 999 };
const emptyBtn: React.CSSProperties = { display: 'inline-block', background: '#1f6b5c', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 22px', fontFamily: "'Archivo',sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer' };
