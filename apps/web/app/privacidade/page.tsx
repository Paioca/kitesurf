// Política de Privacidade — versão inicial (Fase 0). Texto jurídico final entra depois.
import { LegalPage, type LegalSection } from '../../components/LegalPage';

export const metadata = { title: 'Política de Privacidade — Vaya' };

const sections: LegalSection[] = [
  { id: 'dados', title: 'Dados que coletamos', body: 'Telefone (obrigatório, para login e verificação), nome e foto de perfil. E-mail e Instagram são opcionais. Dos anúncios: fotos e a ficha do equipamento. As fotos têm os metadados de localização (GPS) removidos automaticamente no envio.' },
  { id: 'uso', title: 'Como usamos', body: 'Para autenticar sua conta, exibir seus anúncios, conectar comprador e vendedor, avisar sobre ofertas/visitas e construir a reputação a partir de negócios e avaliações.' },
  { id: 'publico', title: 'O que é público', body: <>Nome, foto, @ do Instagram (se informado), seus anúncios ativos e suas avaliações. <strong>Telefone e e-mail nunca são exibidos publicamente</strong> — só o selo de "verificado".</> },
  { id: 'contato', title: 'Compartilhamento de contato', body: 'Seu contato só chega à outra parte dentro de uma negociação (ao fazer/aceitar uma oferta ou visita). Fora disso, não vendemos nem compartilhamos seus dados com terceiros para publicidade.' },
  { id: 'notificacoes', title: 'Notificações', body: 'Podemos enviar SMS para avisar sobre atividade da sua conta (ex.: uma nova oferta no seu anúncio). O número usado é o do seu cadastro.' },
  { id: 'direitos', title: 'Seus direitos', body: 'Você pode editar seus dados no perfil e excluir sua conta a qualquer momento — isso remove seus anúncios e anonimiza seus dados pessoais.' },
  { id: 'retencao', title: 'Retenção e segurança', body: 'Mantemos os dados enquanto a conta existir. Códigos de verificação são guardados apenas como hash, nunca em texto puro.' },
];

export default function Privacidade() {
  return (
    <LegalPage
      title="Política de privacidade"
      updated="Versão inicial · junho de 2026 · Fase 0"
      intro="Esta política explica quais dados a Vaya coleta, como usamos e o que fica público. Será revisada e adequada à LGPD antes da abertura ao público."
      sections={sections}
      crossLabel="Termos de uso"
      crossHref="/termos"
      contact={<>Dúvidas sobre como tratamos seus dados? Fale com a gente. Veja também os <a href="/termos" style={{ color: '#1f6b5c', fontWeight: 700 }}>Termos de Uso</a>.</>}
    />
  );
}
