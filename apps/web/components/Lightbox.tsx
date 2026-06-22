'use client';
// Visualizador de foto em tela cheia. Portal no <body> (escapa de ancestrais com
// transform), fecha no Esc / clique-fora / ✕, navega por setas. Usado pela galeria
// do kite e pelas fotos da barra — o comprador precisa inspecionar as duas peças.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function Lightbox({ photos, start, onClose }: { photos: string[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const [mounted, setMounted] = useState(false);
  const go = (d: number) => setI((p) => (p + d + photos.length) % photos.length);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [photos.length]);

  if (!mounted) return null;
  const multi = photos.length > 1;
  return createPortal(
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label="Foto em tela cheia" style={backdrop}>
      <img src={photos[i]} alt={`Foto ${i + 1} de ${photos.length}`} onClick={(e) => e.stopPropagation()} style={img} />
      {multi && <span style={counter}>{i + 1} / {photos.length}</span>}
      {multi && <button type="button" aria-label="Foto anterior" onClick={(e) => { e.stopPropagation(); go(-1); }} style={{ ...nav, left: 16 }}>‹</button>}
      {multi && <button type="button" aria-label="Próxima foto" onClick={(e) => { e.stopPropagation(); go(1); }} style={{ ...nav, right: 16 }}>›</button>}
      <button type="button" aria-label="Fechar" onClick={onClose} style={close}>✕</button>
    </div>,
    document.body,
  );
}

const backdrop: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(9,20,17,0.92)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px,4vw,56px)' };
const img: React.CSSProperties = { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 10, boxShadow: '0 30px 80px rgba(0,0,0,0.5)' };
const counter: React.CSSProperties = { position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 13, fontWeight: 600, padding: '6px 13px', borderRadius: 999 };
const navBase: React.CSSProperties = { position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: 48, height: 48, borderRadius: 999, border: '1.5px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 26, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const nav = navBase;
const close: React.CSSProperties = { position: 'absolute', top: 22, right: 24, width: 46, height: 46, borderRadius: 999, border: '1.5px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
