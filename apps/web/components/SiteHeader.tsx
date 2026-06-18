// Header do design Kite Life (handoff Busca.dc.html). Compartilhado entre páginas.
export function SiteHeader() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(246,243,236,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e6dfd0',
      }}
    >
      <div
        style={{
          maxWidth: 1320,
          margin: '0 auto',
          padding: '0 32px',
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        <a
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', color: '#23332e' }}
        >
          <div style={{ width: 17, height: 17, background: '#1f6b5c', transform: 'rotate(45deg)', borderRadius: 3 }} />
          <span style={{ fontWeight: 900, fontSize: 21, letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
            Kite <span style={{ color: '#1f6b5c' }}>Life</span>
          </span>
        </a>

        <a
          href="/anuncios"
          style={{
            flex: 1,
            maxWidth: 440,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            border: '1.5px solid #e0d9c9',
            background: '#fff',
            borderRadius: 999,
            padding: '11px 18px',
            textDecoration: 'none',
          }}
        >
          <span style={{ color: '#bcccc4', fontSize: 15 }}>⌕</span>
          <span style={{ fontSize: 14.5, color: '#8a948d' }}>Buscar marca, modelo, tamanho…</span>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <a href="/entrar" style={{ fontSize: 15, fontWeight: 500, color: '#23332e', textDecoration: 'none' }}>
            Entrar
          </a>
          <a
            href="/anunciar"
            style={{
              fontSize: 14.5,
              fontWeight: 700,
              color: '#23332e',
              background: '#d9a86b',
              padding: '11px 22px',
              borderRadius: 999,
              textDecoration: 'none',
            }}
          >
            Anunciar
          </a>
        </div>
      </div>
    </header>
  );
}
