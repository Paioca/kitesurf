import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, type LegalSection } from '../../components/LegalPage';

export const metadata: Metadata = {
  title: 'Sobre a Kitetropos | equipamentos de kitesurf e wing com mais confiança',
  description:
    'A Kitetropos é um marketplace brasileiro de equipamentos de kitesurf e wing usados. Conecta vendedores e compradores em todo o Brasil com telefone verificado, anúncios estruturados e contato pelo WhatsApp.',
  alternates: { canonical: '/sobre' },
};

const sections: LegalSection[] = [
  {
    id: 'origem',
    title: 'Uma plataforma nacional para kitesurfistas',
    body: 'A Kitetropos foi criada para dar mais contexto e confiança ao mercado de equipamento usado no Brasil. Unimos a paixão pelo esporte com a curadoria de quem entende cada rajada de vento. Mais que um marketplace, queremos ser o elo de confiança entre kitesurfistas de todos os spots do país.',
  },
  {
    id: 'o-que-somos',
    title: 'O que a Kitetropos é (e o que não é)',
    body: 'A Kitetropos é uma plataforma que conecta pessoas que compram e vendem equipamentos de kitesurf e wing usados (kites, barras, kits e wings). Não vendemos nem compramos equipamento, não processamos pagamento, não fazemos a entrega e não garantimos os itens. Preço, pagamento e entrega são combinados diretamente entre comprador e vendedor. A gente cuida do encontro e da confiança.',
  },
  {
    id: 'confianca',
    title: 'Confiança como base',
    body: 'Todo anúncio vem de um vendedor com telefone verificado, com ficha técnica estruturada e fotos. O contato (WhatsApp) só é liberado quando o vendedor aceita o interesse do comprador, evitando conversa solta e perda de tempo. Depois de uma negociação confirmada pelos dois lados, comprador e vendedor podem deixar uma avaliação. A reputação é construída por negócios reais.',
  },
  {
    id: 'para-quem',
    title: 'Para quem é',
    body: 'Para a comunidade de kitesurf no Brasil: quem quer vender equipamentos de kitesurf, e quem quer comprar usado com mais informação e menos risco em qualquer spot do país.',
  },
];

export default function Sobre() {
  return (
    <LegalPage
      eyebrow="Sobre"
      title="Sobre a Kitetropos"
      intro="A Kitetropos é um marketplace brasileiro de equipamentos de kitesurf usados. Conecta quem vende e quem compra em todo o Brasil com mais contexto, telefone verificado e contato direto pelo WhatsApp."
      sections={sections}
      contact={
        <>
          Quer entender o passo a passo? Veja{' '}
          <Link href="/como-funciona" style={{ color: '#1f6b5c', fontWeight: 700 }}>como funciona</Link>{' '}
          ou comece a{' '}
          <Link href="/" style={{ color: '#1f6b5c', fontWeight: 700 }}>buscar equipamentos</Link>.
        </>
      }
    />
  );
}
