import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, type LegalSection } from '../../components/LegalPage';

export const metadata: Metadata = {
  title: 'Comprar kite usado com segurança | Kitetropos',
  description:
    'Como comprar kite e barra usados com segurança na Kitetropos: anúncios com ficha técnica e fotos, vendedor com telefone verificado, oferta ou pedido de visita, e contato pelo WhatsApp só com aceite.',
  alternates: { canonical: '/comprar-kite-usado' },
};

const sections: LegalSection[] = [
  {
    id: 'busca',
    title: 'Busque pelo que importa',
    body: 'Filtre por tipo (kite, barra ou kit), tamanho em m², estado, cidade e spot. Cada anúncio traz a ficha técnica estruturada — marca, modelo, ano, condição, reparos, microfuros e bladder — para você comparar de verdade antes de chamar.',
  },
  {
    id: 'avaliar-anuncio',
    title: 'Avalie o anúncio antes de chamar',
    body: 'Olhe as fotos (geral, etiqueta de tamanho, válvulas e bordas, reparos) e a ficha completa. Anúncios honestos descrevem o estado real — desgaste, reparos e microfuros. Desconfie de anúncio sem detalhe ou com preço muito fora da curva.',
  },
  {
    id: 'oferta-visita',
    title: 'Faça uma oferta ou peça uma visita',
    body: 'Em vez de "ainda tem?", você envia um pedido estruturado: uma oferta ou um pedido para ver o equipamento de perto. Quando o vendedor aceita, o WhatsApp dele é liberado e vocês combinam o resto diretamente.',
  },
  {
    id: 'seguranca',
    title: 'Feche com segurança',
    body: 'Sempre que possível, veja e teste o equipamento pessoalmente antes de pagar — infle o kite, cheque bladder e costuras, confira as linhas e a barra. Combine pagamento e entrega diretamente com o vendedor. A Kitetropos conecta e dá contexto, mas não processa pagamento nem garante os itens.',
  },
  {
    id: 'reputacao',
    title: 'Reputação e telefone verificado',
    body: 'Todo vendedor tem telefone verificado, e a reputação na plataforma vem de negócios confirmados pelos dois lados, com avaliações mútuas. Use isso a seu favor ao escolher de quem comprar.',
  },
];

export default function ComprarKiteUsado() {
  return (
    <LegalPage
      eyebrow="Para compradores"
      title="Comprar kite usado com segurança"
      intro="Comprar kite e barra usados não precisa ser um tiro no escuro. Na Kitetropos, cada anúncio traz ficha técnica, fotos e um vendedor com telefone verificado — e o contato é liberado só quando há interesse real."
      sections={sections}
      contact={
        <>
          <Link href="/" style={{ color: '#1f6b5c', fontWeight: 700 }}>Ver kites à venda</Link>{' '}
          ou entenda{' '}
          <Link href="/como-funciona" style={{ color: '#1f6b5c', fontWeight: 700 }}>como funciona</Link>. Vai comprar usado? Veja o{' '}
          <Link href="/guias/checklist-kite-usado" style={{ color: '#1f6b5c', fontWeight: 700 }}>checklist</Link>.
        </>
      }
    />
  );
}
