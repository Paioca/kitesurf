import type { Config } from 'tailwindcss';

// Estilo do app é dirigido pelos tokens em lib/tokens.ts (design system Kite Life).
// Tailwind fica só pelo reset base; cores/escala não vêm daqui.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};

export default config;
