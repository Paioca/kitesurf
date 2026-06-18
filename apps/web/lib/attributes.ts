// Valida `attributes` contra o attributeSchema da categoria (taxonomia controlada).
interface AttrSchema {
  required?: string[];
  properties?: Record<string, { type: string; enum?: (string | number)[]; label?: string }>;
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
      throw new Error(`Atributo obrigatório ausente: ${key}`);
    }
  }
  for (const [key, value] of Object.entries(attributes)) {
    const spec = props[key];
    if (!spec) continue;
    out[key] = coerce(key, value, spec);
  }
  return out;
}

function coerce(key: string, value: unknown, spec: { type: string; enum?: (string | number)[] }) {
  let v: unknown = value;
  if (spec.type === 'number' || spec.type === 'integer') {
    v = Number(value);
    if (Number.isNaN(v)) throw new Error(`Atributo ${key} deve ser número.`);
    if (spec.type === 'integer' && !Number.isInteger(v)) throw new Error(`Atributo ${key} deve ser inteiro.`);
  } else if (spec.type === 'boolean') {
    v = value === true || value === 'true';
  } else {
    v = String(value);
  }
  if (spec.enum && !spec.enum.map(String).includes(String(v))) {
    throw new Error(`Atributo ${key} inválido.`);
  }
  return v;
}
