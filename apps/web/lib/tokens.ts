// Design system Kitetropos — fonte única da verdade.
// Conforme o handoff "Kitetropos Editorial" (Modern Editorial / Coastal Minimalist).
// Paleta ancorada na paisagem litorânea de Cumbuco: teal profundo + areia quente.
// Não inventar valores fora daqui.

export const color = {
  bg: '#f6f3ec', // creme/areia — fundo do app (sand-bg)
  surface: '#ffffff',
  ink: '#06201b', // texto principal — teal quase-preto (on-surface), alto impacto
  inkSoft: '#48564f', // labels (ink-soft)
  inkMute: '#6b7a73', // subtítulos (ink-mute)
  inkFaint: '#8a948d', // hints
  inkFaint2: '#9aa49d',
  inkFaint3: '#a8b1aa',
  // Primário (Deep Teal) — ações principais, identidade e tipografia de alto contraste.
  primary: '#00392f',
  primaryContainer: '#005245', // teal médio — hover/estados, links
  primaryTint: '#25695b', // teal claro — detalhes, kickers
  primaryDeep: 'rgba(0,57,47,0.92)', // badges sobre foto
  // Secundário (Burnt Gold) — calor e padrão "premium".
  secondary: '#7d5722',
  secondaryContainer: '#ffcb8c',
  onSecondaryContainer: '#7a541f',
  accent: '#d9a86b', // areia (CTA secundário / Anunciar) · losango da marca no escuro
  accentInk: '#3a2e18',
  aqua: '#91d3c2', // verde-água — "tropos" do logo sobre fundo escuro (inverse-primary)
  gold: '#e7c79a', // sobre fundo escuro
  heart: '#c0492f',
  // linhas / bordas
  line: '#e6dfd0',
  lineCard: '#ece6d8',
  lineInput: '#e0d9c9',
  lineChip: '#ddd5c5',
  lineDashed: '#cbc3b2',
  // superfícies de apoio (surface containers do handoff)
  tabTrack: '#efe9dc',
  surfaceContainer: '#d8f4eb',
  chipSoftBg: '#f2f8f5',
  chipSoftLine: '#cfe3d9',
  // fundo escuro (hero / split de cadastro)
  dark: '#0c2520',
  darkBlue: '#0c3a52',
} as const;

// As famílias vêm do next/font (self-hosted) via CSS variables definidas no
// <html> em app/layout.tsx. O fallback literal cobre SSR antes da var resolver.
export const font = {
  sans: "var(--font-archivo), 'Archivo', system-ui, -apple-system, sans-serif",
  serif: "var(--font-spectral), 'Spectral', Georgia, serif",
} as const;

export const radius = {
  input: 11,
  btn: 12,
  card: 16,
  sheet: 22,
  pill: 999,
} as const;

// Gradiente do hero (substitui a foto enquanto não há asset definitivo).
export const heroGradient = `linear-gradient(120deg, ${color.primary}, ${color.darkBlue})`;
