'use client';

// Home mobile "Kite Life" (handoff Kite Life Mobile.dc.html).
import type { Browse } from '../lib/useBrowse';

const SIZES = ['7', '8', '9', '10', '12', '14'];

export function HomeMobile({ b }: { b: Browse }) {
  const n = b.items.length;
  const sizeBtnLabel = b.size.length
    ? b.size.length === 1
      ? `${b.size[0]} m²`
      : `${b.size.length} tamanhos`
    : 'Tamanho';
  const initials = b.me ? b.me.name.slice(0, 2).toUpperCase() : null;

  return (
    <div style={shell}>
      <header style={appBar}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', color: '#23332e' }}>
          <span style={diamond(16)} />
          <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
            Kite <span style={{ color: '#1f6b5c' }}>Life</span>
          </span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span title="Favoritos · em breve" style={{ fontSize: 19, color: '#c0492f' }}>♡</span>
          <a href={initials ? '#' : '/entrar'} style={avatar}>
            {initials ?? 'Entrar'.slice(0, 2)}
          </a>
        </div>
      </header>

      <div style={{ flex: 1, paddingBottom: 84 }}>
        <div style={{ position: 'relative', height: 188, overflow: 'hidden' }}>
          <div style={heroBg} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(12,37,32,0.25),rgba(12,37,32,0.78))' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 18 }}>
            <div style={{ fontFamily: "'Spectral',serif", fontStyle: 'italic', fontSize: 13, color: '#e7c79a', marginBottom: 4 }}>Cumbuco · Ceará</div>
            <h1 style={{ fontSize: 23, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.5px', color: '#fff', lineHeight: 1.05, margin: 0 }}>
              Equipamento de kite
              <br />
              com confiança
            </h1>
          </div>
        </div>

        <div style={{ padding: '16px 18px 8px' }}>
          <a href="/anuncios" style={searchPill}>
            <span style={{ color: '#bcccc4', fontSize: 16 }}>⌕</span>
            <span style={{ fontSize: 14.5, color: '#9aa49d' }}>Buscar marca, modelo, tamanho…</span>
          </a>
          <div style={{ display: 'flex', gap: 9 }}>
            <button onClick={() => b.setSheet(true)} style={filterBtn}>
              <span style={{ fontSize: 14 }}>⚙</span> Filtros
              {b.filterCount > 0 && <span style={filterBadge}>{b.filterCount}</span>}
            </button>
            <button onClick={() => b.setSheet(true)} style={sizeBtn}>
              <span style={diamond(8, 1)} />
              {sizeBtnLabel}
            </button>
          </div>
        </div>

        <div className="kl-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 18px 6px' }}>
          {b.cats.map((c) => (
            <button key={c} onClick={() => b.setCat(c)} style={catChip(c === b.cat)}>
              {c}
            </button>
          ))}
        </div>

        <div style={{ padding: '10px 18px 4px', fontSize: 13, color: '#8a948d' }}>
          {n} {n === 1 ? 'anúncio' : 'anúncios'} em Cumbuco e região
        </div>

        <div style={{ padding: '6px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {b.items.map((it) => (
            <div key={it.id} style={{ background: '#fff', border: '1px solid #ece6d8', borderRadius: 16, overflow: 'hidden' }}>
              <div style={cardImg}>
                {it.photo ? (
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("${it.photo}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#93a89d' }}>{it.ph}</span>
                )}
                <div style={sizeBadge}>{it.sizeLabel}</div>
                <button onClick={() => b.setFavs((f) => ({ ...f, [it.id]: !f[it.id] }))} title="Favoritar (não salvo ainda)" style={favBtn}>
                  <span style={{ color: b.favs[it.id] ? '#c0492f' : '#7a8780' }}>{b.favs[it.id] ? '♥' : '♡'}</span>
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
                {b.raw.length === 0 ? 'Ainda não há anúncios por aqui.' : 'Nada com esses filtros.'}
              </div>
              <a href={b.raw.length === 0 ? '/anunciar' : '#'} onClick={() => { b.setCat('Todos'); b.clearAll(); }} style={emptyBtn}>
                {b.raw.length === 0 ? 'Anunciar o primeiro' : 'Limpar'}
              </a>
            </div>
          )}
        </div>
      </div>

      <nav style={tabBar}>
        <Tab active label="Início" href="/"><span style={diamond(18)} /></Tab>
        <Tab label="Favoritos" disabled><span style={{ fontSize: 19 }}>♡</span></Tab>
        <a href="/anunciar" style={{ ...tabBase, marginTop: -14, color: '#23332e' }}>
          <span style={fabPlus}>+</span>
          <span style={{ fontSize: 10.5, fontWeight: 700 }}>Anunciar</span>
        </a>
        <Tab label="Mensagens" disabled><span style={{ fontSize: 18 }}>✉</span></Tab>
        <Tab label="Perfil" disabled><span style={{ width: 19, height: 19, borderRadius: 999, background: '#cfd8d2', display: 'block' }} /></Tab>
      </nav>

      {b.sheet && (
        <>
          <div onClick={() => b.setSheet(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(12,37,32,0.45)' }} />
          <div style={sheetBox}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 14px' }}>
              <div style={{ width: 42, height: 5, borderRadius: 999, background: '#d8d0bd' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: "'Spectral',serif", fontSize: 24, fontWeight: 600, margin: 0 }}>Filtros</h2>
              <button onClick={b.clearAll} style={{ background: 'none', border: 'none', fontFamily: "'Archivo',sans-serif", fontSize: 13.5, fontWeight: 700, color: '#1f6b5c', cursor: 'pointer' }}>Limpar tudo</button>
            </div>
            <Section title="Tamanho do kite" star>
              {SIZES.map((s) => <Chip key={s} on={b.size.includes(s)} onClick={() => b.toggle(b.setSize, s)} label={`${s} m²`} />)}
            </Section>
            <Section title="Reparo">
              <Chip on={b.repair.includes('norep')} onClick={() => b.toggle(b.setRepair, 'norep')} label="Sem reparo" />
              <Chip on={b.repair.includes('rep')} onClick={() => b.toggle(b.setRepair, 'rep')} label="Com reparo" />
            </Section>
            <Section title="Micro furo">
              <Chip on={b.furos.includes('nofur')} onClick={() => b.toggle(b.setFuros, 'nofur')} label="Sem micro furo" />
              <Chip on={b.furos.includes('fur')} onClick={() => b.toggle(b.setFuros, 'fur')} label="Com micro furo" />
            </Section>
            <Section title="Preço">
              <Chip on={b.price.includes('p1')} onClick={() => b.toggle(b.setPrice, 'p1')} label="Até R$ 500" />
              <Chip on={b.price.includes('p2')} onClick={() => b.toggle(b.setPrice, 'p2')} label="R$ 500–2.000" />
              <Chip on={b.price.includes('p3')} onClick={() => b.toggle(b.setPrice, 'p3')} label="R$ 2.000–5.000" />
              <Chip on={b.price.includes('p4')} onClick={() => b.toggle(b.setPrice, 'p4')} label="R$ 5.000+" />
            </Section>
            <button onClick={() => b.setSheet(false)} style={applyBtn}>Ver {n} {n === 1 ? 'anúncio' : 'anúncios'}</button>
          </div>
        </>
      )}
    </div>
  );
}

function Tab({ label, href, active, disabled, children }: { label: string; href?: string; active?: boolean; disabled?: boolean; children: React.ReactNode }) {
  const color = active ? '#1f6b5c' : '#9aa49d';
  const content = (<>{children}<span style={{ fontSize: 10.5, fontWeight: active ? 700 : 600 }}>{label}</span></>);
  if (disabled) return <span title="Em breve" style={{ ...tabBase, color, opacity: 0.55 }}>{content}</span>;
  return <a href={href} style={{ ...tabBase, color }}>{content}</a>;
}

function Section({ title, star, children }: { title: string; star?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase', color: '#5a6b65', marginBottom: 12 }}>
        {star && <span style={diamond(8, 1)} />}
        {title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>{children}</div>
    </div>
  );
}

function Chip({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{ fontFamily: "'Archivo',sans-serif", fontSize: 13.5, fontWeight: 600, padding: '10px 16px', borderRadius: 999, cursor: 'pointer', background: on ? '#1f6b5c' : '#fff', color: on ? '#fff' : '#23332e', border: `1.5px solid ${on ? '#1f6b5c' : '#ddd5c5'}` }}>
      {label}
    </button>
  );
}

const diamond = (s: number, r = 3): React.CSSProperties => ({ width: s, height: s, background: '#1f6b5c', transform: 'rotate(45deg)', borderRadius: r, display: 'inline-block' });
const shell: React.CSSProperties = { width: '100%', maxWidth: 430, minHeight: '100vh', margin: '0 auto', background: '#f6f3ec', position: 'relative', display: 'flex', flexDirection: 'column' };
const appBar: React.CSSProperties = { position: 'sticky', top: 0, zIndex: 30, background: 'rgba(246,243,236,0.94)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #e6dfd0', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const avatar: React.CSSProperties = { width: 32, height: 32, borderRadius: 999, background: '#1f6b5c', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' };
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
const emptyBtn: React.CSSProperties = { display: 'inline-block', background: '#1f6b5c', color: '#fff', textDecoration: 'none', border: 'none', borderRadius: 10, padding: '11px 20px', fontFamily: "'Archivo',sans-serif", fontSize: 13.5, fontWeight: 700, cursor: 'pointer' };
const sheetBox: React.CSSProperties = { position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, bottom: 0, zIndex: 41, background: '#f6f3ec', borderRadius: '22px 22px 0 0', maxHeight: '86%', overflowY: 'auto', padding: '8px 20px 24px' };
const applyBtn: React.CSSProperties = { position: 'sticky', bottom: 0, width: '100%', background: '#1f6b5c', color: '#fff', border: 'none', borderRadius: 13, padding: 16, fontFamily: "'Archivo',sans-serif", fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 6 };

function catChip(active: boolean): React.CSSProperties {
  return { flex: 'none', fontFamily: "'Archivo',sans-serif", fontSize: 13.5, fontWeight: 600, padding: '9px 16px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap', background: active ? '#1f6b5c' : '#fff', color: active ? '#fff' : '#23332e', border: `1px solid ${active ? '#1f6b5c' : '#ddd5c5'}` };
}
