'use client';

// Primitivos do design system Kitetropos. Telas compõem a partir daqui —
// nada de reescrever estilo inline solto. Tokens em lib/tokens.ts.
import { color, font, radius, shadow } from '../lib/tokens';

/* ---------- Logo ---------- */
// Marca Kitetropos (Design Book): losango (único ícone) + wordmark numa palavra, dois tons.
// Claro: losango pinheiro · "Kite" verde-profundo · "tropos" pinheiro.
// Escuro: losango dourado · "Kite" branco · "tropos" verde-água.
export function Logo({ size = 18, onDark = false }: { size?: number; onDark?: boolean }) {
  const d = Math.round(size * 0.86); // losango
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <span aria-hidden="true" style={{ width: d, height: d, background: onDark ? color.accent : color.primary, transform: 'rotate(45deg)', borderRadius: Math.max(2, Math.round(d * 0.14)), flex: 'none' }} />
      <span style={{ fontFamily: font.sans, fontWeight: 900, fontSize: size + 3, letterSpacing: '-0.5px', textTransform: 'uppercase', lineHeight: 1 }}>
        <span style={{ color: onDark ? '#fff' : color.dark }}>Kite</span><span style={{ color: onDark ? color.aqua : color.primary }}>tropos</span>
      </span>
    </span>
  );
}

/* ---------- Losango em velocidade (Design Book v2) ---------- */
// A "assinatura de movimento" da marca (o "touro"): rastro + losangos em aceleração,
// o líder dourado com glow. Marcador de seção/transição. USO PARCO — o ouro é escasso;
// fica melhor sobre fundo escuro. transform base mantém o losango girado quando a
// animação está off (prefers-reduced-motion).
export function DiamondTrail({ className }: { className?: string }) {
  return (
    <span className={className} aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <span style={{ width: 60, height: 3, background: `linear-gradient(90deg, transparent, ${color.aqua})`, borderRadius: 2 }} />
      <span style={{ width: 13, height: 13, background: color.aqua, transform: 'rotate(45deg)', borderRadius: 2, opacity: 0.35 }} />
      <span style={{ width: 21, height: 21, background: color.aqua, transform: 'rotate(45deg)', borderRadius: 3, opacity: 0.65 }} />
      <span style={{ width: 34, height: 34, background: color.accent, transform: 'rotate(45deg)', borderRadius: 6, boxShadow: '0 0 28px rgba(217,168,107,0.6)', animation: 'kl-fly 1.6s ease-in-out infinite alternate' }} />
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
  pill,
  disabled,
  onClick,
  href,
  children,
  style,
}: {
  variant?: BtnVariant;
  full?: boolean;
  pill?: boolean; // raio total — CTA "Próximo Passo →" e afins (Lifestyle)
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  // ghost não recebe sombra (é um link disfarçado); os sólidos elevam no hover via .kl-lift.
  const elevated = !disabled && variant !== 'ghost';
  const base: React.CSSProperties = {
    fontFamily: font.sans,
    fontSize: 16,
    fontWeight: 700,
    borderRadius: pill ? radius.pill : radius.btn,
    padding: 16,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    textAlign: 'center',
    textDecoration: 'none',
    display: 'inline-block',
    width: full ? '100%' : undefined,
    boxSizing: 'border-box',
    boxShadow: elevated ? shadow.btn : undefined,
    ...variantStyle(variant, disabled),
    ...style,
  };
  const cls = elevated ? 'kl-lift' : undefined;
  if (href && !disabled) return <a className={cls} href={href} style={base}>{children}</a>;
  return <button className={cls} onClick={onClick} disabled={disabled} style={base}>{children}</button>;
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

/* ---------- Kicker (Spectral itálico — "abre-seção" editorial) ---------- */
// A "voz narrativa" da marca. Toda seção do Lifestyle abre com este kicker antes do
// headline Archivo 900. Nunca compete por hierarquia estrutural — é o eyebrow.
export function Kicker({ children, onDark = false }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <span style={{ fontFamily: font.serif, fontStyle: 'italic', fontSize: 21, fontWeight: 400, lineHeight: 1.3, color: onDark ? color.aqua : color.inkMute }}>
      {children}
    </span>
  );
}

/* ---------- SectionHead (kicker + headline Archivo 900 UPPERCASE) ---------- */
// O par canônico do Lifestyle: kicker Spectral itálico → título atlético. Centralizado
// por padrão (landing); `align="left"` pros cabeçalhos de coluna/seção interna.
export function SectionHead({
  kicker,
  title,
  align = 'center',
  onDark = false,
  style,
}: {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  align?: 'center' | 'left';
  onDark?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: align === 'center' ? 'center' : 'flex-start', textAlign: align, ...style }}>
      {kicker && <Kicker onDark={onDark}>{kicker}</Kicker>}
      <h2 style={{ margin: 0, fontFamily: font.sans, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.0, fontSize: 'clamp(28px, 4.5vw, 40px)', color: onDark ? '#fff' : color.ink }}>
        {title}
      </h2>
    </div>
  );
}

/* ---------- DarkStage (palco escuro — contraste teatral) ---------- */
// Seção fundo verde-profundo com texto claro. Cria os "palcos" recessados do Lifestyle
// (Como Funciona / faixa de confiança) que alternam com as áreas sand. Losango decorativo
// no canto pra assinar a marca sem poluir.
export function DarkStage({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section style={{ position: 'relative', background: color.dark, color: '#fff', overflow: 'hidden', borderRadius: radius.sheet, ...style }}>
      <span aria-hidden="true" style={{ position: 'absolute', top: 28, right: 28, width: 22, height: 22, background: color.accent, transform: 'rotate(45deg)', borderRadius: 4, opacity: 0.5, boxShadow: '0 0 28px rgba(217,168,107,0.45)' }} />
      {children}
    </section>
  );
}
