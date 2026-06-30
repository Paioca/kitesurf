import type { MetadataRoute } from 'next';
import { publicBaseUrl } from '../lib/app-url';

// Áreas privadas / sem valor de SEO — fora do alcance de qualquer crawler.
const DISALLOW = [
  '/api/',
  '/conta',
  '/pedidos',
  '/favoritos',
  '/moderacao',
  '/chat',
  '/entrar',
  '/recuperar',
  '/verificar-email',
];

// Bots de RESPOSTA de IA (buscam a página pra responder o usuário em tempo real). Liberá-los é
// o que permite a Kitetropos ser CITADA em ChatGPT / Perplexity / Claude. ≠ bots de TREINO.
const ANSWER_BOTS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Perplexity-User',
  'Claude-SearchBot',
  'Claude-User',
];

// robots.txt gerado pelo Next. Libera o público, bloqueia rotas privadas, aponta o sitemap.
export default function robots(): MetadataRoute.Robots {
  const base = publicBaseUrl();
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      // Política explícita pros bots de resposta de IA (mesma do público): liberados,
      // menos as áreas privadas. Documenta a intenção e sobrevive a mudanças no '*'.
      { userAgent: ANSWER_BOTS, allow: '/', disallow: DISALLOW },
      // Pra BLOQUEAR o uso do conteúdo em TREINO de modelo (NÃO afeta ser citado em
      // respostas de IA), descomente a regra abaixo:
      // { userAgent: ['GPTBot', 'ClaudeBot', 'CCBot', 'Google-Extended'], disallow: '/' },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
