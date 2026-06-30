'use client';
// Animação "Como funciona" — port nativo (React + rAF) do storyboard do design
// (Como Funciona - Kite Life.dc.html). 8 cenas em loop num mockup de celular +
// stepper à direita. Sem runtime externo, sem CDN, sem eval — roda dentro da CSP
// estrita do app. Escala 1280×720 pra preencher o container 16:9 do modal.
import { useEffect, useRef, useState, type CSSProperties } from 'react';

const EVO = '/como-funciona/evo-1.webp';
const BEACH = '/hero-beach.jpg';

const SCENES = [
  { dur: 5000, no: '01', label: 'Entre na plataforma', sub: 'Comunidade verificada de kitesurf' },
  { dur: 5600, no: '02', label: 'Login por SMS', sub: 'Sem senha. Código no telefone' },
  { dur: 5600, no: '03', label: 'Anuncie seu equipamento', sub: 'Ficha padronizada, em minutos' },
  { dur: 5200, no: '04', label: 'Filtre por tamanho', sub: 'Ache o kite certo na hora' },
  { dur: 5400, no: '05', label: 'Combine uma visita', sub: 'Veja de perto no spot' },
  { dur: 7000, no: '06', label: 'Combinem no WhatsApp', sub: 'Contato direto, sem intermediário' },
  { dur: 5200, no: '07', label: 'Fechem entre vocês', sub: 'Combinem direto, sem taxa' },
  { dur: 6200, no: '08', label: 'Avalie e gere reputação', sub: 'Confiança que fica pra comunidade' },
];
const TOTAL = SCENES.reduce((a, s) => a + s.dur, 0);
const SPEED = 2.5; // ritmo do loop (1 = original); >1 acelera tudo proporcionalmente

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const ease = (x: number) => { x = clamp(x, 0, 1); return (1 - Math.cos(Math.PI * x)) / 2; };

