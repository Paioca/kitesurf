'use client';

// Chat interno — design Kite Life (handoff Chat.dc.html). Polling, cookie auth.
// Adaptação Fase 0: sem botão de checkout/escrow no thread.
import { useCallback, useEffect, useRef, useState } from 'react';
import { color, font } from '../../lib/tokens';

const HATCH = 'repeating-linear-gradient(135deg,#e3ece5 0px,#e3ece5 8px,#d8e4dc 8px,#d8e4dc 16px)';
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const hhmm = (d: string) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function Chat() {
  const [convos, setConvos] = useState<any[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<any | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    const c = new URLSearchParams(window.location.search).get('c');
    if (c) { setActiveId(c); setMobileView('thread'); }
    return () => mq.removeEventListener('change', apply);
  }, []);

  const loadList = useCallback(async () => {
    const res = await fetch('/api/conversations');
    if (res.status === 401) { window.location.href = '/entrar'; return; }
    const data = await res.json();
    setConvos(data);
    setActiveId((cur) => cur ?? data[0]?.id ?? null);
  }, []);

  const loadThread = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok) setThread(await res.json());
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  // carrega + faz polling do thread ativo
  useEffect(() => {
    if (!activeId) return;
    loadThread(activeId);
    const t = setInterval(() => { loadThread(activeId); loadList(); }, 4000);
    return () => clearInterval(t);
  }, [activeId, loadThread, loadList]);

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [thread?.messages?.length]);

  async function send() {
    const body = input.trim();
    if (!body || !activeId) return;
    setSending(true);
    setInput('');
    try {
      const res = await fetch(`/api/conversations/${activeId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) });
      if (res.ok) { await loadThread(activeId); loadList(); }
    } finally { setSending(false); }
  }

  function openConvo(id: string) {
    setActiveId(id);
    setThread(null);
    setMobileView('thread');
  }

  const showList = isDesktop || mobileView === 'list';
  const showThread = isDesktop || mobileView === 'thread';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: color.bg, overflow: 'hidden' }}>
      <header style={{ background: '#fff', borderBottom: `1px solid ${color.line}`, flex: 'none' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px', height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', color: color.ink }}>
            <span style={{ width: 17, height: 17, background: color.primary, transform: 'rotate(45deg)', borderRadius: 3 }} />
            <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.5px', textTransform: 'uppercase' }}>Kite <span style={{ color: color.primary }}>Life</span></span>
          </a>
          <span style={{ fontSize: 14, fontWeight: 600, color: color.inkMute }}>Mensagens</span>
          <a href="/" style={{ fontSize: 13.5, color: color.inkFaint, textDecoration: 'none' }}>Voltar</a>
        </div>
      </header>

      <div style={{ flex: 1, minHeight: 0, maxWidth: 1240, width: '100%', margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: isDesktop ? '340px 1fr' : '1fr' }}>
        {/* LIST */}
        {showList && (
          <aside style={{ borderRight: isDesktop ? `1px solid ${color.line}` : 'none', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '20px 20px 14px', flex: 'none' }}>
              <h1 style={{ fontFamily: font.serif, fontSize: 24, fontWeight: 600, margin: 0 }}>Conversas</h1>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {convos === null && <Hint>Carregando…</Hint>}
              {convos?.length === 0 && <Hint>Nenhuma conversa ainda. Abra um anúncio e fale com o vendedor.</Hint>}
              {convos?.map((c) => <ConvoRow key={c.id} c={c} active={c.id === activeId} onClick={() => openConvo(c.id)} />)}
            </div>
          </aside>
        )}

        {/* THREAD */}
        {showThread && (
          <section style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: '#f1ede3' }}>
            {!thread ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color.inkFaint2, fontFamily: font.serif, fontStyle: 'italic' }}>
                {activeId ? 'Carregando…' : 'Escolha uma conversa'}
              </div>
            ) : (
              <>
                <div style={{ flex: 'none', background: '#fff', borderBottom: `1px solid ${color.line}`, padding: '12px 22px' }}>
                  {!isDesktop && <button onClick={() => setMobileView('list')} style={{ background: 'none', border: 'none', color: color.inkMute, fontSize: 13.5, cursor: 'pointer', padding: '0 0 8px', fontFamily: font.sans }}>‹ Conversas</button>}
                  <a href={`/anuncio/${thread.listing.id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ width: 54, height: 54, borderRadius: 11, flex: 'none', border: `1px solid ${color.line}`, backgroundImage: thread.listing.thumb ? `url("${thread.listing.thumb}")` : HATCH, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <RoleChip role={thread.role} active />
                      </div>
                      <div style={{ fontFamily: font.serif, fontSize: 17, fontWeight: 600, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{thread.listing.title}</div>
                      <div style={{ fontSize: 12.5, color: color.inkFaint }}>
                        com {thread.counterpart.name}{thread.counterpart.instagramHandle ? ` · @${thread.counterpart.instagramHandle}` : ''}{thread.counterpart.phoneVerified ? ' · ' : ''}
                        {thread.counterpart.phoneVerified && <span style={{ color: color.primary, fontWeight: 600 }}>verificado</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flex: 'none' }}>
                      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.4px' }}>{brl(thread.listing.price)}</div>
                      <div style={{ fontSize: 11.5, color: color.primary, fontWeight: 600 }}>Ver anúncio ›</div>
                    </div>
                  </a>
                </div>

                <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ alignSelf: 'center', fontSize: 11.5, fontWeight: 600, color: '#8a7a5c', background: '#f1ebdd', padding: '6px 14px', borderRadius: 999, textAlign: 'center' }}>Conversa sobre <strong style={{ color: '#6b5d3f' }}>{thread.listing.title}</strong></div>
                  {thread.messages.length === 0 && <Hint>Diga olá 👋</Hint>}
                  {thread.messages.map((m: any) => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: m.mine ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '64%', padding: '11px 14px', borderRadius: 16, ...(m.mine ? { background: color.primary, color: '#fff', borderBottomRightRadius: 5 } : { background: '#fff', color: color.ink, border: `1px solid ${color.lineCard}`, borderBottomLeftRadius: 5 }) }}>
                        {m.imageUrl && <div style={{ width: 200, height: 150, borderRadius: 10, backgroundImage: `url("${m.imageUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center', marginBottom: m.body ? 7 : 0 }} />}
                        {m.body && <div style={{ fontSize: 14.5, lineHeight: 1.45 }}>{m.body}</div>}
                        <div style={{ fontSize: 10.5, marginTop: 4, textAlign: 'right', color: m.mine ? 'rgba(255,255,255,0.6)' : '#aab4ad' }}>{hhmm(m.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ flex: 'none', background: '#fff', borderTop: `1px solid ${color.line}`, padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                    placeholder={`Escreva sobre a ${thread.listing.title.split(' · ')[0]}…`}
                    style={{ flex: 1, fontFamily: font.sans, fontSize: 14.5, border: `1.5px solid ${color.lineInput}`, borderRadius: 999, padding: '12px 18px', outline: 'none' }}
                  />
                  <button onClick={send} disabled={sending || !input.trim()} style={{ background: input.trim() ? color.primary : '#cdd8d1', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 24px', fontFamily: font.sans, fontSize: 14.5, fontWeight: 700, cursor: input.trim() ? 'pointer' : 'default', flex: 'none' }}>Enviar</button>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function ConvoRow({ c, active, onClick }: { c: any; active: boolean; onClick: () => void }) {
  const initials = (c.counterpart.name ?? '?').slice(0, 2).toUpperCase();
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', gap: 12, alignItems: 'flex-start', textAlign: 'left', padding: '14px 18px', border: 'none', borderBottom: '1px solid #efeae0', cursor: 'pointer', fontFamily: font.sans, background: active ? '#ece3d2' : 'transparent' }}>
      <div style={{ position: 'relative', width: 54, height: 54, borderRadius: 11, overflow: 'hidden', flex: 'none', border: `1px solid ${color.line}` }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: c.listing.thumb ? `url("${c.listing.thumb}")` : HATCH, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ position: 'absolute', bottom: -3, right: -3, width: 24, height: 24, borderRadius: 999, background: color.primary, color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>{initials}</div>
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
          <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.listing.title}</span>
          <span style={{ fontSize: 11, color: color.inkFaint2, flex: 'none' }}>{c.last ? hhmm(c.last.createdAt) : ''}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '3px 0 5px' }}>
          <RoleChip role={c.role} />
          <span style={{ fontSize: 11.5, color: color.inkFaint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.counterpart.name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12.5, color: color.inkMute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.last?.body ?? 'Sem mensagens'}</span>
          {c.unread > 0 && <span style={{ width: 9, height: 9, borderRadius: 999, background: color.primary, flex: 'none' }} />}
        </div>
      </div>
    </button>
  );
}

function RoleChip({ role, active }: { role: string; active?: boolean }) {
  const buying = role === 'buying';
  const label = active ? (buying ? 'Você está comprando' : 'Você está vendendo') : (buying ? 'Você compra' : 'Você vende');
  const style: React.CSSProperties = buying
    ? { color: color.primary, background: '#e8f1ec' }
    : { color: '#8a6a3a', background: '#f3e7d3' };
  return <span style={{ fontSize: active ? 11 : 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, flex: 'none', ...style }}>{label}</span>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 22, fontSize: 13, color: color.inkFaint2, textAlign: 'center' }}>{children}</div>;
}
