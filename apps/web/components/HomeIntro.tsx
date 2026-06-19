// Faixa de apresentação da home híbrida: "como funciona" (3 passos) + selos de
// confiança, acima do grid. Server Component, derivado dos tokens do design system.
// ATENÇÃO: a COPY abaixo é placeholder funcional — o texto final fica a cargo do
// design. A estrutura (3 passos numerados + 3 selos) é o que está sendo entregue aqui.
import { color, font, radius } from '../lib/tokens';

const STEPS = [
  { t: 'Escolha o equipamento', d: 'Kite, barra ou kit — foto real e vendedor verificado.' },
  { t: 'Oferta ou visita', d: 'Faça uma oferta ou agende uma visita em um toque.' },
  { t: 'Feche no WhatsApp', d: 'O vendedor libera o contato e vocês combinam direto.' },
];

const TRUST = ['1 número = 1 conta', 'Foto obrigatória', 'Avaliação após a venda'];

function Num({ n }: { n: number }) {
  return (
    <span style={{ width: 26, height: 26, borderRadius: 999, background: color.primary, color: '#fff', fontSize: 13, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{n}</span>
  );
}

function Trust() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {TRUST.map((t) => (
        <span key={t} style={{ fontSize: 12.5, fontWeight: 600, color: color.inkSoft, background: color.surface, border: `1px solid ${color.lineCard}`, borderRadius: radius.pill, padding: '6px 12px' }}>{t}</span>
      ))}
    </div>
  );
}

export function HomeIntro({ compact = false }: { compact?: boolean }) {
  const label = (
    <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase', color: '#5a6b65', marginBottom: compact ? 10 : 14 }}>Como funciona</div>
  );

  if (compact) {
    // mobile: passos em scroll horizontal + selos abaixo
    return (
      <div style={{ padding: '14px 18px 4px' }}>
        {label}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <div className="kl-scroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {STEPS.map((s, i) => (
              <div key={s.t} style={{ flex: 'none', width: 186, background: '#fff', border: `1px solid ${color.lineCard}`, borderRadius: radius.input, padding: 14 }}>
                <Num n={i + 1} />
                <div style={{ fontFamily: font.serif, fontSize: 15.5, fontWeight: 600, margin: '10px 0 4px' }}>{s.t}</div>
                <div style={{ fontSize: 12.5, color: color.inkMute, lineHeight: 1.45 }}>{s.d}</div>
              </div>
            ))}
          </div>
          {/* fade na borda direita = sinaliza que rola pro lado */}
          <div aria-hidden style={{ position: 'absolute', top: 0, right: 0, bottom: 4, width: 36, pointerEvents: 'none', background: `linear-gradient(90deg, transparent, ${color.bg})` }} />
        </div>
        <Trust />
      </div>
    );
  }

  // desktop: banda full-width com 3 passos em linha + selos
  return (
    <div style={{ borderBottom: `1px solid ${color.lineCard}`, background: color.bg }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '26px 32px' }}>
        {label}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 28, flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 24, flex: 1, minWidth: 540 }}>
            {STEPS.map((s, i) => (
              <div key={s.t} style={{ display: 'flex', gap: 12 }}>
                <Num n={i + 1} />
                <div>
                  <div style={{ fontFamily: font.serif, fontSize: 17, fontWeight: 600, marginBottom: 3 }}>{s.t}</div>
                  <div style={{ fontSize: 13.5, color: color.inkMute, lineHeight: 1.5 }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
          <Trust />
        </div>
      </div>
    </div>
  );
}
