import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, type LegalSection } from '../../components/LegalPage';

export const metadata: Metadata = {
  title: 'Como funciona a Kitetropos | do anúncio à conversa',
  description:
    'Como funciona a Kitetropos: anuncie ou encontre kite e barra usados, envie pedido de visita ou oferta, e o WhatsApp do vendedor é liberado só quando ele aceita. Telefone verificado e anúncios estruturados.',
  alternates: { canonical: '/como-funciona' },
};

const sections: LegalSection[] = [
  {
    id: 'encontre-ou-anuncie',
    title: '1. Encontre ou anuncie',
    body: 'Compradores veem fotos, tamanho (m²), condição, cidade, spot e a ficha técnica completa antes de chamar. Vendedores criam um anúncio com fotos e ficha estruturada — o telefone é verificado antes de publicar, como camada de confiança.',
  },
  {
    id: 'oferta-ou-visita',
    title: '2. Faça uma oferta ou peça uma visita',
    body: 'Em vez de "tem interesse?", o comprador envia um pedido estruturado: uma oferta de preço ou um pedido de visita para ver o equipamento de perto. Isso filtra curioso de comprador real e poupa o tempo dos dois lados.',
  },
  {
    id: 'whatsapp-liberado',
    title: '3. O WhatsApp é liberado só com aceite',
    body: 'O contato do vendedor não fica exposto. Quando ele demonstra interesse no pedido, o WhatsApp é liberado para o comprador e a conversa segue direto entre vocês. Demonstrar interesse não confirma preço nem conclui a venda — o restante é combinado entre as partes.',
  },
  {
    id: 'fechem-e-avaliem',
    title: '4. Fechem entre vocês e avaliem',
    body: 'Preço, pagamento e entrega são combinados diretamente entre comprador e vendedor — a Kitetropos não processa pagamento nem faz a entrega. Se a venda acontecer, os dois confirmam o negócio e podem deixar uma avaliação. É assim que a reputação real é construída na plataforma.',
  },
  {
    id: 'seguranca',
    title: 'Por que esse modelo é mais seguro',
    body: 'Telefone verificado antes de anunciar, perfil com foto, contato liberado só quando faz sentido e reputação por negócios confirmados reduzem o ruído e o risco do mercado de usados. Ainda assim, avalie o equipamento pessoalmente antes de fechar — a Kitetropos não garante os itens.',
  },
];

export default function ComoFunciona() {
  return (
    <LegalPage
      eyebrow="Como funciona"
      title="Do anúncio à conversa"
      intro="A Kitetropos ajuda você a encontrar, avaliar e iniciar a conversa sobre kite e barra usados. Preço, pagamento e entrega ficam combinados diretamente entre comprador e vendedor."
      sections={sections}
      contact={
        <>
          Pronto pra começar?{' '}
          <Link href="/" style={{ color: '#1f6b5c', fontWeight: 700 }}>Buscar equipamentos</Link>{' '}
          ou{' '}
          <Link href="/anunciar" style={{ color: '#1f6b5c', fontWeight: 700 }}>anunciar o seu</Link>.
        </>
      }
    />
  );
}
