import type { MetadataRoute } from 'next';
import { publicBaseUrl } from '../lib/app-url';

// Áreas privadas / sem valor de SEO — fora do alcance de qualquer crawler.
const DISALLOW = [
  '/api/',
  '/conta',
  '/pedidos',
  '/favoritos',
  '/moderacao',
  '/saude',
  '/chat',
  '/entrar',
  '/recuperar',
  '/verificar-email',
];

// Permutações de filtro/busca (querystring) geram URLs quase infinitas, e com o site inteiro
// force-dynamic (CSP nonce) cada uma custa um render completo — crawler varrendo permutações
// virou custo real de Fast Origin Transfer na Vercel (picos de 25 GB/dia em jul/2026).
// Bloquear '?' não esconde nada de indexador: as páginas canônicas (home, /anuncio/:id,
// /perfil/:id, institucionais) cobrem 100% do catálogo e estão no sitemap.
const DISALLOW_QUERYSTRINGS = '/*?';

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

// Crawlers de alto volume e baixo valor pro Kitetropos: treinadores agressivos sem canal de
// citação relevante pro nosso público (Bytespider/ByteDance, PetalBot/Huawei, Amazonbot,
// meta-externalagent/Meta) e coletores de ferramenta de SEO de terceiros (Ahrefs, Semrush,
// Majestic, Moz). Bloqueio decidido em jul/2026 pelo custo de crawl (ver DISALLOW_QUERYSTRINGS).
// DELIBERADO: GPTBot, ClaudeBot e Google-Extended (treino OpenAI/Anthropic/Gemini) ficam
// LIBERADOS — estar no conhecimento desses modelos interessa; eles caem na regra '*' e só
// perdem as permutações de querystring como todo mundo. Obs.: bot que ignora robots.txt
// (Bytespider é notório) é caso pro Firewall da Vercel, não daqui.
const BLOCKED_CRAWLERS = [
  'Bytespider',
  'PetalBot',
  'Amazonbot',
  'meta-externalagent',
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'DotBot',
];

// robots.txt gerado pelo Next. Libera o público, bloqueia rotas privadas, aponta o sitemap.
export default function robots(): MetadataRoute.Robots {
  const base = publicBaseUrl();
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: [...DISALLOW, DISALLOW_QUERYSTRINGS] },
      // Política explícita pros bots de resposta de IA (mesma do público): liberados,
      // menos as áreas privadas. Documenta a intenção e sobrevive a mudanças no '*'.
      { userAgent: ANSWER_BOTS, allow: '/', disallow: [...DISALLOW, DISALLOW_QUERYSTRINGS] },
      { userAgent: BLOCKED_CRAWLERS, disallow: '/' },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
