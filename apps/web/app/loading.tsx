// Skeleton de carregamento (App Router) — aparece durante navegação/data fetch.
import { color } from '../lib/tokens';

export default function Loading() {
  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 24px', background: color.bg, minHeight: '60vh' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 22 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ borderRadius: 16, overflow: 'hidden', background: '#fff', border: `1px solid ${color.lineCard}` }}>
            <div className="kl-shimmer" style={{ height: 180 }} />
            <div style={{ padding: 14 }}>
              <div className="kl-shimmer" style={{ height: 14, width: '70%', borderRadius: 6, marginBottom: 10 }} />
              <div className="kl-shimmer" style={{ height: 20, width: '45%', borderRadius: 6 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
