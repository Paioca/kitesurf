import { BadRequestException } from '@nestjs/common';

// Valida `attributes` contra o attributeSchema da categoria (taxonomia controlada).
// É isto que torna "padronizado" verdadeiro — não texto livre.
interface AttrSchema {
  required?: string[];
  properties?: Record<
    string,
    { type: string; enum?: (string | number)[]; label?: string }
  >;
}

export function validateAttributes(
  schema: AttrSchema,
  attributes: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const props = schema.properties ?? {};

  for (const key of schema.required ?? []) {
    if (attributes[key] === undefined || attributes[key] === null || attributes[key] === '') {
      throw new BadRequestException(`Atributo obrigatório ausente: ${key}`);
    }
  }

  for (const [key, value] of Object.entries(attributes)) {
    const spec = props[key];
    if (!spec) continue; // ignora atributos fora do schema
    out[key] = coerce(key, value, spec);
  }
  return out;
}

function coerce(
  key: string,
  value: unknown,
  spec: { type: string; enum?: (string | number)[] },
): unknown {
  let v: unknown = value;
  if (spec.type === 'number' || spec.type === 'integer') {
    v = Number(value);
    if (Number.isNaN(v)) throw new BadRequestException(`Atributo ${key} deve ser número.`);
    if (spec.type === 'integer' && !Number.isInteger(v)) {
      throw new BadRequestException(`Atributo ${key} deve ser inteiro.`);
    }
  } else if (spec.type === 'boolean') {
    v = value === true || value === 'true';
  } else {
    v = String(value);
  }
  if (spec.enum && !spec.enum.map(String).includes(String(v))) {
    throw new BadRequestException(`Atributo ${key} inválido. Opções: ${spec.enum.join(', ')}`);
  }
  return v;
}
