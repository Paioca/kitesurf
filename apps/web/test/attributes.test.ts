import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/db', () => ({ db: {} }));

import { validateAttributes } from '../lib/attributes';

const schema = {
  required: ['size_m2'],
  properties: {
    size_m2: { type: 'number' },
    ano: { type: 'integer' },
    cond: { type: 'string', enum: ['novo', 'usado'] },
    kit: { type: 'boolean' },
  },
};

describe('validateAttributes', () => {
  it('exige atributos obrigatórios', () => expect(() => validateAttributes(schema, {})).toThrow(/obrigatório/));
  it('coage número a partir de string', () => expect(validateAttributes(schema, { size_m2: '9' })).toEqual({ size_m2: 9 }));
  it('rejeita número inválido', () => expect(() => validateAttributes(schema, { size_m2: 'x' })).toThrow(/número/));
  it('rejeita inteiro fracionado', () => expect(() => validateAttributes(schema, { size_m2: 9, ano: 2020.5 })).toThrow(/inteiro/));
  it('rejeita enum inválido', () => expect(() => validateAttributes(schema, { size_m2: 9, cond: 'meia-boca' })).toThrow(/inválido/));
  it('aceita enum válido', () => expect(validateAttributes(schema, { size_m2: 9, cond: 'novo' })).toMatchObject({ cond: 'novo' }));
  it('coage boolean', () => expect(validateAttributes(schema, { size_m2: 9, kit: 'true' })).toMatchObject({ kit: true }));
  it('ignora chaves fora do schema', () => expect(validateAttributes(schema, { size_m2: 9, lixo: 'x' })).toEqual({ size_m2: 9 }));
});
