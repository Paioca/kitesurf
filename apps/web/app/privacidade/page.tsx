// Política de Privacidade — versão inicial (Fase 0). Texto jurídico final entra depois.
import { color, font } from '../../lib/tokens';
import { Logo } from '../../components/ui';
import { Footer } from '../../components/Footer';

export const metadata = { title: 'Política de Privacidade — Vaya' };

export default function Privacidade() {
  return (
    <>
      <header style={{ borderBottom: `1px solid ${color.line}`, background: '#fff' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center' }}>
          <a href="/" style={{ textDecoration: 'none' }}><Logo size={20} /></a>
        </div>
      </header>
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontFamily: font.serif, fontSize: 34, fontWeight: 600, letterSpacing: '-0.5px', margin: '0 0 6px' }}>Política de Privacidade</h1>
        <p style={{ fontSize: 13.5, color: color.inkFaint2, margin: '0 0 28px' }}>Versão inicial · Vaya está em fase de lançamento (Fase 0). Esta política será revisada e adequada à LGPD antes da abertura ao público.</p>

        <Sec t="1. Dados que coletamos">Telefone (obrigatório, para login e verificação), nome e foto de perfil. E-mail e Instagram são opcionais. Dos anúncios: fotos e a ficha do equipamento. As fotos têm os metadados de localização (GPS) removidos automaticamente no envio.</Sec>
        <Sec t="2. Como usamos">Para autenticar sua conta, exibir seus anúncios, conectar comprador e vendedor, avisar sobre ofertas/visitas e construir a reputação a partir de negócios e avaliações.</Sec>
        <Sec t="3. O que é público">Nome, foto, @ do Instagram (se informado), seus anúncios ativos e suas avaliações. <strong>Telefone e e-mail nunca são exibidos publicamente</strong> — só o selo de "verificado".</Sec>
        <Sec t="4. Compartilhamento de contato">Seu contato só chega à outra parte dentro de uma negociação (ao fazer/aceitar uma oferta ou visita). Fora disso, não vendemos nem compartilhamos seus dados com terceiros para publicidade.</Sec>
        <Sec t="5. Notificações">Podemos enviar SMS para avisar sobre atividade da sua conta (ex.: uma nova oferta no seu anúncio). O número usado é o do seu cadastro.</Sec>
        <Sec t="6. Seus direitos">Você pode editar seus dados no perfil e excluir sua conta a qualquer momento — isso remove seus anúncios e anonimiza seus dados pessoais.</Sec>
        <Sec t="7. Retenção e segurança">Mantemos os dados enquanto a conta existir. Códigos de verificação são guardados apenas como hash, nunca em texto puro.</Sec>

        <p style={{ fontSize: 13.5, color: color.inkFaint2, marginTop: 28 }}>Veja também os <a href="/termos" style={{ color: color.primary }}>Termos de Uso</a>.</p>
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
