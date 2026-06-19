// Termos de Uso — versão inicial (Fase 0). Conteúdo jurídico final entra depois.
import { color, font } from '../../lib/tokens';
import { Logo } from '../../components/ui';
import { Footer } from '../../components/Footer';

export const metadata = { title: 'Termos de Uso — Vaya' };

export default function Termos() {
  return (
    <>
      <header style={{ borderBottom: `1px solid ${color.line}`, background: '#fff' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center' }}>
          <a href="/" style={{ textDecoration: 'none' }}><Logo size={20} /></a>
        </div>
      </header>
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontFamily: font.serif, fontSize: 34, fontWeight: 600, letterSpacing: '-0.5px', margin: '0 0 6px' }}>Termos de Uso</h1>
        <p style={{ fontSize: 13.5, color: color.inkFaint2, margin: '0 0 28px' }}>Versão inicial · Vaya está em fase de lançamento (Fase 0). Estes termos serão revisados antes da abertura ao público.</p>

        <Sec t="1. O que é a Vaya">A Vaya é uma plataforma que conecta pessoas que compram e vendem equipamento de kitesurf. A Vaya não é parte das negociações: não vende, não compra, não intermedia pagamento e não garante os itens anunciados. O negócio é feito diretamente entre comprador e vendedor.</Sec>
        <Sec t="2. Conta e verificação">O acesso é por telefone verificado (1 número = 1 conta). Você é responsável por manter seus dados corretos e pelo uso da sua conta. Foto de perfil é obrigatória como camada de confiança da comunidade.</Sec>
        <Sec t="3. Anúncios">Os anúncios devem descrever o equipamento com honestidade. Omitir informações relevantes (estado, reparos, micro furos, etc.) pode levar à remoção do anúncio e ao banimento da conta. É proibido anunciar itens ilícitos ou que você não tenha o direito de vender.</Sec>
        <Sec t="4. Contato e negociação">O contato é estruturado: o comprador faz uma oferta ou pede uma visita; o vendedor é avisado e os dois combinam o restante por canais externos (ex.: WhatsApp). Fazer ofertas ou contatos sem intenção real de negociar é considerado abuso e pode levar a banimento.</Sec>
        <Sec t="5. Conduta e reputação">A reputação é construída por negócios confirmados pelos dois lados e por avaliações mútuas. É proibido manipular avaliações, criar contas falsas ou usar a plataforma para spam, fraude ou assédio.</Sec>
        <Sec t="6. Limitação de responsabilidade">A Vaya disponibiliza a plataforma "como está". Não nos responsabilizamos por danos, perdas ou prejuízos decorrentes de negociações entre usuários. Avalie o equipamento pessoalmente antes de fechar negócio.</Sec>
        <Sec t="7. Alterações">Estes termos podem ser atualizados. Mudanças relevantes serão comunicadas dentro da plataforma.</Sec>

        <p style={{ fontSize: 13.5, color: color.inkFaint2, marginTop: 28 }}>Dúvidas sobre estes termos? <a href="/privacidade" style={{ color: color.primary }}>Veja também a Política de Privacidade</a>.</p>
      </main>
      <Footer />
    </>
  );
}

function Sec({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h2 style={{ fontFamily: font.serif, fontSize: 19, fontWeight: 600, margin: '0 0 8px' }}>{t}</h2>
      <p style={{ fontSize: 15, lineHeight: 1.65, color: color.inkSoft, margin: 0 }}>{children}</p>
    </section>
  );
}
