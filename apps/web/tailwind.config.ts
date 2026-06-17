import type { Config } from 'tailwindcss';

// Paleta "praia/confiança" — mar e areia. Refinar no Bloco 1 (design de confiança).
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: '#eef9ff',
          100: '#d9f0ff',
          500: '#0c92d4',
          600: '#0277b0',
          700: '#075e8d',
          900: '#0c3a52',
        },
        sand: {
          50: '#fbf8f1',
          100: '#f3ead6',
        },
      },
    },
  },
  plugins: [],
};

export default config;
