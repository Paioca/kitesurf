import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, type LegalSection } from '../../../components/LegalPage';

export const metadata: Metadata = {
  title: 'Checklist para comprar kite usado | Guia Kitetropos',
  description:
    'Guia prático: o que checar antes de comprar equipamentos de kitesurf usados. Bladder e microfuros, costuras e bordos, linhas e chicken loop, tamanho certo e perguntas para o vendedor.',
  alternates: { canonical: '/guias/checklist-kite-usado' },
};

const sections: LegalSection[] = [
  {
    id: 'tamanho',
    title: 'Comece pelo tamanho certo',
    body: 'O tamanho (em m²) depende do seu peso e do vento do seu spot. Spots de vento forte (como o Nordeste no segundo semestre) pedem kites menores; vento fraco pede maior. Antes de olhar preço, confirme que o tamanho faz sentido pra você. Um kite barato do tamanho errado é caro.',
  },
  {
    id: 'kite',
    title: 'Inspecione o kite (canopy e estrutura)',
    body: 'Infle o kite e deixe parado alguns minutos. Se murchar, há vazamento. Procure microfuros e reparos no bladder, costuras soltas, desbotamento forte (sol degrada o tecido), e cheque bordo de ataque e bordo de fuga. Reparos bem feitos não são problema; o problema é o que não foi declarado.',
  },
  {
    id: 'valvulas',
    title: 'Válvulas e bladder',
    body: 'Cheque as válvulas de inflar/esvaziar e a one-pump (mangueiras que enchem as struts). Bladder com microfuro reparado é comum em usado; bladder ressecado ou com vários remendos pede atenção. Pergunte há quanto tempo o bladder não é trocado.',
  },
  {
    id: 'barra',
    title: 'Barra, linhas e chicken loop',
    body: 'Nas linhas, procure desgaste, nós e diferenças de comprimento (linhas esticadas de forma desigual mudam o trim). Teste o depower e o sistema de segurança (quick release / chicken loop). Ele precisa soltar fácil. Verifique o estado do floater e do centro da barra.',
  },
  {
    id: 'perguntas',
    title: 'Pergunte ao vendedor',
    body: 'Ano e quantidade de uso, se é o primeiro dono, histórico de reparos, motivo da venda, e se acompanha bag e bomba. Na Kitetropos, boa parte disso já está na ficha técnica estruturada do anúncio. Use a conversa para confirmar e combinar a visita.',
  },
  {
    id: 'fechar',
    title: 'Feche com segurança',
    body: 'Sempre que possível, veja e teste pessoalmente antes de pagar. Combine pagamento e entrega diretamente com o vendedor. Lembre: a Kitetropos conecta e dá contexto (telefone verificado, ficha estruturada, contato só com aceite), mas não processa pagamento nem garante os itens. A avaliação final é sua.',
  },
];

export default function ChecklistKiteUsado() {
  return (
    <LegalPage
      eyebrow="Guia"
      title="Checklist para comprar kite usado"
      intro="Um roteiro rápido do que conferir antes de fechar um equipamento de kitesurf usado, do tamanho certo ao bladder, das linhas ao sistema de segurança."
      sections={sections}
      contact={
        <>
          Pronto pra procurar?{' '}
          <Link href="/comprar-kite-usado" style={{ color: '#1f6b5c', fontWeight: 700 }}>Como comprar com segurança</Link>{' '}
          ou{' '}
          <Link href="/" style={{ color: '#1f6b5c', fontWeight: 700 }}>ver kites à venda</Link>.
        </>
      }
    />
  );
}
