'use client';

// Galeria do anúncio — ilha client (troca a foto principal). Handoff Anuncio.dc.html.
import { useState } from 'react';
import { color } from '../lib/tokens';

const HATCH = 'repeating-linear-gradient(135deg,#e3ece5 0px,#e3ece5 13px,#d8e4dc 13px,#d8e4dc 26px)';

export function Gallery({ photos }: { photos: string[] }) {
  const [sel, setSel] = useState(0);
  const main = photos[sel];

  return (
    <div>
      <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: main ? '#e7ddc9' : undefined, backgroundImage: main ? undefined : HATCH, height: 560, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {main && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("${main}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
        {photos.length > 1 && (
          <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(20,48,42,0.82)', color: '#fff', fontSize: 13, fontWeight: 600, padding: '6px 13px', borderRadius: 999 }}>
            {sel + 1} / {photos.length}
          </div>
        )}
      </div>
      {photos.length > 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 12 }}>
          {photos.map((p, i) => (
            <button
              key={p}
              onClick={() => setSel(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={i === sel}
              style={{ border: 'none', cursor: 'pointer', height: 104, borderRadius: 12, backgroundImage: `url("${p}")`, backgroundSize: 'cover', backgroundPosition: 'center', outlineOffset: -2, outline: i === sel ? `3px solid ${color.primary}` : `1px solid ${color.line}`, opacity: i === sel ? 1 : 0.82 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
