// Valida `attributes` contra o attributeSchema da categoria (taxonomia controlada).
import { PublicError } from './http';

interface AttrSchema {
  required?: string[];
  properties?: Record<string, { type: string; enum?: (string | number)[]; label?: string; min?: number; max?: number }>;
}

export function validateAttributes(
  schema: AttrSchema,
  attributes: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const props = schema.properties ?? {};

  for (const key of schema.required ?? []) {
    const v = attributes[key];
    if (v === undefined || v === null || v === '') {
      throw new PublicError(`Atributo obrigatório ausente: ${key}`);
    }
  }
  for (const [key, value] of Object.entries(attributes)) {
    const spec = props[key];
    if (!spec) continue;
    out[key] = coerce(key, value, spec);
  }
  return out;
}

function coerce(key: string, value: unknown, spec: { type: string; enum?: (string | number)[]; min?: number; max?: number }) {
  let v: unknown = value;
  if (spec.type === 'number' || spec.type === 'integer') {
    // aceita vírgula como separador decimal (pt-BR digita 8,1)
    v = Number(typeof value === 'string' ? value.replace(',', '.') : value);
    if (Number.isNaN(v)) throw new PublicError(`Atributo ${key} deve ser número.`);
    if (spec.type === 'integer' && !Number.isInteger(v)) throw new PublicError(`Atributo ${key} deve ser inteiro.`);
    if (spec.min != null && (v as number) < spec.min) throw new PublicError(`Atributo ${key} deve ser no mínimo ${spec.min}.`);
    if (spec.max != null && (v as number) > spec.max) throw new PublicError(`Atributo ${key} deve ser no máximo ${spec.max}.`);
  } else if (spec.type === 'boolean') {
    v = value === true || value === 'true';
  } else {
    v = String(value);
  }
  if (spec.enum && !spec.enum.map(String).includes(String(v))) {
    throw new PublicError(`Atributo ${key} inválido.`);
  }
  return v;
}
