// Termos de Uso factuais da Fase 0. Revisão jurídica externa continua recomendada.
import { LegalPage, type LegalSection } from '../../components/LegalPage';
import Link from 'next/link';

export const metadata = { title: 'Termos de Uso | Kitetropos' };

const sections: LegalSection[] = [
  { id: 'o-que-e', title: 'O que é a Kitetropos', body: 'A Kitetropos é uma plataforma que conecta pessoas que compram e vendem equipamento de kitesurf. A Kitetropos não é parte das negociações: não vende, não compra, não intermedia pagamento e não garante os itens anunciados. O negócio é feito diretamente entre comprador e vendedor.' },
  { id: 'conta', title: 'Conta e verificação', body: 'O acesso é por telefone verificado (1 número = 1 conta). Você é responsável por manter seus dados corretos e pelo uso da sua conta. Foto de perfil é obrigatória como camada de confiança da comunidade.' },
  { id: 'anuncios', title: 'Anúncios', body: 'Os anúncios devem descrever o equipamento com honestidade. Omitir informações relevantes, como estado, reparos ou furos, pode levar à remoção do anúncio e à restrição da conta. É proibido anunciar itens ilícitos ou que você não tenha o direito de vender.' },
  { id: 'contato', title: 'Contato e negociação', body: 'O comprador pode fazer uma oferta ou pedir uma visita. Ao enviar o pedido, compartilha seu contato com o vendedor. Quando o vendedor demonstra interesse, libera seu WhatsApp ao comprador. Demonstrar interesse não confirma preço nem conclui a venda; o restante é combinado diretamente entre as partes.' },
  { id: 'custos', title: 'Custos e pagamento', body: 'Na Fase 0, anunciar e negociar é gratuito. A Kitetropos não processa pagamentos nem cobra comissão. Pagamento, entrega e eventuais ajustes de preço são responsabilidade de comprador e vendedor.' },
  { id: 'conduta', title: 'Conduta e reputação', body: 'A reputação é construída por negócios confirmados pelos dois lados e por avaliações mútuas. É proibido manipular avaliações, criar contas falsas ou usar a plataforma para spam, fraude ou assédio.' },
  { id: 'responsa', title: 'Limitação de responsabilidade', body: 'A Kitetropos disponibiliza a plataforma "como está". Não nos responsabilizamos por danos, perdas ou prejuízos decorrentes de negociações entre usuários. Avalie o equipamento pessoalmente antes de fechar negócio.' },
  { id: 'alteracoes', title: 'Alterações', body: 'Estes termos podem ser atualizados. Mudanças relevantes serão comunicadas dentro da plataforma.' },
];

export default function Termos() {
  return (
    <LegalPage
      title="Termos de uso"
      updated="Atualizados em junho de 2026 · Fase 0"
      intro="A Kitetropos é um marketplace que conecta pessoas que compram e vendem equipamento de kitesurf. Não somos parte da negociação, não processamos pagamento e não fazemos a entrega. Ao usar a plataforma você concorda com os termos abaixo."
      sections={sections}
      crossLabel="Política de privacidade"
      crossHref="/privacidade"
      contact={<>Estes termos descrevem o funcionamento atual da Fase 0 e podem ser atualizados conforme a plataforma evolui. Veja também a <Link href="/privacidade" style={{ color: '#1f6b5c', fontWeight: 700 }}>Política de privacidade</Link>.</>}
    />
  );
}
