'use client';

// Primitivos do design system Kite Life. Telas compõem a partir daqui —
// nada de reescrever estilo inline solto. Tokens em lib/tokens.ts.
import { color, font, radius } from '../lib/tokens';

/* ---------- Logo ---------- */
export function Logo({ size = 18, onDark = false }: { size?: number; onDark?: boolean }) {
  const c = onDark ? '#fff' : color.primary;
  const m = Math.round(size + 4);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <svg width={m} height={m} viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }} aria-hidden="true">
        <circle cx="12" cy="12" r="8" stroke={c} strokeWidth="1.8" />
        <line x1="1.5" y1="12" x2="22.5" y2="12" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span style={{ fontFamily: font.sans, fontWeight: 800, fontSize: size + 6, letterSpacing: '-0.5px', color: onDark ? '#fff' : color.ink }}>Vaya</span>
    </span>
  );
}

/* ---------- Diamante (marcador) ---------- */
export function Diamond({ size = 8, c = color.primary, r = 1 }: { size?: number; c?: string; r?: number }) {
  return <span style={{ width: size, height: size, background: c, transform: 'rotate(45deg)', borderRadius: r, display: 'inline-block', flex: 'none' }} />;
}

/* ---------- Button ---------- */
type BtnVariant = 'primary' | 'accent' | 'outline' | 'ghost';
export function Button({
  variant = 'primary',
  full,
  disabled,
  onClick,
  href,
  children,
  style,
}: {
  variant?: BtnVariant;
  full?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    fontFamily: font.sans,
    fontSize: 16,
    fontWeight: 700,
    borderRadius: radius.btn,
    padding: 16,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    textAlign: 'center',
    textDecoration: 'none',
    display: 'inline-block',
    width: full ? '100%' : undefined,
    boxSizing: 'border-box',
    ...variantStyle(variant, disabled),
    ...style,
  };
  if (href && !disabled) return <a href={href} style={base}>{children}</a>;
  return <button onClick={onClick} disabled={disabled} style={base}>{children}</button>;
}

function variantStyle(v: BtnVariant, disabled?: boolean): React.CSSProperties {
  if (disabled) return { background: '#dfe3df', color: color.inkFaint2 };
  switch (v) {
    case 'accent':
      return { background: color.accent, color: color.accentInk };
    case 'outline':
      return { background: color.surface, color: color.ink, border: `1.5px solid ${color.lineChip}` };
    case 'ghost':
      return { background: 'transparent', color: color.inkMute, padding: 0 };
    default:
      return { background: color.primary, color: '#fff' };
  }
}

/* ---------- Field + Input ---------- */
export function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 16 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: color.inkSoft, display: 'block', marginBottom: 8 }}>
        {label}
        {optional && <span style={{ color: color.inkFaint2, fontWeight: 500 }}> · opcional</span>}
      </span>
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        fontSize: 15,
        fontWeight: 500,
        border: `1.5px solid ${color.lineInput}`,
        borderRadius: radius.input,
        padding: '13px 15px',
        background: color.surface,
        color: color.ink,
        outline: 'none',
        boxSizing: 'border-box',
        ...props.style,
      }}
    />
  );
}

/* ---------- Chip de filtro ---------- */
export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: font.sans,
        fontSize: 13.5,
        fontWeight: 600,
        padding: '10px 16px',
        borderRadius: radius.pill,
        cursor: 'pointer',
        background: on ? color.primary : color.surface,
        color: on ? '#fff' : color.ink,
        border: `1.5px solid ${on ? color.primary : color.lineChip}`,
      }}
    >
      {children}
    </button>
  );
}

/* ---------- Section label (UPPERCASE) ---------- */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase', color: '#5a6b65', marginBottom: 12 }}>
      {children}
    </div>
  );
}
