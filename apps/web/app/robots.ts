import type { MetadataRoute } from 'next';
import { publicBaseUrl } from '../lib/app-url';

// robots.txt gerado pelo Next. Libera o conteúdo público (home, anúncios, perfis, termos)
// e bloqueia rotas autenticadas / sem valor de SEO. Aponta o crawler pro sitemap.
export default function robots(): MetadataRoute.Robots {
  const base = publicBaseUrl();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/conta',
        '/pedidos',
        '/favoritos',
        '/moderacao',
        '/chat',
        '/entrar',
        '/recuperar',
        '/verificar-email',
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
