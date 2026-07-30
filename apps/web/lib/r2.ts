import 'server-only';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  type _Object,
} from '@aws-sdk/client-s3';

// Cloudflare R2 é S3-compatible: mesmo protocolo, mas EGRESS ZERO (não cobra saída).
// Foi a razão de sair do Supabase Storage — o free do Supabase tem teto de 5 GB/mês de
// egress e as fotos, servidas direto pro browser, estouravam a cota e sumiam. No R2 o
// tráfego de saída é gratuito, então esse vetor de custo/quebra deixa de existir.

const ACCOUNT = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;

export const R2_BUCKET = process.env.R2_BUCKET ?? 'listings';

// Base pública das imagens — domínio custom conectado ao bucket (ex.:
// https://img.kitetropos.com) ou o subdomínio r2.dev. SEM barra no fim (normalizamos).
// Lida dinâmica (não const de módulo) pra não congelar undefined em import antes do env.
const publicBaseEnv = () => process.env.R2_PUBLIC_BASE_URL;

let client: S3Client | null = null;
function r2(): S3Client {
  if (client) return client;
  if (!ACCOUNT || !ACCESS_KEY || !SECRET_KEY) {
    throw new Error('R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY não configurados.');
  }
  client = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  });
  return client;
}

// Base pública normalizada (sem barra final). Lança se não configurada.
export function r2PublicBase(): string {
  const base = publicBaseEnv();
  if (!base) throw new Error('R2_PUBLIC_BASE_URL não configurado.');
  return base.replace(/\/+$/, '');
}

// Host do domínio público (para allowlist de imagem). null se não configurável.
export function r2PublicHost(): string | null {
  if (!publicBaseEnv()) return null;
  try {
    return new URL(r2PublicBase()).hostname;
  } catch {
    return null;
  }
}

// Sobe um objeto e devolve a URL pública. cacheControl longo: objetos têm nome único
// (UUID) e são IMUTÁVEIS, então o browser/CDN pode cachear "pra sempre".
export async function r2Put(key: string, body: Buffer, contentType: string, cacheControl = '31536000'): Promise<string> {
  await r2().send(
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: body, ContentType: contentType, CacheControl: cacheControl }),
  );
  return `${r2PublicBase()}/${key}`;
}

// Chave (key) do objeto a partir da URL pública — ou null se não for do nosso R2.
export function r2KeyFromPublicUrl(u: string): string | null {
  if (!publicBaseEnv()) return null;
  const base = r2PublicBase();
  if (!u.startsWith(base + '/')) return null;
  return u.slice(base.length + 1);
}

// Lista TODAS as chaves do bucket (pagina o ListObjectsV2 até esvaziar).
export async function r2ListAll(): Promise<_Object[]> {
  const out: _Object[] = [];
  let token: string | undefined;
  do {
    const page = await r2().send(new ListObjectsV2Command({ Bucket: R2_BUCKET, ContinuationToken: token }));
    out.push(...(page.Contents ?? []));
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return out;
}

// Remove chaves em lotes de 1000 (limite do DeleteObjects). Devolve quantas apagou.
export async function r2DeleteKeys(keys: string[]): Promise<number> {
  let deleted = 0;
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    const res = await r2().send(
      new DeleteObjectsCommand({ Bucket: R2_BUCKET, Delete: { Objects: batch.map((Key) => ({ Key })) } }),
    );
    deleted += res.Deleted?.length ?? 0;
  }
  return deleted;
}
