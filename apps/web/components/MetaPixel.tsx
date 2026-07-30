import { headers } from 'next/headers';

// Meta Pixel (fbevents.js), inserido direto no código — sem passar pelo GTM (decisão do
// dono: tags de terceiro dentro do GTM não herdam nonce e seriam bloqueadas pela CSP mesmo
// assim; inserir aqui permite carimbar o nonce igual às demais tags first-party).
//
// Ativação: só renderiza se NEXT_PUBLIC_META_PIXEL_ID estiver setado. Mesma convenção do
// GTM/GA4 — var só na Vercel de PRODUÇÃO, para não poluir os dados com tráfego de teste.
//
// CSP (proxy.ts, estrita com nonce em prod):
//   - O <script> inline leva o nonce (mesmo padrão do bootstrap do GTM / JSON-LD).
//   - Ele injeta fbevents.js de https://connect.facebook.net → precisa estar no script-src
//     (adicionado em proxy.ts).
//   - O beacon de coleta (facebook.com/tr) e o <img> do noscript já caem no connect-src/
//     img-src 'https:' existentes — não precisam de ajuste.
export async function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return null;

  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <>
      <script
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html:
            `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?` +
            `n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;` +
            `n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;` +
            `t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}` +
            `(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');` +
            `fbq('init',${JSON.stringify(pixelId)});fbq('track','PageView');`,
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- pixel de rastreamento, não é imagem de conteúdo */}
        <img
          height={1}
          width={1}
          style={{ display: 'none' }}
          alt=""
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
