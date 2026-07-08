'use client';

// Cadastro / Entrar — design Kitetropos (handoff Entrar.dc.html).
// Fluxo: telefone -> OTP -> perfil (foto obrigatória) -> pronto. Sessão em cookie.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { downscaleImage } from '../../lib/resizeImage';
import { Logo } from '../../components/ui';
import { storedLocale } from '../../components/LanguageToggle';
import { COUNTRY_NAMES } from '../../lib/geo';
import { SPOTS } from '../../lib/filters';

type Step = 'phone' | 'otp' | 'profile' | 'done';
type Channel = 'sms' | 'email';
type Intent = 'default' | 'sell' | 'favorites' | 'deals' | 'myListings';

const LOGIN_COPY = {
  pt: {
    perks: [
      'Telefone verificado para perfis mais confiáveis',
      'Reputação construída em negociações confirmadas',
      'Anúncios organizados, com fotos e detalhes do equipamento',
    ],
    intent: {
      default: {
        eyebrow: 'Entre para a comunidade',
        sideTitle: 'Um acesso simples para comprar, vender e negociar.',
        title: 'Entrar ou criar conta',
        sub: 'Sem senha. Enviamos um código para confirmar seu telefone.',
        hint: '',
        doneSub: 'Agora você pode explorar equipamentos ou anunciar seu primeiro item.',
        donePrimary: 'Explorar equipamentos',
        donePrimaryHref: '/',
        doneSecondary: 'Anunciar equipamento',
        doneSecondaryHref: '/anunciar',
      },
      sell: {
        eyebrow: 'Anuncie com mais confiança',
        sideTitle: 'Confirme seu telefone e crie um anúncio mais confiável.',
        title: 'Confirme seu telefone para anunciar',
        sub: 'Sem senha. O telefone verificado ajuda a proteger seu anúncio e evita contato solto antes de existir interesse real.',
        hint: 'Já tem conta? Use o mesmo telefone para entrar e continuar o anúncio.',
        doneSub: 'Agora você pode criar o anúncio com mais contexto para receber pedidos melhores.',
        donePrimary: 'Criar meu anúncio',
        donePrimaryHref: '/anunciar',
        doneSecondary: 'Ver kites à venda',
        doneSecondaryHref: '/',
      },
      favorites: {
        eyebrow: 'Salve para comparar depois',
        sideTitle: 'Entre para guardar anúncios e voltar com calma.',
        title: 'Entre para salvar anúncios',
        sub: 'Use seu telefone para acessar seus favoritos em qualquer visita.',
        hint: 'Já tem conta? Use o mesmo telefone e seus anúncios salvos aparecem aqui.',
        doneSub: 'Agora você pode salvar anúncios e comparar os equipamentos com calma.',
        donePrimary: 'Ver favoritos',
        donePrimaryHref: '/favoritos',
        doneSecondary: 'Ver kites à venda',
        doneSecondaryHref: '/',
      },
      deals: {
        eyebrow: 'Acompanhe cada conversa',
        sideTitle: 'Entre para ver visitas, ofertas e contatos liberados.',
        title: 'Entre para acompanhar suas negociações',
        sub: 'Aqui ficam pedidos de visita, ofertas e WhatsApp liberado quando o vendedor aceita.',
        hint: 'Já tem conta? Use o mesmo telefone para voltar às suas negociações.',
        doneSub: 'Agora você pode acompanhar visitas, ofertas e contatos liberados.',
        donePrimary: 'Ver minhas negociações',
        donePrimaryHref: '/pedidos',
        doneSecondary: 'Ver kites à venda',
        doneSecondaryHref: '/',
      },
      myListings: {
        eyebrow: 'Seu painel de vendedor',
        sideTitle: 'Entre para criar, revisar e gerenciar seus anúncios.',
        title: 'Entre para criar ou gerenciar anúncios',
        sub: 'Use seu telefone para acessar seus anúncios e acompanhar visitas e ofertas.',
        hint: 'Já tem conta? Use o mesmo telefone para abrir seu painel de vendedor.',
        doneSub: 'Agora você pode criar ou gerenciar seus anúncios.',
        donePrimary: 'Abrir meus anúncios',
        donePrimaryHref: '/conta/anuncios',
        doneSecondary: 'Criar novo anúncio',
        doneSecondaryHref: '/anunciar',
      },
    },
    sellPerks: ['Telefone verificado antes de publicar', 'Seu WhatsApp fica protegido até você aceitar', 'Anúncio com fotos, ficha técnica e contexto'],
    favoritesPerks: ['Salve anúncios para comparar depois', 'Volte quando quiser sem perder o equipamento', 'Telefone verificado para negociar com mais confiança'],
    dealsPerks: ['Acompanhe visitas, ofertas e contatos liberados', 'Receba avisos quando alguém responder', 'Histórico organizado das suas negociações'],
    myListingsPerks: ['Crie e gerencie seus anúncios em um só lugar', 'Veja visitas, ofertas e contatos liberados', 'Telefone verificado para vender com mais confiança'],
    phone: 'Telefone',
    country: 'País',
    accountEmail: 'E-mail da sua conta',
    emailAlt: 'Acesso alternativo. Pra criar uma conta nova,',
    usePhone: 'use o telefone',
    sending: 'Enviando…',
    receiveCode: 'Receber código',
    receiveAndContinue: 'Receber código e continuar',
    tryEmail: 'Tentar por e-mail',
    backToSms: 'Voltar pra entrar por SMS',
    noPhoneAccess: 'Não tenho mais acesso a esse telefone',
    termsPrefix: 'Ao continuar, você concorda com os',
    terms: 'Termos',
    privacy: 'Política de Privacidade',
    termsSuffix: 'da Kitetropos.',
    back: '‹ Voltar',
    codeTitle: 'Digite o código',
    sentTo: 'Enviamos para',
    didNotReceive: 'Não recebeu?',
    resendIn: 'Reenviar em',
    resend: 'Reenviar',
    verifying: 'Verificando…',
    verify: 'Verificar',
    phoneVerified: 'Telefone verificado',
    sellerProfile: 'Complete seu perfil de vendedor',
    profileTitle: 'Complete seu perfil',
    sellerProfileSub: 'Seu nome e sua foto ajudam compradores a confiar em quem está anunciando.',
    profileSub: 'Seu nome e sua foto ajudam outras pessoas a reconhecer com quem estão negociando.',
    profilePhoto: 'Foto de perfil',
    photoAdded: 'Foto adicionada. Toque para trocar.',
    photoRequired: 'Obrigatória. Toque para adicionar uma foto sua.',
    firstName: 'Nome',
    firstNamePlaceholder: 'Seu nome',
    lastName: 'Sobrenome',
    lastNamePlaceholder: 'Seu sobrenome',
    spot: 'Spot de interesse',
    selectSpot: 'Selecione um spot',
    nationality: 'Nacionalidade',
    emailLater: 'O e-mail você adiciona depois, no seu perfil.',
    language: 'Idioma',
    creating: 'Criando…',
    createAndList: 'Criar conta e anunciar',
    createAccount: 'Criar conta',
    completeProfile: 'Complete seu perfil',
    doneTitle: 'Tudo certo. Sua conta está pronta.',
  },
  en: {
    perks: [
      'Verified phone for more trustworthy profiles',
      'Reputation built from confirmed deals',
      'Organized listings with photos and gear details',
    ],
    intent: {
      default: {
        eyebrow: 'Join the community',
        sideTitle: 'One simple access to buy, sell, and negotiate.',
        title: 'Sign in or create account',
        sub: 'No password. We send a code to confirm your phone.',
        hint: '',
        doneSub: 'Now you can browse gear or list your first item.',
        donePrimary: 'Browse gear',
        donePrimaryHref: '/',
        doneSecondary: 'List gear',
        doneSecondaryHref: '/anunciar',
      },
      sell: {
        eyebrow: 'List with more confidence',
        sideTitle: 'Confirm your phone and create a more trustworthy listing.',
        title: 'Confirm your phone to list',
        sub: 'No password. A verified phone helps protect your listing and keeps loose contact away until there is real interest.',
        hint: 'Already have an account? Use the same phone to sign in and continue your listing.',
        doneSub: 'Now you can create a listing with more context and receive better requests.',
        donePrimary: 'Create my listing',
        donePrimaryHref: '/anunciar',
        doneSecondary: 'See kites for sale',
        doneSecondaryHref: '/',
      },
      favorites: {
        eyebrow: 'Save to compare later',
        sideTitle: 'Sign in to save listings and come back calmly.',
        title: 'Sign in to save listings',
        sub: 'Use your phone to access your favorites on any visit.',
        hint: 'Already have an account? Use the same phone and your saved listings appear here.',
        doneSub: 'Now you can save listings and compare gear calmly.',
        donePrimary: 'View favorites',
        donePrimaryHref: '/favoritos',
        doneSecondary: 'See kites for sale',
        doneSecondaryHref: '/',
      },
      deals: {
        eyebrow: 'Follow every conversation',
        sideTitle: 'Sign in to see visits, offers, and shared contacts.',
        title: 'Sign in to follow your deals',
        sub: 'This is where visit requests, offers, and WhatsApp contacts appear when the seller accepts.',
        hint: 'Already have an account? Use the same phone to return to your deals.',
        doneSub: 'Now you can follow visits, offers, and shared contacts.',
        donePrimary: 'View my deals',
        donePrimaryHref: '/pedidos',
        doneSecondary: 'See kites for sale',
        doneSecondaryHref: '/',
      },
      myListings: {
        eyebrow: 'Your seller panel',
        sideTitle: 'Sign in to create, review, and manage your listings.',
        title: 'Sign in to create or manage listings',
        sub: 'Use your phone to access your listings and follow visits and offers.',
        hint: 'Already have an account? Use the same phone to open your seller panel.',
        doneSub: 'Now you can create or manage your listings.',
        donePrimary: 'Open my listings',
        donePrimaryHref: '/conta/anuncios',
        doneSecondary: 'Create new listing',
        doneSecondaryHref: '/anunciar',
      },
    },
    sellPerks: ['Verified phone before publishing', 'Your WhatsApp stays protected until you accept', 'Listing with photos, specs, and context'],
    favoritesPerks: ['Save listings to compare later', 'Come back anytime without losing the gear', 'Verified phone to negotiate with more confidence'],
    dealsPerks: ['Follow visits, offers, and shared contacts', 'Get notified when someone replies', 'Organized history of your deals'],
    myListingsPerks: ['Create and manage your listings in one place', 'See visits, offers, and shared contacts', 'Verified phone to sell with more confidence'],
    phone: 'Phone',
    country: 'Country',
    accountEmail: 'Account email',
    emailAlt: 'Alternative access. To create a new account,',
    usePhone: 'use your phone',
    sending: 'Sending…',
    receiveCode: 'Receive code',
    receiveAndContinue: 'Receive code and continue',
    tryEmail: 'Try email',
    backToSms: 'Back to SMS sign in',
    noPhoneAccess: 'I no longer have access to this phone',
    termsPrefix: 'By continuing, you agree to Kitetropos',
    terms: 'Terms',
    privacy: 'Privacy Policy',
    termsSuffix: '',
    back: '‹ Back',
    codeTitle: 'Enter the code',
    sentTo: 'We sent it to',
    didNotReceive: "Didn't receive it?",
    resendIn: 'Resend in',
    resend: 'Resend',
    verifying: 'Verifying…',
    verify: 'Verify',
    phoneVerified: 'Phone verified',
    sellerProfile: 'Complete your seller profile',
    profileTitle: 'Complete your profile',
    sellerProfileSub: 'Your name and photo help buyers trust the person behind the listing.',
    profileSub: 'Your name and photo help people recognize who they are negotiating with.',
    profilePhoto: 'Profile photo',
    photoAdded: 'Photo added. Tap to change it.',
    photoRequired: 'Required. Tap to add a photo of yourself.',
    firstName: 'First name',
    firstNamePlaceholder: 'Your first name',
    lastName: 'Last name',
    lastNamePlaceholder: 'Your last name',
    spot: 'Spot of interest',
    selectSpot: 'Select a spot',
    nationality: 'Nationality',
    emailLater: 'You can add an email later in your profile.',
    language: 'Language',
    creating: 'Creating…',
    createAndList: 'Create account and list',
    createAccount: 'Create account',
    completeProfile: 'Complete your profile',
    doneTitle: 'All set. Your account is ready.',
  },
};

