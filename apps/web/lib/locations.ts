// Taxonomia leve de localizacao dos anuncios.
// O banco ainda salva Listing.city como o spot principal por compatibilidade.
// A UF/cidade real sao derivadas daqui para filtros e UI.
// ATENCAO: os values sao gravados como string em Listing.city e User.spot.
// Nunca renomear um value existente sem migrar os dados junto.
// Nomes que se repetem em mais de um estado levam sufixo entre parenteses.
export type SpotLocation = {
  value: string;
  city: string;
  uf: string;
  state: string;
};

export const SPOT_LOCATIONS: SpotLocation[] = [
  // Ceará
  { value: 'Cumbuco', city: 'Caucaia', uf: 'CE', state: 'Ceará' },
  { value: 'Lagoa do Cauípe', city: 'Caucaia', uf: 'CE', state: 'Ceará' },
  { value: 'Tabuba', city: 'Caucaia', uf: 'CE', state: 'Ceará' },
  { value: 'Fortaleza', city: 'Fortaleza', uf: 'CE', state: 'Ceará' },
  { value: 'Praia do Futuro', city: 'Fortaleza', uf: 'CE', state: 'Ceará' },
  { value: 'Sabiaguaba', city: 'Fortaleza', uf: 'CE', state: 'Ceará' },
  { value: 'Porto das Dunas', city: 'Aquiraz', uf: 'CE', state: 'Ceará' },
  { value: 'Prainha', city: 'Aquiraz', uf: 'CE', state: 'Ceará' },
  { value: 'Barra Nova', city: 'Beberibe', uf: 'CE', state: 'Ceará' },
  { value: 'Lagoa do Uruaú', city: 'Beberibe', uf: 'CE', state: 'Ceará' },
  { value: 'Canoa Quebrada', city: 'Aracati', uf: 'CE', state: 'Ceará' },
  { value: 'Pontal de Maceió', city: 'Fortim', uf: 'CE', state: 'Ceará' },
  { value: 'Rio Jaguaribe', city: 'Fortim', uf: 'CE', state: 'Ceará' },
  { value: 'Ponta Grossa', city: 'Icapuí', uf: 'CE', state: 'Ceará' },
  { value: 'Taíba', city: 'São Gonçalo do Amarante', uf: 'CE', state: 'Ceará' },
  { value: 'Pecém', city: 'São Gonçalo do Amarante', uf: 'CE', state: 'Ceará' },
  { value: 'Paracuru', city: 'Paracuru', uf: 'CE', state: 'Ceará' },
  { value: 'Lagoinha', city: 'Paraipaba', uf: 'CE', state: 'Ceará' },
  { value: 'Guajiru', city: 'Trairi', uf: 'CE', state: 'Ceará' },
  { value: 'Flecheiras', city: 'Trairi', uf: 'CE', state: 'Ceará' },
  { value: 'Mundaú', city: 'Trairi', uf: 'CE', state: 'Ceará' },
  { value: 'Praia da Baleia', city: 'Itapipoca', uf: 'CE', state: 'Ceará' },
  { value: 'Icaraizinho de Amontada', city: 'Amontada', uf: 'CE', state: 'Ceará' },
  { value: 'Moitas', city: 'Amontada', uf: 'CE', state: 'Ceará' },
  { value: 'Ilha do Guajiru', city: 'Itarema', uf: 'CE', state: 'Ceará' },
  { value: 'Praia dos Patos', city: 'Itarema', uf: 'CE', state: 'Ceará' },
  { value: 'Arpoeiras', city: 'Acaraú', uf: 'CE', state: 'Ceará' },
  { value: 'Preá', city: 'Cruz', uf: 'CE', state: 'Ceará' },
  { value: 'Barrinha (Cruz)', city: 'Cruz', uf: 'CE', state: 'Ceará' },
  { value: 'Jericoacoara', city: 'Jijoca de Jericoacoara', uf: 'CE', state: 'Ceará' },
  { value: 'Guriú', city: 'Jijoca de Jericoacoara', uf: 'CE', state: 'Ceará' },
  { value: 'Tatajuba', city: 'Camocim', uf: 'CE', state: 'Ceará' },
  { value: 'Lago Grande', city: 'Camocim', uf: 'CE', state: 'Ceará' },
  { value: 'Barra dos Remédios', city: 'Camocim', uf: 'CE', state: 'Ceará' },
  { value: 'Maceió (Camocim)', city: 'Camocim', uf: 'CE', state: 'Ceará' },
  // Rio Grande do Norte
  { value: 'Ponta do Santo Cristo', city: 'São Miguel do Gostoso', uf: 'RN', state: 'Rio Grande do Norte' },
  { value: 'Praia do Cardeiro', city: 'São Miguel do Gostoso', uf: 'RN', state: 'Rio Grande do Norte' },
  { value: 'Praia da Xêpa', city: 'São Miguel do Gostoso', uf: 'RN', state: 'Rio Grande do Norte' },
  { value: 'Tourinhos', city: 'São Miguel do Gostoso', uf: 'RN', state: 'Rio Grande do Norte' },
  { value: 'Praia do Marco', city: 'Touros', uf: 'RN', state: 'Rio Grande do Norte' },
  { value: 'Galinhos', city: 'Galinhos', uf: 'RN', state: 'Rio Grande do Norte' },
  { value: 'Guamaré', city: 'Guamaré', uf: 'RN', state: 'Rio Grande do Norte' },
  { value: 'Diogo Lopes', city: 'Macau', uf: 'RN', state: 'Rio Grande do Norte' },
  { value: 'Ponta do Mel', city: 'Areia Branca', uf: 'RN', state: 'Rio Grande do Norte' },
  { value: 'Tibau do Sul', city: 'Tibau do Sul', uf: 'RN', state: 'Rio Grande do Norte' },
  { value: 'Pipa', city: 'Tibau do Sul', uf: 'RN', state: 'Rio Grande do Norte' },
  { value: 'Barra do Cunhaú', city: 'Canguaretama', uf: 'RN', state: 'Rio Grande do Norte' },
  { value: 'Búzios (RN)', city: 'Nísia Floresta', uf: 'RN', state: 'Rio Grande do Norte' },
  { value: 'Redinha', city: 'Natal', uf: 'RN', state: 'Rio Grande do Norte' },
  { value: 'Genipabu', city: 'Extremoz', uf: 'RN', state: 'Rio Grande do Norte' },
  // Piauí
  { value: 'Barra Grande (PI)', city: 'Cajueiro da Praia', uf: 'PI', state: 'Piauí' },
  { value: 'Barrinha (PI)', city: 'Cajueiro da Praia', uf: 'PI', state: 'Piauí' },
  { value: 'Macapá', city: 'Luís Correia', uf: 'PI', state: 'Piauí' },
  { value: 'Coqueiro', city: 'Luís Correia', uf: 'PI', state: 'Piauí' },
  { value: 'Arrombado', city: 'Luís Correia', uf: 'PI', state: 'Piauí' },
  { value: 'Delta do Parnaíba', city: 'Parnaíba', uf: 'PI', state: 'Piauí' },
  { value: 'Pedra do Sal', city: 'Parnaíba', uf: 'PI', state: 'Piauí' },
  // Maranhão
  { value: 'Atins', city: 'Barreirinhas', uf: 'MA', state: 'Maranhão' },
  { value: 'Caburé', city: 'Barreirinhas', uf: 'MA', state: 'Maranhão' },
  { value: 'Mandacaru', city: 'Barreirinhas', uf: 'MA', state: 'Maranhão' },
  { value: 'Santo Amaro', city: 'Santo Amaro', uf: 'MA', state: 'Maranhão' },
  { value: 'Betânia', city: 'Santo Amaro', uf: 'MA', state: 'Maranhão' },
  { value: 'Paulino Neves', city: 'Paulino Neves', uf: 'MA', state: 'Maranhão' },
  { value: 'Tutóia', city: 'Tutóia', uf: 'MA', state: 'Maranhão' },
  { value: 'Raposa', city: 'Raposa', uf: 'MA', state: 'Maranhão' },
  { value: 'Praia do Araçagy', city: 'São Luís', uf: 'MA', state: 'Maranhão' },
  { value: 'Praia de São Marcos', city: 'São Luís', uf: 'MA', state: 'Maranhão' },
  { value: 'Panaquatira', city: 'São José de Ribamar', uf: 'MA', state: 'Maranhão' },
  // Pernambuco
  { value: 'Boa Viagem', city: 'Recife', uf: 'PE', state: 'Pernambuco' },
  { value: 'Piedade', city: 'Jaboatão dos Guararapes', uf: 'PE', state: 'Pernambuco' },
  { value: 'Maria Farinha', city: 'Paulista', uf: 'PE', state: 'Pernambuco' },
  { value: 'Coroa do Avião', city: 'Igarassu', uf: 'PE', state: 'Pernambuco' },
  { value: 'Porto de Galinhas', city: 'Ipojuca', uf: 'PE', state: 'Pernambuco' },
  { value: 'Maracaípe', city: 'Ipojuca', uf: 'PE', state: 'Pernambuco' },
  { value: 'Barra de Sirinhaém', city: 'Sirinhaém', uf: 'PE', state: 'Pernambuco' },
  { value: 'São José da Coroa Grande', city: 'São José da Coroa Grande', uf: 'PE', state: 'Pernambuco' },
  // Paraíba
  { value: 'Bessa', city: 'João Pessoa', uf: 'PB', state: 'Paraíba' },
  { value: 'Cabo Branco', city: 'João Pessoa', uf: 'PB', state: 'Paraíba' },
  { value: 'Intermares', city: 'Cabedelo', uf: 'PB', state: 'Paraíba' },
  { value: 'Ponta de Campina', city: 'Cabedelo', uf: 'PB', state: 'Paraíba' },
  { value: 'Lucena', city: 'Lucena', uf: 'PB', state: 'Paraíba' },
  { value: 'Barra de Camaratuba', city: 'Mataraca', uf: 'PB', state: 'Paraíba' },
  // Alagoas
  { value: 'Pajuçara', city: 'Maceió', uf: 'AL', state: 'Alagoas' },
  { value: 'Jatiúca', city: 'Maceió', uf: 'AL', state: 'Alagoas' },
  { value: 'Barra de São Miguel', city: 'Barra de São Miguel', uf: 'AL', state: 'Alagoas' },
  { value: 'Lagoa do Roteiro', city: 'Roteiro', uf: 'AL', state: 'Alagoas' },
  { value: 'São Miguel dos Milagres', city: 'São Miguel dos Milagres', uf: 'AL', state: 'Alagoas' },
  { value: 'Japaratinga', city: 'Japaratinga', uf: 'AL', state: 'Alagoas' },
  { value: 'Maragogi', city: 'Maragogi', uf: 'AL', state: 'Alagoas' },
  { value: 'Pontal do Peba', city: 'Piaçabuçu', uf: 'AL', state: 'Alagoas' },
  // Sergipe
  { value: 'Atalaia', city: 'Aracaju', uf: 'SE', state: 'Sergipe' },
  { value: 'Coroa do Meio', city: 'Aracaju', uf: 'SE', state: 'Sergipe' },
  { value: 'Barra dos Coqueiros', city: 'Barra dos Coqueiros', uf: 'SE', state: 'Sergipe' },
  { value: 'Praia do Saco', city: 'Estância', uf: 'SE', state: 'Sergipe' },
  { value: 'Pirambu', city: 'Pirambu', uf: 'SE', state: 'Sergipe' },
  // Bahia
  { value: 'Stella Maris', city: 'Salvador', uf: 'BA', state: 'Bahia' },
  { value: 'Praia de Aleluia', city: 'Salvador', uf: 'BA', state: 'Bahia' },
  { value: 'Itapuã', city: 'Salvador', uf: 'BA', state: 'Bahia' },
  { value: 'Ipitanga', city: 'Lauro de Freitas', uf: 'BA', state: 'Bahia' },
  { value: 'Busca Vida', city: 'Camaçari', uf: 'BA', state: 'Bahia' },
  { value: 'Buraquinho', city: 'Camaçari', uf: 'BA', state: 'Bahia' },
  { value: 'Guarajuba', city: 'Camaçari', uf: 'BA', state: 'Bahia' },
  { value: 'Praia do Forte', city: 'Mata de São João', uf: 'BA', state: 'Bahia' },
  { value: 'Imbassaí', city: 'Mata de São João', uf: 'BA', state: 'Bahia' },
  { value: 'Subaúma', city: 'Conde', uf: 'BA', state: 'Bahia' },
  { value: 'Mangue Seco', city: 'Jandaíra', uf: 'BA', state: 'Bahia' },
  { value: 'Ilha de Itaparica', city: 'Vera Cruz', uf: 'BA', state: 'Bahia' },
  { value: 'Morro de São Paulo', city: 'Cairu', uf: 'BA', state: 'Bahia' },
  { value: 'Gamboa', city: 'Cairu', uf: 'BA', state: 'Bahia' },
  { value: 'Barra Grande (Maraú)', city: 'Maraú', uf: 'BA', state: 'Bahia' },
  { value: 'Taipu de Fora', city: 'Maraú', uf: 'BA', state: 'Bahia' },
  { value: 'Itacaré', city: 'Itacaré', uf: 'BA', state: 'Bahia' },
  { value: 'Ilhéus', city: 'Ilhéus', uf: 'BA', state: 'Bahia' },
  { value: "Arraial d'Ajuda", city: 'Porto Seguro', uf: 'BA', state: 'Bahia' },
  { value: 'Trancoso', city: 'Porto Seguro', uf: 'BA', state: 'Bahia' },
  { value: 'Cumuruxatiba', city: 'Prado', uf: 'BA', state: 'Bahia' },
  { value: 'Corumbau', city: 'Prado', uf: 'BA', state: 'Bahia' },
  // Espírito Santo
  { value: 'Camburi', city: 'Vitória', uf: 'ES', state: 'Espírito Santo' },
  { value: 'Praia da Costa', city: 'Vila Velha', uf: 'ES', state: 'Espírito Santo' },
  { value: 'Itaparica (ES)', city: 'Vila Velha', uf: 'ES', state: 'Espírito Santo' },
  { value: 'Setiba', city: 'Guarapari', uf: 'ES', state: 'Espírito Santo' },
  { value: 'Meaípe', city: 'Guarapari', uf: 'ES', state: 'Espírito Santo' },
  { value: 'Iriri', city: 'Anchieta', uf: 'ES', state: 'Espírito Santo' },
  { value: 'Marataízes', city: 'Marataízes', uf: 'ES', state: 'Espírito Santo' },
  { value: 'Barra do Sahy (ES)', city: 'Aracruz', uf: 'ES', state: 'Espírito Santo' },
  { value: 'Regência', city: 'Linhares', uf: 'ES', state: 'Espírito Santo' },
  { value: 'Itaúnas', city: 'Conceição da Barra', uf: 'ES', state: 'Espírito Santo' },
  // Rio de Janeiro
  { value: 'Barra da Tijuca', city: 'Rio de Janeiro', uf: 'RJ', state: 'Rio de Janeiro' },
  { value: 'Recreio', city: 'Rio de Janeiro', uf: 'RJ', state: 'Rio de Janeiro' },
  { value: 'Praia da Macumba', city: 'Rio de Janeiro', uf: 'RJ', state: 'Rio de Janeiro' },
  { value: 'Itaipu', city: 'Niterói', uf: 'RJ', state: 'Rio de Janeiro' },
  { value: 'Itaipuaçu', city: 'Maricá', uf: 'RJ', state: 'Rio de Janeiro' },
  { value: 'Itaúna', city: 'Saquarema', uf: 'RJ', state: 'Rio de Janeiro' },
  { value: 'Praia Seca', city: 'Araruama', uf: 'RJ', state: 'Rio de Janeiro' },
  { value: 'Pontinha', city: 'Araruama', uf: 'RJ', state: 'Rio de Janeiro' },
  { value: 'Ponta da Alcaíra', city: 'Araruama', uf: 'RJ', state: 'Rio de Janeiro' },
  { value: 'Arubinha', city: 'Araruama', uf: 'RJ', state: 'Rio de Janeiro' },
  { value: 'Praia do Foguete', city: 'Cabo Frio', uf: 'RJ', state: 'Rio de Janeiro' },
  { value: 'Praia das Conchas', city: 'Cabo Frio', uf: 'RJ', state: 'Rio de Janeiro' },
  { value: 'Lagoa de Araruama', city: 'São Pedro da Aldeia', uf: 'RJ', state: 'Rio de Janeiro' },
  { value: 'Praia Grande (Arraial do Cabo)', city: 'Arraial do Cabo', uf: 'RJ', state: 'Rio de Janeiro' },
  { value: 'Manguinhos', city: 'Armação dos Búzios', uf: 'RJ', state: 'Rio de Janeiro' },
  { value: 'Rasa', city: 'Armação dos Búzios', uf: 'RJ', state: 'Rio de Janeiro' },
  { value: 'Tucuns', city: 'Armação dos Búzios', uf: 'RJ', state: 'Rio de Janeiro' },
  // São Paulo
  { value: 'Represa de Guarapiranga', city: 'São Paulo', uf: 'SP', state: 'São Paulo' },
  { value: 'Ilhabela', city: 'Ilhabela', uf: 'SP', state: 'São Paulo' },
  { value: 'Barra do Una', city: 'São Sebastião', uf: 'SP', state: 'São Paulo' },
  { value: 'Juquehy', city: 'São Sebastião', uf: 'SP', state: 'São Paulo' },
  { value: 'Maresias', city: 'São Sebastião', uf: 'SP', state: 'São Paulo' },
  { value: 'Boraceia', city: 'Bertioga', uf: 'SP', state: 'São Paulo' },
  { value: 'Santos', city: 'Santos', uf: 'SP', state: 'São Paulo' },
  { value: 'Praia Grande (SP)', city: 'Praia Grande', uf: 'SP', state: 'São Paulo' },
  { value: 'Peruíbe', city: 'Peruíbe', uf: 'SP', state: 'São Paulo' },
  { value: 'Itamambuca', city: 'Ubatuba', uf: 'SP', state: 'São Paulo' },
  { value: 'Caraguatatuba', city: 'Caraguatatuba', uf: 'SP', state: 'São Paulo' },
  // Paraná
  { value: 'Pontal do Paraná', city: 'Pontal do Paraná', uf: 'PR', state: 'Paraná' },
  { value: 'Ilha do Mel', city: 'Paranaguá', uf: 'PR', state: 'Paraná' },
  { value: 'Caiobá', city: 'Matinhos', uf: 'PR', state: 'Paraná' },
  { value: 'Guaratuba', city: 'Guaratuba', uf: 'PR', state: 'Paraná' },
  // Santa Catarina
  { value: 'Lagoa da Conceição', city: 'Florianópolis', uf: 'SC', state: 'Santa Catarina' },
  { value: 'Rio Tavares', city: 'Florianópolis', uf: 'SC', state: 'Santa Catarina' },
  { value: 'Campeche', city: 'Florianópolis', uf: 'SC', state: 'Santa Catarina' },
  { value: 'Joaquina', city: 'Florianópolis', uf: 'SC', state: 'Santa Catarina' },
  { value: 'Moçambique', city: 'Florianópolis', uf: 'SC', state: 'Santa Catarina' },
  { value: 'Barra da Lagoa', city: 'Florianópolis', uf: 'SC', state: 'Santa Catarina' },
  { value: 'Jurerê', city: 'Florianópolis', uf: 'SC', state: 'Santa Catarina' },
  { value: 'Daniela', city: 'Florianópolis', uf: 'SC', state: 'Santa Catarina' },
  { value: 'Guarda do Embaú', city: 'Palhoça', uf: 'SC', state: 'Santa Catarina' },
  { value: 'Garopaba', city: 'Garopaba', uf: 'SC', state: 'Santa Catarina' },
  { value: 'Ibiraquera', city: 'Imbituba', uf: 'SC', state: 'Santa Catarina' },
  { value: 'Praia do Rosa', city: 'Imbituba', uf: 'SC', state: 'Santa Catarina' },
  { value: 'Laguna', city: 'Laguna', uf: 'SC', state: 'Santa Catarina' },
  { value: 'Balneário Camboriú', city: 'Balneário Camboriú', uf: 'SC', state: 'Santa Catarina' },
  { value: 'Navegantes', city: 'Navegantes', uf: 'SC', state: 'Santa Catarina' },
  { value: 'Barra Velha', city: 'Barra Velha', uf: 'SC', state: 'Santa Catarina' },
  { value: 'São Francisco do Sul', city: 'São Francisco do Sul', uf: 'SC', state: 'Santa Catarina' },
  { value: 'Itapoá', city: 'Itapoá', uf: 'SC', state: 'Santa Catarina' },
  // Rio Grande do Sul
  { value: 'Torres', city: 'Torres', uf: 'RS', state: 'Rio Grande do Sul' },
  { value: 'Capão da Canoa', city: 'Capão da Canoa', uf: 'RS', state: 'Rio Grande do Sul' },
  { value: 'Atlântida', city: 'Xangri-lá', uf: 'RS', state: 'Rio Grande do Sul' },
  { value: 'Tramandaí', city: 'Tramandaí', uf: 'RS', state: 'Rio Grande do Sul' },
  { value: 'Lagoa dos Barros', city: 'Osório', uf: 'RS', state: 'Rio Grande do Sul' },
  { value: 'Lagoa dos Patos (Tapes)', city: 'Tapes', uf: 'RS', state: 'Rio Grande do Sul' },
  { value: 'São Lourenço do Sul', city: 'São Lourenço do Sul', uf: 'RS', state: 'Rio Grande do Sul' },
  { value: 'Lagoa dos Patos (Pelotas)', city: 'Pelotas', uf: 'RS', state: 'Rio Grande do Sul' },
  { value: 'Praia do Cassino', city: 'Rio Grande', uf: 'RS', state: 'Rio Grande do Sul' },
  // Lagos do interior
  { value: 'Lago Paranoá', city: 'Brasília', uf: 'DF', state: 'Distrito Federal' },
  { value: 'Lago Corumbá IV', city: 'Alexânia', uf: 'GO', state: 'Goiás' },
  { value: 'Lago Serra da Mesa', city: 'Niquelândia', uf: 'GO', state: 'Goiás' },
  { value: 'Lago de Furnas', city: 'Capitólio', uf: 'MG', state: 'Minas Gerais' },
  { value: 'Represa de Três Marias', city: 'Três Marias', uf: 'MG', state: 'Minas Gerais' },
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
