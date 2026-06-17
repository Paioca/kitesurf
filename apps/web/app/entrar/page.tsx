'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type Step = 'phone' | 'code' | 'onboarding' | 'done';

export default function EntrarPage() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('+55');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [instagram, setInstagram] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function requestOtp() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) throw new Error('Falha ao enviar código.');
      setStep('code');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function verify(withOnboarding = false) {
    setError('');
    setLoading(true);
    try {
      const body: Record<string, string> = { phone, code };
      if (withOnboarding) {
        Object.assign(body, { name, email, avatarUrl, instagramHandle: instagram });
      }
      const res = await fetch(`${API}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 400 && data.needsOnboarding) {
        setStep('onboarding');
        return;
      }
      if (!res.ok) throw new Error(data.message ?? 'Código inválido.');
      localStorage.setItem('kite_token', data.token);
      setStep('done');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-ocean-700">Entrar</h1>
      <p className="mt-1 text-sm text-ocean-900/60">
        Verificamos seu telefone por SMS. 1 número = 1 conta.
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {step === 'phone' && (
        <div className="mt-5 space-y-3">
          <Field label="Telefone (com DDI)">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+5585999999999"
              className={inputCls}
            />
          </Field>
          <Button onClick={requestOtp} loading={loading}>
            Enviar código
          </Button>
        </div>
      )}

      {step === 'code' && (
        <div className="mt-5 space-y-3">
          <p className="text-xs text-ocean-900/50">
            No modo dev, o código aparece no log da API.
          </p>
          <Field label="Código (6 dígitos)">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              className={inputCls}
            />
          </Field>
          <Button onClick={() => verify(false)} loading={loading}>
            Verificar
          </Button>
        </div>
      )}

      {step === 'onboarding' && (
        <div className="mt-5 space-y-3">
          <p className="text-sm text-ocean-900/60">Conta nova — complete seu perfil.</p>
          <Field label="Nome">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Email">
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </Field>
          <Field label="URL da foto de perfil (obrigatória)">
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className={inputCls}
            />
          </Field>
          <Field label="@Instagram (opcional)">
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Button onClick={() => verify(true)} loading={loading}>
            Criar conta
          </Button>
        </div>
      )}

      {step === 'done' && (
        <div className="mt-5 rounded-lg bg-ocean-50 p-4 text-center text-ocean-700">
          ✅ Telefone verificado. Você está logado.
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-ocean-100 px-3 py-2 text-sm outline-none focus:border-ocean-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ocean-900/60">{label}</span>
      {children}
    </label>
  );
}

function Button({
  onClick,
  loading,
  children,
}: {
  onClick: () => void;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full rounded-lg bg-ocean-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
    >
      {loading ? '...' : children}
    </button>
  );
}
