import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, type LegalSection } from '../../components/LegalPage';

export const metadata: Metadata = {
  title: 'Vender kite usado | anuncie na Kitetropos',
  description:
    'Como vender seu kite ou barra usados na Kitetropos: crie um anúncio com fotos e ficha técnica, telefone verificado, receba ofertas e pedidos de visita, e libere seu WhatsApp só quando quiser. Anunciar é gratuito na Fase 0.',
  alternates: { canonical: '/vender-kite-usado' },
};

const sections: LegalSection[] = [
  {
    id: 'anuncio-bom',
    title: 'Monte um anúncio que vende',
    body: 'Fotos boas (geral, marca e modelo, etiqueta de tamanho, válvulas e bordas, e os reparos se houver) e uma ficha honesta — marca, modelo, ano, tamanho, condição, reparos, microfuros e bladder. Quanto mais claro o estado real, mais rápido vem o comprador certo.',
  },
  {
    id: 'telefone-verificado',
    title: 'Telefone verificado, contato protegido',
    body: 'Você confirma seu telefone antes de anunciar — é a camada de confiança da comunidade. Seu WhatsApp não fica exposto no anúncio: ele só é liberado para o comprador quando você aceita o interesse dele.',
  },
  {
    id: 'pedidos',
    title: 'Receba ofertas e pedidos de visita',
    body: 'Em vez de mensagens soltas, você recebe pedidos estruturados: uma oferta de preço ou um pedido de visita. Você decide quando demonstrar interesse e liberar o contato — sem perder tempo com curioso.',
  },
  {
    id: 'fechar',
    title: 'Feche direto com o comprador',
    body: 'Preço, pagamento e entrega são combinados diretamente entre vocês — a Kitetropos não cobra comissão nem processa pagamento. Na Fase 0, anunciar e negociar é gratuito.',
  },
  {
    id: 'reputacao',
    title: 'Construa reputação',
    body: 'Depois de uma negociação confirmada pelos dois lados, comprador e vendedor podem se avaliar. Negócios reais constroem uma reputação que ajuda nas próximas vendas.',
  },
];

export default function VenderKiteUsado() {
  return (
    <LegalPage
      eyebrow="Para vendedores"
      title="Vender seu kite usado"
      intro="Anuncie seu kite ou barra com menos conversa perdida. Na Kitetropos você cria um anúncio estruturado, mantém o telefone verificado e libera o WhatsApp só quando o interesse é real."
      sections={sections}
      contact={
        <>
          <Link href="/anunciar" style={{ color: '#1f6b5c', fontWeight: 700 }}>Anunciar meu kite</Link>{' '}
          ou entenda{' '}
          <Link href="/como-funciona" style={{ color: '#1f6b5c', fontWeight: 700 }}>como funciona</Link>.
        </>
      }
    />
  );
}
