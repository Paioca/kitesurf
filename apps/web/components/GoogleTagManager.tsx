import { headers } from 'next/headers';

// Google Tag Manager (container GTM-XXXXXXX).
//
// Ativação: só renderiza se NEXT_PUBLIC_GTM_ID estiver setado. Por decisão, a env var só
// existe na Vercel de PRODUÇÃO — logo, o GTM não carrega em local/staging e os dados não são
// poluídos por tráfego de teste. O GA4 (e demais tags) são configurados DENTRO do GTM, não
// em código — por isso não há gtag.js hardcoded aqui.
//
// CSP (proxy.ts, estrita com nonce em prod):
//   - O <script> de bootstrap é inline → leva o nonce (mesmo padrão do JSON-LD em page.tsx).
//   - Ele injeta gtm.js de https://www.googletagmanager.com → coberto pelo host no script-src.
//   - Setamos j.nonce no script injetado para o GTM propagar o nonce às tags nativas que
//     suportam (GA4/Google Ads). ATENÇÃO: tags "Custom HTML" ou de terceiros não-nonce-aware
//     (Meta Pixel, LinkedIn, Hotjar...) NÃO herdam o nonce e serão bloqueadas pela CSP até o
//     host delas ser liberado no script-src. Ver runbook no PR.
//   - Beacons de coleta (google-analytics.com etc.) caem no connect-src/img-src 'https:'.
//   - O <noscript> abaixo embute um iframe de googletagmanager.com → exige frame-src (add no
//     proxy.ts).

function gtmId() {
  return process.env.NEXT_PUBLIC_GTM_ID;
}

// Bootstrap: renderizar o mais alto possível dentro do <body> do layout raiz. (O App Router
// não expõe um <head> manual sem conflitar com o next/font; body-topo roda antes do conteúdo
// e é suficiente para a medição.)
export async function GoogleTagManager() {
  const id = gtmId();
  if (!id) return null;

  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const setNonce = nonce ? `j.nonce=${JSON.stringify(nonce)};` : '';

  return (
    <script
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html:
          `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});` +
          `var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;` +
          `j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;${setNonce}f.parentNode.insertBefore(j,f);` +
          `})(window,document,'script','dataLayer',${JSON.stringify(id)});`,
      }}
    />
  );
}

// Fallback sem JS: primeiro filho do <body>. Sem <script>, então não precisa de nonce; o
// iframe exige frame-src https://www.googletagmanager.com na CSP.
export function GoogleTagManagerNoScript() {
  const id = gtmId();
  if (!id) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${id}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  );
}
