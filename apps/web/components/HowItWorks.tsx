'use client';
// Botão "Veja como funciona" + modal de vídeo (redesign Vaya — hero da home).
// O protótipo abre um lightbox 16:9 com um player. Como ainda não há vídeo,
// o slot mostra um placeholder; passe `src` (YouTube/Vimeo embed ou .mp4) e ele
// pluga direto — sem mexer no resto.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { color, font } from '../lib/tokens';
import { ComoFunciona } from './ComoFunciona';

export function HowItWorks({ src, label = 'Veja como funciona', variant = 'pill' }: { src?: string; label?: string; variant?: 'pill' | 'link' }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Esc fecha + trava o scroll do body enquanto aberto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);

  // Portal pro <body>: o hero tem ancestrais com `transform`/`animation`, que
  // viram containing block de `position:fixed` — sem o portal o modal encolhe e
  // gruda no canto em vez de cobrir a viewport inteira.
  const modal = (
    <div onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label={label} style={backdrop}>
      <div onClick={(e) => e.stopPropagation()} style={frame}>
        <Player src={src} />
      </div>
      <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" style={closeBtn}>✕</button>
    </div>
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={variant === 'link' ? linkBtn : btn} className="kl-howbtn">
        <span style={variant === 'link' ? playIconInline : playIcon}>▶</span>
        {label}
      </button>

      {open && mounted && createPortal(modal, document.body)}
    </>
  );
}

function Player({ src }: { src?: string }) {
  // Sem vídeo real: roda a animação nativa "Como funciona" (8 cenas em loop).
  if (!src) return <ComoFunciona />;
  const isFile = /\.(mp4|webm|mov)(\?|$)/i.test(src);
  if (isFile) {
    return <video src={src} controls autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />;
  }
  return <iframe src={src} title="Como funciona" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />;
}

const btn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 11,
  background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.34)', color: '#fff',
  padding: '12px 22px 12px 14px', borderRadius: 999,
  fontFamily: font.sans, fontSize: 15, fontWeight: 700, cursor: 'pointer',
  backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
};
const linkBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  background: 'transparent', border: 'none', color: '#dce8e1',
  padding: 0, borderRadius: 0,
  fontFamily: font.sans, fontSize: 14.5, fontWeight: 700, cursor: 'pointer',
  textDecoration: 'underline', textUnderlineOffset: 5, textDecorationThickness: 1,
};
const playIcon: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 999, background: color.accent, color: color.ink,
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, paddingLeft: 2, flex: 'none',
};
const playIconInline: React.CSSProperties = {
  width: 20, height: 20, borderRadius: 999, background: 'rgba(220,232,225,0.16)', color: '#dce8e1',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, paddingLeft: 1, flex: 'none',
};
const backdrop: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(9,24,21,0.84)',
  backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
};
const frame: React.CSSProperties = {
  position: 'relative', width: '100%', maxWidth: 1140, aspectRatio: '16 / 9',
  background: '#0a201b', borderRadius: 16, overflow: 'hidden', boxShadow: '0 50px 110px rgba(0,0,0,0.55)',
};
const closeBtn: React.CSSProperties = {
  position: 'absolute', top: 26, right: 30, width: 46, height: 46, borderRadius: 999,
  border: '1.5px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.08)', color: '#fff',
  fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
};
