'use client';

// Error boundary global branded — evita white-screen; oferece tentar de novo / voltar.
import { color, font } from '../lib/tokens';
import { Logo } from '../components/ui';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: 'clamp(60px,12vw,120px) 24px', textAlign: 'center', minHeight: '72vh' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 26 }}><Logo size={22} /></div>
      <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 18, color: color.primary, marginBottom: 10 }}>Algo deu errado</div>
      <h1 style={{ fontFamily: font.serif, fontSize: 'clamp(28px,5vw,40px)', fontWeight: 600, letterSpacing: '-0.5px', margin: '0 0 16px' }}>Deu um vento cruzado aqui</h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: color.inkMute, margin: '0 0 28px' }}>Tenta de novo — se continuar, volta pra busca.</p>
      <div style={{ display: 'flex', gap: 11, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={reset} style={{ background: color.primary, color: '#fff', border: 'none', padding: '14px 26px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: font.sans }}>Tentar de novo</button>
        <a href="/" style={{ background: '#fff', border: `1.5px solid ${color.lineChip}`, color: color.ink, textDecoration: 'none', padding: '13px 24px', borderRadius: 12, fontSize: 15, fontWeight: 600 }}>Voltar à busca</a>
      </div>
    </main>
  );
}
