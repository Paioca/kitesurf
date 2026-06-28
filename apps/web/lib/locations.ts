// Taxonomia leve de localizacao dos anuncios.
// O banco ainda salva Listing.city como o spot principal por compatibilidade.
// A UF/cidade real sao derivadas daqui para filtros e UI.
export type SpotLocation = {
  value: string;
  city: string;
  uf: string;
  state: string;
};

export const SPOT_LOCATIONS: SpotLocation[] = [
  { value: 'Cumbuco', city: 'Caucaia', uf: 'CE', state: 'Ceará' },
  { value: 'Taíba', city: 'São Gonçalo do Amarante', uf: 'CE', state: 'Ceará' },
  { value: 'Fortaleza', city: 'Fortaleza', uf: 'CE', state: 'Ceará' },
  { value: 'Praia do Futuro', city: 'Fortaleza', uf: 'CE', state: 'Ceará' },
  { value: 'Paracuru', city: 'Paracuru', uf: 'CE', state: 'Ceará' },
  { value: 'Ilha do Guajiru', city: 'Itarema', uf: 'CE', state: 'Ceará' },
  { value: 'Preá', city: 'Cruz', uf: 'CE', state: 'Ceará' },
  { value: 'Lagoa da Conceição', city: 'Florianópolis', uf: 'SC', state: 'Santa Catarina' },
  { value: 'Ibiraquera', city: 'Imbituba', uf: 'SC', state: 'Santa Catarina' },
];

export const SPOTS = SPOT_LOCATIONS.map((s) => s.value);

export const STATE_OPTIONS = Array.from(
  new Map(SPOT_LOCATIONS.map((s) => [s.uf, { value: s.uf, label: s.state }])).values(),
);

export function isKnownSpot(value: string) {
  return SPOTS.includes(value);
}

export function stateForSpot(spot: string): string | null {
  return SPOT_LOCATIONS.find((s) => s.value === spot)?.uf ?? null;
}

export function stateLabel(uf: string): string {
  return STATE_OPTIONS.find((s) => s.value === uf)?.label ?? uf;
}

export function statePhrasePt(uf: string): string {
  const label = stateLabel(uf);
  if (uf === 'CE') return `no ${label}`;
  return `em ${label}`;
}

export function spotsForStates(ufs: readonly string[]): string[] {
  if (!ufs.length) return [];
  const selected = new Set(ufs);
  return SPOT_LOCATIONS.filter((s) => selected.has(s.uf)).map((s) => s.value);
}
