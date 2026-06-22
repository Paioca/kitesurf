'use client';
// Fotos da barra (no anúncio de kit) — clicáveis, abrem em tela cheia. Antes eram
// tiles estáticos: o comprador via bem o kite mas não conseguia inspecionar a barra.
import { useState } from 'react';
import { Lightbox } from './Lightbox';

export function BarraPhotos({ photos }: { photos: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (photos.length === 0) return null;
  return (
    <div className="kl-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12 }}>
      {photos.map((u, i) => (
        <button
          key={i}
          type="button"
          onClick={() => setOpen(i)}
          aria-label={`Ampliar foto ${i + 1} da barra`}
          style={{ width: 92, height: 92, borderRadius: 10, flex: 'none', border: 'none', padding: 0, cursor: 'zoom-in', backgroundImage: `url("${u}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
      ))}
      {open !== null && <Lightbox photos={photos} start={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
