import { describe, it, expect, beforeAll, vi } from 'vitest';

vi.mock('../lib/db', () => ({ db: {} })); // storage importa db (não usado por isOfficialImageUrl)

import { isOfficialImageUrl } from '../lib/storage';

beforeAll(() => {
  process.env.SUPABASE_URL = 'https://proj.supabase.co';
});

const ok = 'https://proj.supabase.co/storage/v1/object/public/listings/2026/abc.jpg';

describe('isOfficialImageUrl', () => {
  it('aceita URL pública do nosso storage', () => expect(isOfficialImageUrl(ok)).toBe(true));
  it('rejeita host externo', () => expect(isOfficialImageUrl('https://i.pravatar.cc/x')).toBe(false));
  it('rejeita http (não-https)', () => expect(isOfficialImageUrl(ok.replace('https', 'http'))).toBe(false));
  it('rejeita host parecido (suffix attack)', () =>
    expect(isOfficialImageUrl('https://proj.supabase.co.evil.com/storage/v1/object/public/x.jpg')).toBe(false));
  it('rejeita fora do caminho público', () =>
    expect(isOfficialImageUrl('https://proj.supabase.co/storage/v1/object/sign/x.jpg')).toBe(false));
  it('bloqueia CSS injection (aspas/parênteses/espaço)', () =>
    expect(isOfficialImageUrl(ok + '") ;background:url(//evil')).toBe(false));
  it('rejeita não-string', () => expect(isOfficialImageUrl(123 as unknown as string)).toBe(false));
  it('rejeita string vazia', () => expect(isOfficialImageUrl('')).toBe(false));
});
