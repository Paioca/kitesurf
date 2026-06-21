import { describe, it, expect } from 'vitest';
import { normalizePhone } from '../lib/phone';

describe('normalizePhone', () => {
  it('colapsa `+5585…` e `5585…` no mesmo E.164', () => {
    const a = normalizePhone('+5585991234567');
    const b = normalizePhone('5585991234567');
    expect(a).toBe('+5585991234567');
    expect(b).toBe('+5585991234567');
    expect(a).toBe(b);
  });

  it('remove separadores (espaço, traço, parênteses)', () => {
    expect(normalizePhone('+55 (85) 99123-4567')).toBe('+5585991234567');
  });

  it('rejeita entrada vazia ou sem dígitos', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone('+')).toBeNull();
  });

  it('rejeita não-string', () => {
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(5585991234567 as unknown as string)).toBeNull();
  });

  it('rejeita fora do shape E.164 (curto demais, primeiro dígito 0)', () => {
    expect(normalizePhone('123')).toBeNull();
    expect(normalizePhone('005585991234567')).toBeNull();
  });
});
