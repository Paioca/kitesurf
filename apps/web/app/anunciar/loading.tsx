// Estado de carregamento do /anunciar (auditoria mobile #01): durante a navegação,
// nunca uma tela só de fundo — sempre um sinal visível de que está montando.
import { color, font } from '../../lib/tokens';

export default function AnunciarLoading() {
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 18, color: color.primary, marginBottom: 12 }}>Carregando…</div>
      <p style={{ fontSize: 14, color: color.inkFaint2, margin: 0 }}>Montando o formulário de anúncio.</p>
    </main>
  );
}
