// Layout das páginas legais (Termos / Privacidade) — tratamento visual do
// handoff Claude Design v2: hero band escuro, índice lateral sticky, selos
// numerados nas seções e card de contato. O conteúdo vem das páginas.
import { color, font, radius } from '../lib/tokens';
import Link from 'next/link';
import { Logo, Diamond } from './ui';
import { Footer } from './Footer';

export type LegalSection = { id: string; title: string; body: React.ReactNode };

export function LegalPage({
  title,
  updated,
  intro,
  sections,
  crossLabel,
  crossHref,
  contact,
}: {
  title: string;
  updated: string;
  intro: React.ReactNode;
  sections: LegalSection[];
  crossLabel: string;
  crossHref: string;
  contact: React.ReactNode;
}) {
  return (
    <>
      <header style={{ borderBottom: `1px solid ${color.line}`, background: '#fff', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 24px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <Link href="/" style={{ textDecoration: 'none' }}><Logo size={20} /></Link>
          <a href={crossHref} style={{ fontSize: 14, fontWeight: 600, color: color.primary, textDecoration: 'none' }}>{crossLabel} ›</a>
        </div>
      </header>

      {/* Hero band */}
      <div style={{ background: color.dark, color: '#fff' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '54px 24px' }}>
          <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 18, color: color.aqua, marginBottom: 12 }}>Documento legal</div>
          <h1 style={{ fontFamily: font.sans, fontSize: 'clamp(30px, 7vw, 46px)', fontWeight: 900, letterSpacing: '-1px', textTransform: 'uppercase', margin: '0 0 14px' }}>{title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#9fb6ab' }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: color.accent }} />
            {updated}
          </div>
        </div>
      </div>

      <main className="legal-grid" style={{ maxWidth: 980, margin: '0 auto', padding: '48px 24px 90px' }}>
        {/* Índice */}
        <nav className="legal-toc">
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: color.inkFaint2, marginBottom: 14 }}>Nesta página</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, borderLeft: `2px solid ${color.line}` }}>
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="legal-toc-link">{s.title}</a>
            ))}
          </div>
        </nav>

        {/* Conteúdo */}
        <article>
          <p style={{ fontSize: 16.5, lineHeight: 1.7, color: color.inkSoft, margin: '0 0 36px' }}>{intro}</p>

          {sections.map((s, i) => (
            <section key={s.id} id={s.id} style={{ marginBottom: 38, scrollMarginTop: 96 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: color.chipSoftBg, color: color.primary, fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{i + 1}</span>
                <h2 style={{ fontFamily: font.serif, fontSize: 25, fontWeight: 600, letterSpacing: '-0.3px', margin: 0 }}>{s.title}</h2>
              </div>
              <div style={{ fontSize: 15.5, lineHeight: 1.72, color: color.inkSoft }}>{s.body}</div>
            </section>
          ))}

          <div style={{ marginTop: 8, padding: '22px 24px', background: '#ece3d2', borderRadius: radius.card, display: 'flex', gap: 13, alignItems: 'flex-start' }}>
            <span style={{ marginTop: 4 }}><Diamond size={13} c={color.primary} r={2} /></span>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#6b6353', margin: 0 }}>{contact}</p>
          </div>
        </article>
      </main>

      <Footer />
    </>
  );
}