export function ComoFunciona() {
  const [t, setT] = useState(0);
  const [scale, setScale] = useState(1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const start = performance.now();
    const tick = () => setT(performance.now() - start);
    let raf = 0;
    const loop = () => { tick(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    // Keep-alive: rAF pausa quando a aba fica oculta; o intervalo mantém o tempo
    // coerente (t = tempo real decorrido) e a animação não "congela" ao voltar.
    const iv = setInterval(tick, 1000);
    return () => { cancelAnimationFrame(raf); clearInterval(iv); };
  }, []);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => { const r = el.getBoundingClientRect(); const s = Math.min(r.width / 1280, r.height / 720); if (s > 0) setScale(s); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- timeline ----
  const tt = (t * SPEED) % TOTAL;
  let acc = 0, ci = 0, tin = 0;
  for (let i = 0; i < SCENES.length; i++) { if (tt < acc + SCENES[i].dur) { ci = i; tin = tt - acc; break; } acc += SCENES[i].dur; }
  const lp = tin / SCENES[ci].dur;

  // screen wraps (enter/exit slide + fade)
  const wrap = (i: number): CSSProperties => {
    let op = 0, tx = 46;
    if (i === ci) { const e = ease(tin / 440); op = e; tx = (1 - e) * 46; }
    else if (i === ci - 1) { const e = ease(tin / 440); op = 1 - e; tx = -e * 46; }
    return { position: 'absolute', inset: 0, opacity: op, transform: `translateX(${tx.toFixed(1)}px)`, pointerEvents: 'none' };
  };

  // reaction crossfades
  const r = clamp((lp - 0.5) / 0.1, 0, 1);
  const aOp = (k: number) => (ci === k ? 1 - r : 1);
  const bOp = (k: number) => (ci === k ? r : 0);

  // screen 1 — OTP fill
  const otpDigits = ['4', '9', '2', '8', '1', '5'];
  const otpN = ci === 1 ? clamp(Math.round((lp - 0.55) / 0.05), 0, 6) : 6;
  const s2verOp = ci === 1 && otpN >= 6 ? 1 : 0;

  // screen 3 — filter sheet rise
  const sheetE = ci === 3 ? ease(clamp((lp - 0.5) / 0.13, 0, 1)) : 0;

  // screen 7 — stars + review→sent
  const starN = ci === 7 ? clamp(Math.round((lp - 0.3) / 0.045), 0, 5) : 5;
  const r7 = clamp((lp - 0.7) / 0.08, 0, 1);

  // cursor + ripple (screen-local coords)
  const startC = { x: 240, y: 614 };
  const moveTo = (tg: { x: number; y: number }, mS: number, mE: number) => { const e = ease(clamp((lp - mS) / (mE - mS), 0, 1)); return { x: startC.x + (tg.x - startC.x) * e, y: startC.y + (tg.y - startC.y) * e }; };
  const targets = [{ x: 150, y: 556 }, { x: 150, y: 432 }, { x: 150, y: 598 }, { x: 150, y: 250 }, { x: 150, y: 566 }, { x: 262, y: 600 }, { x: 150, y: 556 }];
  let cx = startC.x, cy = startC.y, curOp = 0;
  let rip: { x: number; y: number; e: number } | null = null;
  if (ci === 7) {
    const star = { x: 150, y: 216 }, send = { x: 150, y: 600 };
    if (lp < 0.5) { const p = moveTo(star, 0.12, 0.3); cx = p.x; cy = p.y; }
    else { const e = ease(clamp((lp - 0.52) / 0.14, 0, 1)); cx = star.x + (send.x - star.x) * e; cy = star.y + (send.y - star.y) * e; }
    curOp = clamp((lp - 0.04) / 0.08, 0, 1) * (1 - clamp((lp - 0.86) / 0.1, 0, 1));
    if (lp >= 0.3 && lp < 0.46) rip = { x: star.x, y: star.y, e: ease(clamp((lp - 0.3) / 0.16, 0, 1)) };
    else if (lp >= 0.68 && lp < 0.84) rip = { x: send.x, y: send.y, e: ease(clamp((lp - 0.68) / 0.16, 0, 1)) };
  } else {
    const tg = targets[ci]; const p = moveTo(tg, 0.12, 0.44); cx = p.x; cy = p.y;
    curOp = clamp((lp - 0.04) / 0.08, 0, 1) * (1 - clamp((lp - 0.68) / 0.12, 0, 1));
    if (lp >= 0.44 && lp < 0.64) rip = { x: tg.x, y: tg.y, e: ease(clamp((lp - 0.44) / 0.2, 0, 1)) };
  }

  // screen 5 — WhatsApp reveal
  const waOn = ci === 5;
  const waBub = (th: number): CSSProperties => { const o = waOn ? clamp((lp - th) / 0.06, 0, 1) : 0; return { opacity: o, transform: `translateY(${((1 - o) * 12).toFixed(1)}px)` }; };
  const waTypeOp = waOn ? clamp((lp - 0.58) / 0.04, 0, 1) * (1 - clamp((lp - 0.7) / 0.04, 0, 1)) : 0;

  const scene = SCENES[ci];

  return (
    <div ref={boxRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'radial-gradient(120% 120% at 28% 16%, #1c443a 0%, #11302a 46%, #09201b 100%)', fontFamily: "var(--font-archivo),'Archivo', system-ui, sans-serif" }}>
      <div style={{ width: 1280, height: 720, position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%,-50%) scale(${scale.toFixed(4)})`, transformOrigin: 'center center' }}>

        {/* ===== PHONE ===== */}
        <div style={{ position: 'absolute', left: 150, top: 40, width: 326, height: 666, background: '#0b1714', borderRadius: 46, boxShadow: '0 50px 95px -28px rgba(0,0,0,0.65),0 0 0 1.5px rgba(255,255,255,0.05) inset', padding: 13 }}>
          <div style={{ position: 'relative', width: 300, height: 640, borderRadius: 34, overflow: 'hidden', background: '#f6f3ec' }}>

            {/* SCREEN 0 — landing */}
            <div style={wrap(0)}>
              <div style={{ position: 'absolute', inset: 0, background: '#0c2520' }}>
                <img src={BEACH} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '64%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '64%', background: 'linear-gradient(180deg,rgba(12,37,32,0.22),rgba(12,37,32,0.86))' }} />
                <div style={{ position: 'absolute', top: 42, left: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 14, height: 14, background: '#d9a86b', transform: 'rotate(45deg)', borderRadius: 3 }} />
                  <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.5px', textTransform: 'uppercase', color: '#fff' }}>Kite Life</span>
                </div>
                <div style={{ position: 'absolute', left: 22, right: 22, top: 150 }}>
                  <div style={{ fontFamily: "var(--font-spectral),'Spectral',serif", fontStyle: 'italic', fontSize: 13, color: '#e7c79a', marginBottom: 7 }}>Cumbuco · Ceará</div>
                  <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.04, textTransform: 'uppercase', letterSpacing: '-0.6px', color: '#fff' }}>Equipamento<br />de kite com<br />confiança</div>
                </div>
              </div>
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: '#f6f3ec', borderRadius: '26px 26px 0 0', padding: '24px 22px 30px' }}>
                <div style={{ fontSize: 14, color: '#6b7a73', lineHeight: 1.5, marginBottom: 18 }}>Compra e venda de equipamentos de kitesurf com gente <strong style={{ color: '#23332e' }}>verificada</strong>. Sem anúncio fake.</div>
                <div style={cta}>Entrar ou criar conta</div>
                <div style={{ textAlign: 'center', fontSize: 12, color: '#8a948d', marginTop: 12 }}>Sem senha · código por SMS</div>
              </div>
            </div>

            {/* SCREEN 1 — login + OTP */}
            <div style={wrap(1)}>
              <div style={{ position: 'absolute', inset: 0, background: '#f6f3ec', padding: '56px 22px 0', opacity: aOp(1) }}>
                <h1 style={h1}>Entrar ou criar conta</h1>
                <p style={pSub}>Sem senha. Enviamos um código para confirmar seu telefone.</p>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#48564f', marginBottom: 8 }}>Telefone</div>
                <div style={{ display: 'flex', gap: 9, marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#23332e', border: '1.5px solid #e0d9c9', borderRadius: 11, padding: '13px 12px', background: '#fff' }}>+55</div>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 500, border: '1.5px solid #1f6b5c', borderRadius: 11, padding: '13px 14px', background: '#fff', boxShadow: '0 0 0 3px rgba(31,107,92,0.1)' }}>(85) 99988-7766</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 11.5, color: '#8a948d', marginBottom: 26, lineHeight: 1.45 }}><span>🌎</span> Aceita número internacional. Default Brasil (+55).</div>
                <div style={{ ...cta, position: 'absolute', left: 22, right: 22, top: 402, borderRadius: 12 }}>Receber código</div>
              </div>
              <div style={{ position: 'absolute', inset: 0, background: '#f6f3ec', padding: '56px 22px 0', opacity: bOp(1), zIndex: 2 }}>
                <h1 style={h1}>Digite o código</h1>
                <p style={pSub}>Enviado por SMS para <strong style={{ color: '#23332e' }}>+55 (85) 99988-7766</strong>.</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 26 }}>
                  {otpDigits.map((d, i) => (
                    <div key={i} style={{ flex: 1, height: 48, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, fontWeight: 700, color: '#23332e', background: '#fff', border: `1.5px solid ${i < otpN ? '#1f6b5c' : '#e0d9c9'}` }}>{i < otpN ? d : ''}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#1f6b5c', opacity: s2verOp }}><span style={{ width: 9, height: 9, borderRadius: 999, background: '#1f6b5c' }} />Telefone verificado</div>
              </div>
            </div>

            {/* SCREEN 2 — anunciar */}
            <div style={wrap(2)}>
              <div style={{ position: 'absolute', inset: 0, background: '#f6f3ec', padding: '50px 20px 0', opacity: aOp(2) }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#23332e', whiteSpace: 'nowrap' }}>Criar anúncio</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#1f6b5c', background: '#e8f1ec', padding: '5px 11px', borderRadius: 999, whiteSpace: 'nowrap' }}>Passo 1 de 4</span>
                </div>
                <h1 style={{ ...h1, fontSize: 22, marginBottom: 16, lineHeight: 1.1 }}>O que você está vendendo?</h1>
                <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', borderRadius: 11, background: '#e8f1ec', border: '1.5px solid #1f6b5c' }}><span style={{ width: 11, height: 11, background: '#1f6b5c', transform: 'rotate(45deg)', borderRadius: 2 }} /><span style={{ fontSize: 13.5, fontWeight: 700, color: '#1f6b5c' }}>Kite</span></div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', borderRadius: 11, background: '#fff', border: '1.5px solid #e0d9c9' }}><span style={{ width: 11, height: 11, background: '#cdd8d1', transform: 'rotate(45deg)', borderRadius: 2 }} /><span style={{ fontSize: 13.5, fontWeight: 600, color: '#23332e' }}>Barra</span></div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', borderRadius: 11, background: '#fff', border: '1.5px solid #e0d9c9' }}><span style={{ width: 11, height: 11, background: '#cdd8d1', transform: 'rotate(45deg)', borderRadius: 2 }} /><span style={{ fontSize: 13.5, fontWeight: 600, color: '#23332e' }}>Kit</span></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginBottom: 16 }}>
                  <div><div style={lbl}>Marca</div><div style={field}>Duotone</div></div>
                  <div><div style={lbl}>Tamanho</div><div style={field}>10 m²</div></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1f6b5c', background: '#e8f1ec', padding: '3px 9px', borderRadius: 999 }}>Título automático</span>
                </div>
                <div style={{ fontFamily: "var(--font-spectral),'Spectral',serif", fontSize: 15, fontWeight: 600, color: '#23332e', background: '#f3f1e9', border: '1.5px dashed #d8d0bd', borderRadius: 11, padding: '13px 14px' }}>Duotone Evo D/LAB · 10 m² · 2026</div>
                <div style={{ ...cta, position: 'absolute', left: 20, right: 20, bottom: 24, borderRadius: 12 }}>Publicar anúncio</div>
              </div>
              <div style={{ ...successWrap, opacity: bOp(2) }}>
                <Check /><h1 style={successH1}>Seu anúncio está no ar</h1><p style={successP}>Quando alguém fizer uma oferta ou pedir uma visita, você acompanha em Minhas negociações.</p>
              </div>
            </div>

            {/* SCREEN 3 — filtrar */}
            <div style={wrap(3)}>
              <div style={{ position: 'absolute', inset: 0, background: '#f6f3ec' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '46px 18px 12px', borderBottom: '1px solid #e6dfd0', background: '#f6f3ec' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 13, height: 13, background: '#1f6b5c', transform: 'rotate(45deg)', borderRadius: 3 }} /><span style={{ fontWeight: 900, fontSize: 15, letterSpacing: '-0.5px', textTransform: 'uppercase' }}>Kite Life</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}><span style={{ fontSize: 16, color: '#c0492f' }}>♡</span><div style={{ width: 28, height: 28, borderRadius: 999, background: '#1f6b5c', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>VC</div></div>
                </div>
                <div style={{ padding: '14px 18px 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: '1.5px solid #e6dfd0', borderRadius: 999, padding: '11px 16px', marginBottom: 11 }}><span style={{ color: '#bcccc4', fontSize: 15 }}>⌕</span><span style={{ fontSize: 13, color: '#9aa49d' }}>Buscar marca, modelo, tamanho…</span></div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: '#1f6b5c', color: '#fff', borderRadius: 11, padding: 11, fontSize: 13.5, fontWeight: 700 }}>⚙ Filtros</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f2f8f5', color: '#1f6b5c', border: '1.5px solid #cfe3d9', borderRadius: 11, padding: '11px 14px', fontSize: 13.5, fontWeight: 700 }}><span style={{ width: 7, height: 7, background: '#1f6b5c', transform: 'rotate(45deg)', borderRadius: 1 }} />Tamanho</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 7, padding: '8px 18px 4px' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, padding: '7px 14px', borderRadius: 999, background: '#1f6b5c', color: '#fff' }}>Todos</span>
                  <span style={chipOff}>Kite</span>
                  <span style={chipOff}>Barra</span>
                </div>
                <div style={{ padding: '6px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ background: '#fff', border: '1px solid #ece6d8', borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ position: 'relative', height: 120, backgroundColor: '#f4f1ea', backgroundImage: `url('${EVO}')`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}><div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(20,72,62,0.92)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>10 m²</div></div>
                    <div style={{ padding: '11px 13px' }}><div style={{ fontSize: 11.5, fontWeight: 600, color: '#9aa49d', marginBottom: 3 }}>Duotone · 2026</div><div style={{ fontFamily: "var(--font-spectral),'Spectral',serif", fontSize: 16, fontWeight: 600, marginBottom: 7 }}>Evo D/LAB</div><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.5px' }}>R$ 21.459</div><div style={{ fontSize: 11, color: '#8a948d' }}><span style={{ color: '#d9a86b' }}>★</span> 4.9 · Cumbuco</div></div></div>
                  </div>
                </div>
              </div>
              <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: `rgba(12,37,32,${(sheetE * 0.42).toFixed(3)})`, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 3, background: '#f6f3ec', borderRadius: '22px 22px 0 0', padding: '12px 18px 22px', boxShadow: '0 -14px 34px rgba(0,0,0,0.2)', transform: `translateY(${((1 - sheetE) * 100).toFixed(1)}%)` }}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0 12px' }}><div style={{ width: 40, height: 5, borderRadius: 999, background: '#d8d0bd' }} /></div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}><h2 style={{ fontFamily: "var(--font-spectral),'Spectral',serif", fontSize: 21, fontWeight: 600, margin: 0 }}>Filtros</h2><span style={{ fontSize: 12.5, fontWeight: 700, color: '#1f6b5c' }}>Limpar tudo</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase', color: '#5a6b65', marginBottom: 11 }}><span style={{ width: 7, height: 7, background: '#1f6b5c', transform: 'rotate(45deg)', borderRadius: 1 }} />Tamanho do kite</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                  <span style={sizeChip}>8</span><span style={sizeChip}>9</span>
                  <span style={{ fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 999, background: '#1f6b5c', color: '#fff', border: '1.5px solid #1f6b5c' }}>10 ✓</span>
                  <span style={sizeChip}>12</span><span style={sizeChip}>14</span>
                </div>
                <div style={{ ...cta, borderRadius: 12, padding: 14, fontSize: 15 }}>Ver 1 anúncio</div>
              </div>
            </div>

            {/* SCREEN 4 — visita */}
            <div style={wrap(4)}>
              <div style={{ position: 'absolute', inset: 0, background: '#f6f3ec', opacity: aOp(4) }}>
                <div style={{ position: 'relative', height: 230, backgroundColor: '#f4f1ea', backgroundImage: `url('${EVO}')`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}>
                  <div style={{ position: 'absolute', top: 48, left: 16, width: 32, height: 32, borderRadius: 999, background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, color: '#23332e' }}>‹</div>
                  <div style={{ position: 'absolute', top: 48, right: 16, width: 32, height: 32, borderRadius: 999, background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#7a8780' }}>♡</div>
                  <div style={{ position: 'absolute', bottom: 12, left: 14, background: 'rgba(20,48,42,0.85)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }}>10 m²</div>
                </div>
                <div style={{ padding: '16px 20px 0' }}>
                  <div style={{ fontFamily: "var(--font-spectral),'Spectral',serif", fontStyle: 'italic', fontSize: 14, color: '#1f6b5c', marginBottom: 5 }}>Duotone · 2026</div>
                  <h1 style={{ ...h1, fontSize: 25, marginBottom: 8 }}>Evo D/LAB 10 m²</h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#6b7a73', marginBottom: 12 }}><span style={{ width: 6, height: 6, borderRadius: 999, background: '#d9a86b' }} />Cumbuco · Cauípe. Retirada no spot</div>
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px' }}>R$ 21.459</div>
                </div>
                <div style={{ position: 'absolute', left: 20, right: 20, bottom: 22, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <div style={{ ...cta, borderRadius: 12, padding: 14, fontSize: 15 }}>Fazer uma oferta</div>
                  <div style={{ background: '#fff', border: '1.5px solid #d3ccbd', color: '#23332e', borderRadius: 12, padding: 13, textAlign: 'center', fontSize: 14.5, fontWeight: 600 }}>Quero ver de perto</div>
                </div>
              </div>
              <div style={{ ...successWrap, opacity: bOp(4) }}>
                <Check /><h1 style={successH1}>Pedido enviado ao vendedor</h1><p style={{ ...successP, marginBottom: 22 }}>Quando o vendedor aceitar, o contato dele aparece para vocês combinarem pelo WhatsApp.</p>
                <div style={{ background: '#1f6b5c', color: '#fff', borderRadius: 11, padding: '13px 28px', fontSize: 14.5, fontWeight: 700 }}>Conversar pelo WhatsApp</div>
              </div>
            </div>

            {/* SCREEN 5 — WhatsApp */}
            <div style={wrap(5)}>
              <div style={{ position: 'absolute', inset: 0, background: '#e9e0d2' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 90, background: '#1f6b5c', display: 'flex', alignItems: 'flex-end', gap: 10, padding: '0 14px 12px', zIndex: 4 }}>
                  <span style={{ color: '#fff', fontSize: 22, lineHeight: 1, marginBottom: 2 }}>‹</span>
                  <div style={{ width: 38, height: 38, borderRadius: 999, background: '#d9a86b', color: '#23332e', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>LM</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>Lucas M.</div>
                    <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 11 }}>@lucaskite · online</div>
                  </div>
                  <span style={{ color: '#fff', fontSize: 18, opacity: 0.85 }}>⋮</span>
                </div>
                <div style={{ position: 'absolute', top: 90, left: 0, right: 0, bottom: 60, padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 9, overflow: 'hidden' }}>
                  <div style={{ alignSelf: 'flex-start', maxWidth: '86%', background: '#fff', borderRadius: '6px 14px 14px 14px', padding: 7, boxShadow: '0 1px 1.5px rgba(0,0,0,0.08)', display: 'flex', gap: 9, ...waBub(0.05) }}>
                    <div style={{ width: 50, height: 50, borderRadius: 8, flex: 'none', backgroundColor: '#f4f1ea', backgroundImage: `url('${EVO}')`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
                    <div style={{ minWidth: 0, paddingRight: 4 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#23332e', lineHeight: 1.15 }}>Evo D/LAB 10 m²</div>
                      <div style={{ fontSize: 11, color: '#8a948d', margin: '1px 0 3px' }}>Duotone · Cumbuco</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#1f6b5c' }}>R$ 21.459</div>
                    </div>
                  </div>
                  <div style={{ alignSelf: 'flex-start', maxWidth: '80%', background: '#fff', borderRadius: '4px 14px 14px 14px', padding: '8px 12px', boxShadow: '0 1px 1px rgba(0,0,0,0.06)', ...waBub(0.18) }}>
                    <div style={{ fontSize: 13, color: '#23332e', lineHeight: 1.35 }}>Oi! Recebi seu interesse no Evo 🪁</div>
                    <div style={waTime}>12:31</div>
                  </div>
                  <div style={{ alignSelf: 'flex-end', maxWidth: '84%', background: '#dcf2d0', borderRadius: '14px 4px 14px 14px', padding: '8px 12px', ...waBub(0.5) }}>
                    <div style={{ fontSize: 13, color: '#1c3a2e', lineHeight: 1.35 }}>Boa! Podemos ver o kite dia 14, na Taíba?</div>
                    <div style={{ ...waTime, color: '#6b9a7e' }}>12:32 ✓✓</div>
                  </div>
                  <div style={{ alignSelf: 'flex-start', background: '#fff', borderRadius: 14, padding: '11px 13px', boxShadow: '0 1px 1px rgba(0,0,0,0.06)', display: 'flex', gap: 4, opacity: waTypeOp }}>
                    <span style={dot} /><span style={dot} /><span style={dot} />
                  </div>
                  <div style={{ alignSelf: 'flex-start', maxWidth: '80%', background: '#fff', borderRadius: '4px 14px 14px 14px', padding: '8px 12px', boxShadow: '0 1px 1px rgba(0,0,0,0.06)', ...waBub(0.7) }}>
                    <div style={{ fontSize: 13, color: '#23332e', lineHeight: 1.35 }}>Sim, combinado! 👍 Te espero lá.</div>
                    <div style={waTime}>12:33</div>
                  </div>
                  <div style={{ alignSelf: 'flex-end', maxWidth: '84%', background: '#dcf2d0', borderRadius: '14px 4px 14px 14px', padding: '8px 12px', ...waBub(0.86) }}>
                    <div style={{ fontSize: 13, color: '#1c3a2e', lineHeight: 1.35 }}>Fechado! 🤝</div>
                    <div style={{ ...waTime, color: '#6b9a7e' }}>12:33 ✓✓</div>
                  </div>
                </div>
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 60, background: '#efe7da', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', zIndex: 4 }}>
                  <div style={{ flex: 1, background: '#fff', borderRadius: 999, padding: '10px 15px', fontSize: 12.5, color: '#9aa49d' }}>Mensagem</div>
                  <div style={{ width: 42, height: 42, borderRadius: 999, background: '#1f6b5c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flex: 'none' }}>➤</div>
                </div>
              </div>
            </div>

            {/* SCREEN 6 — pedido */}
            <div style={wrap(6)}>
              <div style={{ position: 'absolute', inset: 0, background: '#f6f3ec', padding: '50px 18px 0', opacity: aOp(6) }}>
                <h1 style={{ ...h1, fontSize: 24, marginBottom: 14 }}>Pedidos</h1>
                <div style={{ display: 'flex', gap: 5, background: '#ece3d2', borderRadius: 11, padding: 4, marginBottom: 16 }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: 9, borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#6b7a73' }}>Recebidos</div>
                  <div style={{ flex: 1, textAlign: 'center', padding: 9, borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#23332e', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>Enviados</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #ece6d8', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', gap: 12, padding: 14 }}>
                    <div style={{ width: 58, height: 58, borderRadius: 11, flex: 'none', backgroundColor: '#f4f1ea', backgroundImage: `url('${EVO}')`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}><span style={tagSoft}>Oferta</span><span style={tagSoft}>Aceito</span></div>
                      <div style={{ fontFamily: "var(--font-spectral),'Spectral',serif", fontSize: 16, fontWeight: 600, lineHeight: 1.1 }}>Evo D/LAB 10 m²</div>
                      <div style={{ fontSize: 11.5, color: '#8a948d', marginTop: 2 }}>Para <strong style={{ color: '#23332e' }}>Lucas M.</strong> · @lucaskite</div>
                    </div>
                    <div style={{ textAlign: 'right', flex: 'none' }}><div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: '#9aa49d' }}>Oferta</div><div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>R$ 21.459</div></div>
                  </div>
                  <div style={{ borderTop: '1px solid #f0ebde', background: '#f3f6f3', padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#1f6b5c', marginBottom: 11 }}><span style={{ width: 7, height: 7, borderRadius: 999, background: '#1f6b5c' }} />Aceito. Contato liberado</div>
                    <div style={{ background: '#1f6b5c', color: '#fff', borderRadius: 10, padding: 11, textAlign: 'center', fontSize: 13.5, fontWeight: 700, marginBottom: 9 }}>Conversar pelo WhatsApp</div>
                    <div style={{ background: '#fff', border: '1.5px solid #1f6b5c', color: '#1f6b5c', borderRadius: 10, padding: 11, textAlign: 'center', fontSize: 13.5, fontWeight: 700 }}>Confirmar que comprei</div>
                  </div>
                </div>
              </div>
              <div style={{ ...successWrap, opacity: bOp(6) }}>
                <Check /><h1 style={successH1}>Negociação concluída!</h1><p style={successP}>Depois da venda, a avaliação ajuda outros riders a comprar com mais confiança.</p>
              </div>
            </div>

            {/* SCREEN 7 — avaliar */}
            <div style={wrap(7)}>
              <div style={{ position: 'absolute', inset: 0, background: '#f6f3ec', padding: '52px 22px 0', opacity: ci === 7 ? 1 - r7 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#e8f1ec', color: '#15463b', fontSize: 12, fontWeight: 600, padding: '9px 12px', borderRadius: 10, marginBottom: 18 }}><span style={{ width: 7, height: 7, borderRadius: 999, background: '#1f6b5c' }} />Negociação concluída com Lucas M.</div>
                <h1 style={{ ...h1, fontSize: 23, marginBottom: 16 }}>Como foi a negociação?</h1>
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  {[1, 2, 3, 4, 5].map((n) => <span key={n} style={{ fontSize: 34, lineHeight: 1, color: n <= starN ? '#d9a86b' : '#d8cfbd' }}>★</span>)}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                  <span style={tagOn}>Como descrito</span><span style={tagOn}>Honesto</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, padding: '8px 13px', borderRadius: 999, background: '#fff', color: '#23332e', border: '1.5px solid #ddd5c5', whiteSpace: 'nowrap' }}>Resposta rápida</span>
                </div>
                <div style={{ fontSize: 13, color: '#9aa49d', border: '1.5px solid #e0d9c9', borderRadius: 12, padding: 13, background: '#fff' }}>Deixe um comentário, se quiser</div>
                <div style={{ ...cta, position: 'absolute', left: 22, right: 22, bottom: 24, borderRadius: 12 }}>Enviar avaliação</div>
              </div>
              <div style={{ ...successWrap, opacity: ci === 7 ? r7 : 0 }}>
                <Check /><h1 style={successH1}>Avaliação enviada!</h1><p style={successP}>Reputação real, atrelada a negócios reais. Bons ventos. 🪁</p>
              </div>
            </div>

            {/* cursor + ripple */}
            {rip && <div style={{ position: 'absolute', left: rip.x, top: rip.y, width: 64, height: 64, margin: '-32px 0 0 -32px', borderRadius: 999, border: '2.5px solid rgba(217,168,107,0.85)', opacity: 1 - rip.e, transform: `scale(${(0.3 + rip.e * 1.7).toFixed(3)})`, zIndex: 59, pointerEvents: 'none' }} />}
            <div style={{ position: 'absolute', left: cx.toFixed(1) + 'px', top: cy.toFixed(1) + 'px', width: 38, height: 38, margin: '-19px 0 0 -19px', borderRadius: 999, background: 'rgba(255,255,255,0.3)', border: '2px solid rgba(255,255,255,0.92)', boxShadow: '0 5px 16px rgba(0,0,0,0.3)', opacity: curOp, zIndex: 60, pointerEvents: 'none' }} />
            {/* notch */}
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 118, height: 25, background: '#0b1714', borderRadius: '0 0 15px 15px', zIndex: 62 }} />
          </div>
        </div>

        {/* ===== RIGHT PANEL ===== */}
        <div style={{ position: 'absolute', left: 556, top: 0, width: 724, height: 720, padding: '0 76px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 34 }}>
            <div style={{ width: 15, height: 15, background: '#d9a86b', transform: 'rotate(45deg)', borderRadius: 3 }} />
            <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.5px', textTransform: 'uppercase', color: '#fef9ef' }}>Kite Life</span>
            <span style={{ width: 5, height: 5, borderRadius: 999, background: 'rgba(231,225,212,0.35)' }} />
            <span style={{ fontFamily: "var(--font-spectral),'Spectral',serif", fontStyle: 'italic', fontSize: 16, color: '#e7c79a' }}>Como funciona</span>
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '2.5px', color: '#d9a86b', marginBottom: 14 }}>ETAPA {scene.no} / 08</div>
          <div style={{ fontFamily: "var(--font-spectral),'Spectral',serif", fontSize: 46, fontWeight: 600, lineHeight: 1.04, letterSpacing: '-0.6px', color: '#fef9ef', marginBottom: 14, maxWidth: 540 }}>{scene.label}</div>
          <div style={{ fontSize: 17, color: 'rgba(231,225,212,0.6)', lineHeight: 1.45, marginBottom: 36, maxWidth: 440 }}>{scene.sub}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, maxWidth: 440 }}>
            {SCENES.map((s, i) => {
              const st = i < ci ? 'done' : i === ci ? 'active' : 'todo';
              return (
                <div key={i} style={{ padding: '9px 14px', borderRadius: 13, background: st === 'active' ? 'rgba(255,255,255,0.06)' : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 999, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, ...(st === 'active' ? { background: '#d9a86b', color: '#23332e' } : st === 'done' ? { background: '#1f6b5c', color: '#fff' } : { background: 'rgba(255,255,255,0.07)', color: 'rgba(231,225,212,0.5)', border: '1px solid rgba(255,255,255,0.13)' }) }}>{st === 'done' ? '✓' : s.no}</div>
                    <div style={{ whiteSpace: 'nowrap', fontSize: 15, fontWeight: st === 'active' ? 700 : 600, color: st === 'active' ? '#fef9ef' : st === 'done' ? 'rgba(231,225,212,0.74)' : 'rgba(231,225,212,0.4)' }}>{s.label}</div>
                  </div>
                  {st === 'active' && (
                    <div style={{ height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.13)', margin: '9px 0 1px 43px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 999, background: '#d9a86b', width: `${(lp * 100).toFixed(1)}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Check() {
  return <div style={{ width: 62, height: 62, borderRadius: 999, background: '#e8f1ec', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}><span style={{ color: '#1f6b5c', fontSize: 30 }}>✓</span></div>;
}

const cta: CSSProperties = { background: '#1f6b5c', color: '#fff', borderRadius: 13, padding: 15, textAlign: 'center', fontSize: 16, fontWeight: 700 };
const h1: CSSProperties = { fontFamily: "var(--font-spectral),'Spectral',serif", fontSize: 26, fontWeight: 600, letterSpacing: '-0.4px', margin: '0 0 8px' };
const pSub: CSSProperties = { fontSize: 13.5, color: '#6b7a73', margin: '0 0 26px', lineHeight: 1.5 };
const lbl: CSSProperties = { fontSize: 11.5, fontWeight: 600, color: '#48564f', marginBottom: 6 };
const field: CSSProperties = { fontSize: 13.5, fontWeight: 600, border: '1.5px solid #e0d9c9', borderRadius: 10, padding: '11px 12px', background: '#fff' };
const successWrap: CSSProperties = { position: 'absolute', inset: 0, background: '#f6f3ec', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 30px', zIndex: 2 };
const successH1: CSSProperties = { fontFamily: "var(--font-spectral),'Spectral',serif", fontSize: 25, fontWeight: 600, margin: '0 0 10px' };
const successP: CSSProperties = { fontSize: 14, color: '#6b7a73', lineHeight: 1.55, margin: 0 };
const chipOff: CSSProperties = { fontSize: 12.5, fontWeight: 600, padding: '7px 14px', borderRadius: 999, background: '#fff', color: '#23332e', border: '1px solid #ddd5c5' };
const sizeChip: CSSProperties = { fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 999, background: '#fff', color: '#23332e', border: '1.5px solid #ddd5c5' };
const tagSoft: CSSProperties = { fontSize: 10.5, fontWeight: 700, color: '#1f6b5c', background: '#e8f1ec', padding: '3px 9px', borderRadius: 999 };
const tagOn: CSSProperties = { fontSize: 12.5, fontWeight: 600, padding: '8px 13px', borderRadius: 999, background: '#1f6b5c', color: '#fff', border: '1.5px solid #1f6b5c', whiteSpace: 'nowrap' };
const waTime: CSSProperties = { fontSize: 9.5, color: '#9aa49d', textAlign: 'right', marginTop: 2 };
const dot: CSSProperties = { width: 6, height: 6, borderRadius: 999, background: '#bcc4bd' };