export default function Entrar() {
  const [step, setStep] = useState<Step>('phone');
  const [intent, setIntent] = useState<Intent>('default');
  // Canal: SMS é o padrão (todo cadastro novo passa por aqui). E-mail é fallback do
  // SPOF do Twilio — só funciona pra usuário JÁ EXISTENTE com email verificado, e
  // nunca cria conta nova (schema exige telefone).
  const [channel, setChannel] = useState<Channel>('sms');
  const [rawPhone, setRawPhone] = useState('');
  const [dial, setDial] = useState('+55'); // DDI do país — default Brasil
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('Brasil');
  const [spot, setSpot] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [lang, setLang] = useState<'pt' | 'en'>('pt');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Cooldown do reenvio de código. O backend limita 5 envios/hora por destino; sem
  // este contador o usuário ansioso clica "Reenviar" várias vezes, queima a cota e
  // toma 429 sem nunca ter recebido o SMS (que às vezes só estava atrasado).
  const [cooldown, setCooldown] = useState(0);
  // E-mail é canal de EXCEÇÃO — só aparece como opção quando o SMS realmente falhou
  // (502 do provider). Senão fica completamente invisível pro fluxo normal de cadastro/login.
  const [smsFailed, setSmsFailed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef('');

  useEffect(() => {
    setLang(storedLocale());
    const rawNext = new URLSearchParams(window.location.search).get('next');
    if (rawNext) {
      try {
        const u = new URL(rawNext, window.location.origin);
        if (u.origin === window.location.origin && u.pathname === '/anunciar') setIntent('sell');
        if (u.origin === window.location.origin && u.pathname === '/favoritos') setIntent('favorites');
        if (u.origin === window.location.origin && u.pathname === '/pedidos') setIntent('deals');
        if (u.origin === window.location.origin && u.pathname === '/conta/anuncios') setIntent('myListings');
      } catch {}
    }
  }, []);

  // Auto-submete o OTP quando as 6 células completam (no mock o devCode já preenche).
  // Cada código único é submetido uma vez só (evita loop em código errado).
  useEffect(() => {
    if (step === 'otp' && code.length === 6 && !loading && submittedRef.current !== code) {
      submittedRef.current = code;
      verify(false);
    }
  }, [step, code, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tique do cooldown de reenvio (1s).
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Monta E.164: se começar com +, usa direto; senão assume +55.
  const phone = rawPhone.trim().startsWith('+')
    ? '+' + rawPhone.replace(/[^\d]/g, '')
    : dial + rawPhone.replace(/[^\d]/g, '');

  async function requestOtp() {
    setError('');
    setLoading(true);
    try {
      const payload = channel === 'sms' ? { phone } : { email: email.trim().toLowerCase() };
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // 502 do canal SMS = Twilio fora/recusou. SÓ AQUI revelamos o fallback de
        // e-mail, evitando confundir o fluxo normal de cadastro com uma "opção paralela".
        if (channel === 'sms' && res.status === 502) setSmsFailed(true);
        throw new Error(data.message ?? 'Falha ao enviar código.');
      }
      // No modo mock o código volta aqui e preenche silenciosamente (sem afordância visível).
      if (data.devCode) setCode(String(data.devCode));
      setStep('otp');
      setCooldown(30); // trava o reenvio por 30s (evita lockout autoinfligido)
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function verify(withProfile = false) {
    setError('');
    setLoading(true);
    try {
      const body: any = channel === 'sms' ? { phone, code } : { email: email.trim().toLowerCase(), code };
      body.locale = lang;
      if (withProfile) Object.assign(body, { name, lastName, spot, country, avatarUrl, locale: lang });
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 400 && data.needsOnboarding) {
        setStep('profile');
        return;
      }
      if (!res.ok) throw new Error(data.message ?? 'Código inválido.');
      // Volta pro ponto de origem (ex.: o anúncio que o usuário ia contatar).
      // SÓ caminhos same-origin: `startsWith('/')` sozinho deixa passar `//evil.com`
      // e `/\evil.com` (open redirect — handoff de phishing pós-login). Resolve contra
      // a origem atual e confirma que o destino continua na mesma origem.
      const rawNext = new URLSearchParams(window.location.search).get('next');
      if (rawNext) {
        try {
          const u = new URL(rawNext, window.location.origin);
          if (u.origin === window.location.origin) {
            window.location.href = u.pathname + u.search + u.hash;
            return;
          }
        } catch { /* next malformado: ignora e segue pro fluxo normal */ }
      }
      setStep('done');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function uploadAvatar(file?: File | null) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const small = await downscaleImage(file, 512); // foto de perfil — 512px basta
      const fd = new FormData();
      fd.append('file', small);
      const res = await fetch('/api/uploads/avatar', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Falha no upload.');
      setAvatarUrl(data.url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  // Foto obrigatória (anti-fake) + nome/sobrenome + spot de interesse + nacionalidade.
  // E-mail é opcional — pedido depois, dentro da plataforma.
  const canFinish =
    !!avatarUrl &&
    name.trim().length >= 2 &&
    lastName.trim().length >= 1 &&
    !!spot &&
    !!country;
  const t = LOGIN_COPY[lang];
  const sellIntent = intent === 'sell';
  const perks = sellIntent
    ? t.sellPerks
    : intent === 'favorites'
      ? t.favoritesPerks
    : intent === 'deals'
      ? t.dealsPerks
    : intent === 'myListings'
      ? t.myListingsPerks
    : t.perks;
  const copy = t.intent[intent];

  return (
    <div style={shell}>
      {/* LEFT imagery (desktop) */}
      <div className="only-desktop" style={imagery}>
        <img src="/entrar-kite.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={imageryOverlay} />
        <div style={imageryInner}>
          <Link href="/" style={{ textDecoration: 'none' }}><Logo onDark size={22} /></Link>
          <div>
            <div style={{ fontFamily: "var(--font-spectral),'Spectral',serif", fontStyle: 'italic', fontSize: 19, color: '#e7c79a', marginBottom: 14 }}>{copy.eyebrow}</div>
            <h2 style={{ fontFamily: "var(--font-spectral),'Spectral',serif", fontSize: 38, fontWeight: 600, color: '#fff', lineHeight: 1.1, margin: '0 0 22px', maxWidth: 420 }}>
              {copy.sideTitle}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, maxWidth: 380 }}>
              {perks.map((p) => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 999, background: 'rgba(231,199,154,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <span style={{ width: 9, height: 9, background: '#e7c79a', transform: 'rotate(45deg)', borderRadius: 2 }} />
                  </span>
                  <span style={{ fontSize: 14.5, color: '#dce8e1' }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT form */}
      <div style={formWrap}>
        <div style={{ width: '100%', maxWidth: 390 }}>
          {error && <div style={errorBox}>{error}</div>}

          {step === 'phone' && (
            <>
              <h1 style={h1}>{copy.title}</h1>
              <p style={sub}>{copy.sub}</p>

              {/* Canal SMS é A interface — é por onde TODO cadastro novo passa. E-mail
                  é canal alternativo só pra quem JÁ TEM conta + email verificado, e
                  aparece como link discreto abaixo, pra não competir com o caminho
                  principal e não confundir quem chega novo. */}
              {channel === 'sms' ? (
                <>
                  <label style={lbl}>{t.phone}</label>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                    <select value={dial} onChange={(e) => setDial(e.target.value)} style={ddi} aria-label={t.country}>
                      {COUNTRIES.map((c) => <option key={c.dial} value={c.dial}>{c.flag} {c.dial}</option>)}
                    </select>
                    <input value={rawPhone} onChange={(e) => setRawPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="(85) 99988-7766" style={{ ...input, flex: 1, minWidth: 0 }} />
                  </div>
                </>
              ) : (
                <>
                  <label style={lbl}>{t.accountEmail}</label>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" placeholder="seu@email.com" style={{ ...input, width: '100%', boxSizing: 'border-box', marginBottom: 8 }} />
                  <div style={{ fontSize: 12.5, color: '#8a948d', margin: '0 0 18px', lineHeight: 1.4 }}>
                    {t.emailAlt} <button type="button" onClick={() => { setChannel('sms'); setError(''); }} style={linkInline}>{t.usePhone}</button>.
                  </div>
                </>
              )}

              <button
                onClick={requestOtp}
                disabled={
                  loading ||
                  (channel === 'sms'
                    ? rawPhone.replace(/\D/g, '').length < 8
                    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
                }
                style={primaryBtn}
              >
                {loading ? t.sending : (intent === 'default' ? t.receiveCode : t.receiveAndContinue)}
              </button>

              {/* Links secundários. "Entrar por e-mail" só aparece DEPOIS de uma falha
                  real do SMS (smsFailed) — antes disso e-mail é invisível e o fluxo
                  é só telefone. "Voltar pra SMS" aparece quando user já está no modo
                  e-mail (porque clicou em "tentar por e-mail" antes). */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', marginTop: 18 }}>
                {channel === 'sms' && smsFailed && (
                  <button type="button" onClick={() => { setChannel('email'); setError(''); }} style={{ ...linkInline, fontSize: 13.5 }}>
                    {t.tryEmail}
                  </button>
                )}
                {channel === 'email' && (
                  <button type="button" onClick={() => { setChannel('sms'); setError(''); }} style={{ ...linkInline, fontSize: 13.5 }}>
                    {t.backToSms}
                  </button>
                )}
                <Link href="/recuperar" style={{ color: '#1f6b5c', fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }}>{t.noPhoneAccess}</Link>
              </div>

              <p style={terms}>
                {t.termsPrefix}{' '}
                <Link href="/termos" target="_blank" style={{ color: '#1f6b5c', fontWeight: 600 }}>{t.terms}</Link>
                {' '}
                {lang === 'pt' ? 'e a' : 'and'}{' '}
                <Link href="/privacidade" target="_blank" style={{ color: '#1f6b5c', fontWeight: 600 }}>{t.privacy}</Link>
                {t.termsSuffix ? ` ${t.termsSuffix}` : ''}.
              </p>
              {copy.hint && <p style={{ ...terms, marginTop: 10 }}>{copy.hint}</p>}
            </>
          )}

          {step === 'otp' && (
            <>
              <button onClick={() => setStep('phone')} style={backBtn}>{t.back}</button>
              <h1 style={h1}>{t.codeTitle}</h1>
              <p style={sub}>{t.sentTo} <strong style={{ color: '#23332e' }}>{channel === 'sms' ? phone : email}</strong>.</p>
              <OtpCells value={code} onChange={setCode} />
              <div style={{ fontSize: 13, color: '#8a948d', margin: '6px 0 26px' }}>
                {t.didNotReceive}{' '}
                <button
                  onClick={requestOtp}
                  disabled={loading || cooldown > 0}
                  style={{ ...linkInline, ...(cooldown > 0 ? { color: '#a8b1aa', cursor: 'default' } : {}) }}
                >
                  {cooldown > 0 ? `${t.resendIn} ${cooldown}s` : t.resend}
                </button>
              </div>
              <button onClick={() => verify(false)} disabled={loading || code.length !== 6} style={primaryBtn}>
                {loading ? t.verifying : t.verify}
              </button>
            </>
          )}

          {step === 'profile' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: '#1f6b5c', marginBottom: 14 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: '#1f6b5c' }} />{t.phoneVerified}
              </div>
              <h1 style={h1}>{sellIntent ? t.sellerProfile : t.profileTitle}</h1>
              <p style={sub}>{sellIntent ? t.sellerProfileSub : t.profileSub}</p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
                <button onClick={() => fileRef.current?.click()} style={{ ...avatarBtn, ...(avatarUrl ? { border: 'none', backgroundImage: `url("${avatarUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}) }}>
                  {!avatarUrl && <span style={{ fontSize: 26, color: '#a8b1aa', lineHeight: 1 }}>{uploading ? '…' : '+'}</span>}
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => uploadAvatar(e.target.files?.[0])} />
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 2 }}>{t.profilePhoto} <span style={{ color: '#c0492f' }}>*</span></div>
                  <div style={{ fontSize: 12.5, color: '#8a948d', lineHeight: 1.4, maxWidth: 200 }}>
                    {avatarUrl ? t.photoAdded : t.photoRequired}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={lbl}>{t.firstName}</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" placeholder={t.firstNamePlaceholder} style={{ ...input, width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={lbl}>{t.lastName}</label>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" placeholder={t.lastNamePlaceholder} style={{ ...input, width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>

              <label style={lbl}>{t.spot}</label>
              <select value={spot} onChange={(e) => setSpot(e.target.value)} aria-label={t.spot} style={{ ...input, width: '100%', boxSizing: 'border-box', marginBottom: 14, cursor: 'pointer' }}>
                <option value="">{t.selectSpot}</option>
                {SPOTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>

              <label style={lbl}>{t.nationality}</label>
              <select value={country} onChange={(e) => setCountry(e.target.value)} aria-label={t.nationality} style={{ ...input, width: '100%', boxSizing: 'border-box', marginBottom: 14, cursor: 'pointer' }}>
                {COUNTRY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>

              <div style={{ fontSize: 12.5, color: '#9aa49d', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ width: 13, height: 13, background: '#cdd8d1', transform: 'rotate(45deg)', borderRadius: 2, flex: 'none', marginTop: 2 }} />
                {t.emailLater}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 26 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#48564f' }}>{t.language}</span>
                <div style={{ display: 'flex', border: '1px solid #d3ccbd', borderRadius: 999, overflow: 'hidden', fontSize: 12.5, fontWeight: 600 }}>
                  <button onClick={() => setLang('pt')} style={lang === 'pt' ? segOn : segOff}>Português</button>
                  <button onClick={() => setLang('en')} style={lang === 'en' ? segOn : segOff}>English</button>
                </div>
              </div>

              <button onClick={() => verify(true)} disabled={!canFinish || loading} style={canFinish ? primaryBtn : disabledBtn}>
                {loading ? t.creating : canFinish ? (sellIntent ? t.createAndList : t.createAccount) : t.completeProfile}
              </button>
            </>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center' }}>
              <div style={doneAvatar(avatarUrl)}>{!avatarUrl && 'VC'}</div>
              <h1 style={{ fontFamily: "var(--font-spectral),'Spectral',serif", fontSize: 30, fontWeight: 600, margin: '0 0 10px' }}>{t.doneTitle}</h1>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: '#6b7a73', margin: '0 0 28px' }}>{copy.doneSub}</p>
              <Link href={copy.donePrimaryHref} style={{ ...primaryBtn, display: 'block', textDecoration: 'none', textAlign: 'center', marginBottom: 11 }}>{copy.donePrimary}</Link>
              <Link href={copy.doneSecondaryHref} style={{ color: '#6b7a73', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>{copy.doneSecondary}</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OtpCells({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const cells = Array.from({ length: 6 }, (_, i) => value[i] ?? '');
  function handle(i: number, v: string) {
    const digit = v.replace(/\D/g, '').slice(-1);
    const arr = value.split('');
    arr[i] = digit;
    onChange(arr.join('').slice(0, 6));
    if (digit && i < 5) {
      const next = document.getElementById(`otp-${i + 1}`) as HTMLInputElement | null;
      next?.focus();
    }
  }
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
      {cells.map((d, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          value={d}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          onChange={(e) => handle(i, e.target.value)}
          onPaste={(e) => {
            const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            if (t) { e.preventDefault(); onChange(t); }
          }}
          style={{ flex: 1, minWidth: 0, width: 0, height: 58, borderRadius: 12, textAlign: 'center', fontSize: 23, fontWeight: 700, background: '#fff', border: d ? '2px solid #1f6b5c' : '1.5px solid #e0d9c9', boxSizing: 'border-box', padding: 0 }}
        />
      ))}
    </div>
  );
}

/* styles */
const shell: React.CSSProperties = { minHeight: '100vh', display: 'flex', background: '#f6f3ec' };
const imagery: React.CSSProperties = { position: 'relative', overflow: 'hidden', background: 'linear-gradient(160deg,#0c2520,#1f6b5c)', flex: 1.05 };
const imageryOverlay: React.CSSProperties = { position: 'absolute', inset: 0, background: 'linear-gradient(160deg,rgba(12,37,32,0.78) 0%,rgba(12,37,32,0.45) 55%,rgba(12,37,32,0.62) 100%)' };
const imageryInner: React.CSSProperties = { position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 44, minHeight: '100vh', boxSizing: 'border-box' };
const formWrap: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, minHeight: '100vh', boxSizing: 'border-box' };
const h1: React.CSSProperties = { fontFamily: "var(--font-spectral),'Spectral',serif", fontSize: 31, fontWeight: 600, letterSpacing: '-0.4px', margin: '0 0 8px' };
const sub: React.CSSProperties = { fontSize: 15, color: '#6b7a73', margin: '0 0 26px' };
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#48564f', display: 'block', marginBottom: 8 };
const input: React.CSSProperties = { fontSize: 15, fontWeight: 500, border: '1.5px solid #e0d9c9', borderRadius: 11, padding: '13px 15px', background: '#fff' };
const ddi: React.CSSProperties = { border: '1.5px solid #e0d9c9', borderRadius: 11, padding: '0 8px', background: '#fff', fontSize: 15, fontWeight: 600, flex: 'none', cursor: 'pointer', fontFamily: "var(--font-archivo),'Archivo',sans-serif" };

// DDI por país — Brasil default no topo; o resto cobre visitantes comuns nos spots brasileiros.
const COUNTRIES = [
  { flag: '🇧🇷', dial: '+55' }, { flag: '🇵🇹', dial: '+351' }, { flag: '🇦🇷', dial: '+54' },
  { flag: '🇺🇸', dial: '+1' }, { flag: '🇨🇱', dial: '+56' }, { flag: '🇺🇾', dial: '+598' },
  { flag: '🇪🇸', dial: '+34' }, { flag: '🇫🇷', dial: '+33' }, { flag: '🇩🇪', dial: '+49' },
  { flag: '🇮🇹', dial: '+39' }, { flag: '🇳🇱', dial: '+31' }, { flag: '🇬🇧', dial: '+44' },
  { flag: '🇨🇭', dial: '+41' }, { flag: '🇦🇹', dial: '+43' }, { flag: '🇧🇪', dial: '+32' },
  { flag: '🇵🇱', dial: '+48' }, { flag: '🇸🇪', dial: '+46' }, { flag: '🇳🇴', dial: '+47' },
  { flag: '🇩🇰', dial: '+45' }, { flag: '🇨🇿', dial: '+420' }, { flag: '🇮🇱', dial: '+972' },
  { flag: '🇦🇺', dial: '+61' },
];
const primaryBtn: React.CSSProperties = { width: '100%', background: '#1f6b5c', color: '#fff', border: 'none', borderRadius: 12, padding: 16, fontFamily: "var(--font-archivo),'Archivo',sans-serif", fontSize: 16, fontWeight: 700, cursor: 'pointer' };
const disabledBtn: React.CSSProperties = { ...primaryBtn, background: '#dfe3df', color: '#9aa49d', cursor: 'not-allowed' };
const terms: React.CSSProperties = { fontSize: 12, lineHeight: 1.5, color: '#9aa49d', textAlign: 'center', margin: '18px 0 0' };
const backBtn: React.CSSProperties = { background: 'none', border: 'none', fontSize: 13.5, color: '#6b7a73', cursor: 'pointer', padding: 0, marginBottom: 20, fontFamily: "var(--font-archivo),'Archivo',sans-serif" };
const linkInline: React.CSSProperties = { background: 'none', border: 'none', color: '#1f6b5c', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 'inherit', fontFamily: "var(--font-archivo),'Archivo',sans-serif" };
const errorBox: React.CSSProperties = { background: '#fdecea', color: '#b3261e', padding: 12, borderRadius: 10, fontSize: 13, marginBottom: 16 };
const avatarBtn: React.CSSProperties = { width: 74, height: 74, borderRadius: 999, flex: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '2px dashed #cbc3b2' };
const segOn: React.CSSProperties = { background: '#1f6b5c', color: '#fff', border: 'none', padding: '8px 14px', cursor: 'pointer', fontFamily: "var(--font-archivo),'Archivo',sans-serif", fontSize: 12.5, fontWeight: 700 };
const segOff: React.CSSProperties = { background: 'transparent', color: '#6b7a73', border: 'none', padding: '8px 14px', cursor: 'pointer', fontFamily: "var(--font-archivo),'Archivo',sans-serif", fontSize: 12.5, fontWeight: 600 };

function doneAvatar(url: string): React.CSSProperties {
  return { width: 72, height: 72, borderRadius: 999, background: url ? `center/cover url("${url}")` : '#1f6b5c', color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
}
