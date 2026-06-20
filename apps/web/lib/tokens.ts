// Design system Kitetropos — fonte única da verdade.
// Conforme o Design Book v2 (handoff Claude Design). A paleta não mudou no rebrand.
// Não inventar valores fora daqui.

export const color = {
  bg: '#f6f3ec', // creme — fundo do app
  surface: '#ffffff',
  ink: '#23332e', // texto principal (verde escuro)
  inkSoft: '#48564f', // labels
  inkMute: '#6b7a73', // subtítulos
  inkFaint: '#8a948d', // hints
  inkFaint2: '#9aa49d',
  inkFaint3: '#a8b1aa',
  primary: '#1f6b5c', // verde-petróleo (ações)
  primaryDeep: 'rgba(20,72,62,0.92)', // badges sobre foto
  accent: '#d9a86b', // areia (CTA secundário / Anunciar) · losango da marca no escuro
  accentInk: '#3a2e18',
  aqua: '#7fbcae', // verde-água — "tropos" do logo sobre fundo escuro
  gold: '#e7c79a', // sobre fundo escuro
  heart: '#c0492f',
  // linhas / bordas
  line: '#e6dfd0',
  lineCard: '#ece6d8',
  lineInput: '#e0d9c9',
  lineChip: '#ddd5c5',
  lineDashed: '#cbc3b2',
  // superfícies de apoio
  tabTrack: '#efe9dc',
  chipSoftBg: '#f2f8f5',
  chipSoftLine: '#cfe3d9',
  // fundo escuro (hero / split de cadastro)
  dark: '#0c2520',
  darkBlue: '#0c3a52',
} as const;

export const font = {
  sans: "'Archivo', system-ui, -apple-system, sans-serif",
  serif: "'Spectral', Georgia, serif",
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
