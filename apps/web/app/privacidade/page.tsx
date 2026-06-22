// Política de Privacidade factual da Fase 0. Revisão jurídica externa continua recomendada.
import { LegalPage, type LegalSection } from '../../components/LegalPage';
import Link from 'next/link';

export const metadata = { title: 'Política de Privacidade — Kitetropos' };

const sections: LegalSection[] = [
  { id: 'dados', title: 'Dados que coletamos', body: 'Telefone (obrigatório, para login e verificação), nome, sobrenome, foto de perfil, spot de interesse e nacionalidade. E-mail é opcional. Dos anúncios: fotos e a ficha do equipamento. As fotos têm os metadados de localização (GPS) removidos automaticamente no envio.' },
  { id: 'uso', title: 'Como usamos', body: 'Para autenticar sua conta, exibir seus anúncios, conectar comprador e vendedor, avisar sobre ofertas/visitas e construir a reputação a partir de negócios e avaliações.' },
  { id: 'publico', title: 'O que é público', body: <>Nome, foto, spot de interesse e nacionalidade, seus anúncios ativos e suas avaliações. <strong>Telefone e e-mail nunca são exibidos publicamente</strong> — só o selo de "verificado".</> },
  { id: 'contato', title: 'Compartilhamento de contato', body: 'Ao enviar uma oferta ou pedir uma visita, o contato do comprador fica disponível ao vendedor. Quando o vendedor demonstra interesse, o WhatsApp dele também fica disponível ao comprador. Fora desse fluxo, telefone e e-mail não são exibidos publicamente.' },
  { id: 'notificacoes', title: 'Notificações', body: 'Podemos usar SMS ou WhatsApp para avisar sobre atividade da conta, como uma nova oferta ou um pedido de visita. O canal depende da configuração disponível e usa o telefone cadastrado.' },
  { id: 'direitos', title: 'Seus direitos', body: 'Você pode editar seus dados no perfil e excluir sua conta. Ao excluir, seus anúncios saem do ar e os dados pessoais diretamente identificáveis são removidos ou substituídos.' },
  { id: 'retencao', title: 'Retenção e segurança', body: 'Após a exclusão, registros de negociação e avaliação podem ser mantidos associados a uma conta removida para preservar a integridade do histórico e prevenir abuso. Códigos de verificação são guardados apenas como hash, nunca em texto puro.' },
];

export default function Privacidade() {
  return (
    <LegalPage
      title="Política de privacidade"
      updated="Atualizada em junho de 2026 · Fase 0"
      intro="Esta política explica quais dados a Kitetropos coleta, como são usados, o que fica público e quando o contato é compartilhado."
      sections={sections}
      crossLabel="Termos de uso"
      crossHref="/termos"
      contact={<>Este texto descreve o funcionamento atual da Fase 0. Veja também os <Link href="/termos" style={{ color: '#1f6b5c', fontWeight: 700 }}>Termos de uso</Link>.</>}
    />
  );
}
