import { Logo } from './ui';

export function Footer() {
  return (
    <footer style={{ background: '#14302a' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '48px 36px', display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <Logo size={20} onDark />
        <span style={{ fontSize: 13, color: '#8aa399' }}>Cumbuco · Ceará · Brasil</span>
      </div>
    </footer>
  );
}
