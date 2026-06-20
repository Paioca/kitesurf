// Termos de Uso — versão inicial (Fase 0). Conteúdo jurídico final entra depois.
import { LegalPage, type LegalSection } from '../../components/LegalPage';

export const metadata = { title: 'Termos de Uso — Kitetropos' };

const sections: LegalSection[] = [
  { id: 'o-que-e', title: 'O que é a Kitetropos', body: 'A Kitetropos é uma plataforma que conecta pessoas que compram e vendem equipamento de kitesurf. A Kitetropos não é parte das negociações: não vende, não compra, não intermedia pagamento e não garante os itens anunciados. O negócio é feito diretamente entre comprador e vendedor.' },
  { id: 'conta', title: 'Conta e verificação', body: 'O acesso é por telefone verificado (1 número = 1 conta). Você é responsável por manter seus dados corretos e pelo uso da sua conta. Foto de perfil é obrigatória como camada de confiança da comunidade.' },
  { id: 'anuncios', title: 'Anúncios', body: 'Os anúncios devem descrever o equipamento com honestidade. Omitir informações relevantes (estado, reparos, micro furos, etc.) pode levar à remoção do anúncio e ao banimento da conta. É proibido anunciar itens ilícitos ou que você não tenha o direito de vender.' },
  { id: 'contato', title: 'Contato e negociação', body: 'O contato é estruturado: o comprador faz uma oferta ou pede uma visita; o vendedor é avisado e os dois combinam o restante por canais externos (ex.: WhatsApp). Fazer ofertas ou contatos sem intenção real de negociar é considerado abuso e pode levar a banimento.' },
  { id: 'conduta', title: 'Conduta e reputação', body: 'A reputação é construída por negócios confirmados pelos dois lados e por avaliações mútuas. É proibido manipular avaliações, criar contas falsas ou usar a plataforma para spam, fraude ou assédio.' },
  { id: 'responsa', title: 'Limitação de responsabilidade', body: 'A Kitetropos disponibiliza a plataforma "como está". Não nos responsabilizamos por danos, perdas ou prejuízos decorrentes de negociações entre usuários. Avalie o equipamento pessoalmente antes de fechar negócio.' },
  { id: 'alteracoes', title: 'Alterações', body: 'Estes termos podem ser atualizados. Mudanças relevantes serão comunicadas dentro da plataforma.' },
];

export default function Termos() {
  return (
    <LegalPage
      title="Termos de uso"
      updated="Versão inicial · junho de 2026 · Fase 0"
      intro="A Kitetropos é um marketplace que conecta pessoas que compram e vendem equipamento de kitesurf. Não somos parte da negociação, não processamos pagamento e não fazemos a entrega. Ao usar a plataforma você concorda com os termos abaixo."
      sections={sections}
      crossLabel="Política de privacidade"
      crossHref="/privacidade"
      contact={<>Dúvidas sobre estes termos? Fale com a gente — estes termos podem mudar conforme a plataforma evolui, e avisamos por aqui. Veja também a <a href="/privacidade" style={{ color: '#1f6b5c', fontWeight: 700 }}>Política de Privacidade</a>.</>}
    />
  );
}
