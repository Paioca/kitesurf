import 'server-only';
import sharp from 'sharp';
import crypto from 'crypto';
import { PublicError } from './http';
import { db } from './db';
import { r2Put, r2PublicHost, r2KeyFromPublicUrl, r2ListAll, r2DeleteKeys } from './r2';

const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

// Host EXATO do storage LEGADO do Supabase. As fotos migraram pro R2 (egress zero),
// mas URLs antigas podem sobreviver no banco durante a transição — a allowlist continua
// aceitando este host até a migração ser confirmada e o bucket antigo apagado.
function legacySupabaseHost(): string | null {
  const u = process.env.SUPABASE_URL;
  if (!u) return null;
  try {
    return new URL(u).hostname;
  } catch {
    return null;
  }
}

// Salva o buffer já processado no R2. `format` define extensão + content-type — WebP
// corta ~25-35% dos bytes vs JPEG na mesma qualidade, com suporte universal nos
// browsers atuais (e os anúncios são servidos direto via <img>, então o content-type
// correto basta — sem depender do Image Optimizer da Vercel).
async function save(buffer: Buffer, format: 'webp' | 'jpeg' = 'webp'): Promise<string> {
  const ext = format === 'webp' ? 'webp' : 'jpg';
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
  try {
    // r2Put aplica cacheControl de 1 ano — nomes únicos (UUID) são imutáveis, então o
    // browser/CDN cacheia "pra sempre" sem risco de foto velha.
    return await r2Put(path, buffer, `image/${format}`);
  } catch (e) {
    throw new Error(`Upload R2 falhou: ${(e as Error).message}`); // interno → vira genérico + Sentry
  }
}

export interface ProcessedImage {
  url: string;
  thumbUrl: string;
}

export type OrphanResult = { scanned: number; referenced: number; orphans: number; deleted: number; sample: string[] };

// Acha (e opcionalmente apaga) objetos do bucket R2 que NENHUM registro referencia
// (ListingImage.url/thumbUrl + User.avatarUrl). Report-only por padrão; só apaga com
// delete=true, e mesmo assim respeita uma carência (não toca em upload recente que
// ainda não foi salvo no banco). Loga tudo — sem corte silencioso.
export async function purgeOrphanImages(opts: { delete?: boolean; graceHours?: number } = {}): Promise<OrphanResult> {
  const cutoff = Date.now() - (opts.graceHours ?? 24) * 3600 * 1000;

  const [imgs, users] = await Promise.all([
    db.listingImage.findMany({ select: { url: true, thumbUrl: true } }),
    db.user.findMany({ where: { avatarUrl: { not: null } }, select: { avatarUrl: true } }),
  ]);
  const referenced = new Set<string>();
  const add = (u?: string | null) => { const k = u ? r2KeyFromPublicUrl(u) : null; if (k) referenced.add(k); };
  imgs.forEach((i) => { add(i.url); add(i.thumbUrl); });
  users.forEach((u) => add(u.avatarUrl));

  // Lista todas as chaves do bucket R2 (ano/uuid.ext). Órfão = não referenciado e
  // criado ANTES da carência (protege upload recém-migrado cujo banco ainda não casou).
  const objects = await r2ListAll();
  let scanned = 0;
  const orphanKeys: string[] = [];
  for (const o of objects) {
    if (!o.Key) continue;
    scanned++;
    const createdMs = o.LastModified ? o.LastModified.getTime() : 0;
    if (!referenced.has(o.Key) && createdMs < cutoff) orphanKeys.push(o.Key);
  }

  let deleted = 0;
  if (opts.delete && orphanKeys.length) {
    deleted = await r2DeleteKeys(orphanKeys);
  }
  return { scanned, referenced: referenced.size, orphans: orphanKeys.length, deleted, sample: orphanKeys.slice(0, 10) };
}

// true só se a URL é https e aponta pra um host oficial NOSSO. Bloqueia o cliente de
// persistir URL de imagem/avatar apontando pra fora (host externo, tracker, payload de
// CSS injection). Aceita dois hosts durante a transição:
//   - R2 (atual): domínio público do bucket — qualquer caminho de objeto (é nosso).
//   - Supabase (legado): host exato + caminho público de storage.
export function isOfficialImageUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  // Sem caracteres que quebrem o url("...") do CSS onde a URL é interpolada
  // (a string crua é o que persiste; new URL() normalizaria e mascararia isso).
  if (/[\s"'()\\<>]/.test(value)) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;

  const r2host = r2PublicHost();
  if (r2host && url.hostname === r2host) return true;

  const sbHost = legacySupabaseHost();
  if (sbHost && url.hostname === sbHost && url.pathname.startsWith('/storage/v1/object/public/')) return true;

  return false;
}

// Valida, REMOVE EXIF/GPS (sharp descarta metadados), resize + thumbnail.
export async function processImage(
  buffer: Buffer,
  mimetype: string,
  size: number,
  opts: { maxBytes?: number } = {},
): Promise<ProcessedImage> {
  if (!ALLOWED.includes(mimetype)) throw new PublicError('Formato inválido (use JPEG, PNG ou WebP).');
  // Teto de bytes configurável: anúncio aceita até 12 MB; avatar (upload PÚBLICO,
  // pré-conta) usa um cap menor pra encolher a superfície de abuso de storage/CPU.
  const maxBytes = opts.maxBytes ?? MAX_BYTES;
  if (size > maxBytes) throw new PublicError(`Imagem maior que ${Math.round(maxBytes / (1024 * 1024))} MB.`);

  // Decompression bomb: o gate de 12 MB é sobre os BYTES comprimidos. Um PNG/WebP de
  // <1 MB pode descomprimir pra ~256 MP (≈1 GB de bitmap) — abaixo do teto default do
  // sharp (~268 MP) e suficiente pra OOM a função serverless. Defesas:
  //  1. limitInputPixels apertado (40 MP ≈ 7300×5500) + failOn:'error' → estoura cedo,
  //     antes de alocar o bitmap gigante, em vez do default permissivo.
  //  2. metadata() valida dimensão ANTES de qualquer resize/decode pesado.
  //  3. clone() deriva main+thumb decodificando o buffer UMA vez (era 2× — dobrava o pico).
  const img = sharp(buffer, { limitInputPixels: 40_000_000, failOn: 'error' });
  const meta = await img.metadata();
  if (!meta.width || !meta.height || meta.width * meta.height > 40_000_000) {
    throw new PublicError('Imagem com dimensões inválidas ou grandes demais.');
  }

  // WebP em vez de JPEG: ~25-35% menos bytes na mesma qualidade percebida — menos
  // dados no 4G e cards que pintam mais rápido. `effort: 4` equilibra tempo de
  // encode (serverless) e tamanho final.
  const main = await img.clone().rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80, effort: 4 }).toBuffer();
  const thumb = await img.clone().rotate().resize(400, 400, { fit: 'cover' }).webp({ quality: 72, effort: 4 }).toBuffer();

  const [url, thumbUrl] = await Promise.all([save(main, 'webp'), save(thumb, 'webp')]);
  return { url, thumbUrl };
}
