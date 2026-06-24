import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import crypto from 'crypto';
import { PublicError } from './http';
import { db } from './db';

const BUCKET = process.env.SUPABASE_BUCKET ?? 'listings';
const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

let client: SupabaseClient | null = null;
function supabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados.');
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

async function save(buffer: Buffer): Promise<string> {
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase()
    .storage.from(BUCKET)
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(`Upload Supabase falhou: ${error.message}`); // interno → vira genérico + Sentry
  return supabase().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export interface ProcessedImage {
  url: string;
  thumbUrl: string;
}

// Caminho dentro do bucket a partir da URL pública (ou null se não for nossa).
function pathFromPublicUrl(u: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = u.indexOf(marker);
  return i === -1 ? null : u.slice(i + marker.length);
}

export type OrphanResult = { scanned: number; referenced: number; orphans: number; deleted: number; sample: string[] };

// Acha (e opcionalmente apaga) objetos do bucket que NENHUM registro referencia
// (ListingImage.url/thumbUrl + User.avatarUrl). Report-only por padrão; só apaga com
// delete=true, e mesmo assim respeita uma carência (não toca em upload recente que
// ainda não foi salvo no banco). Loga tudo — sem corte silencioso.
export async function purgeOrphanImages(opts: { delete?: boolean; graceHours?: number } = {}): Promise<OrphanResult> {
  const sb = supabase();
  const cutoff = Date.now() - (opts.graceHours ?? 24) * 3600 * 1000;

  const [imgs, users] = await Promise.all([
    db.listingImage.findMany({ select: { url: true, thumbUrl: true } }),
    db.user.findMany({ where: { avatarUrl: { not: null } }, select: { avatarUrl: true } }),
  ]);
  const referenced = new Set<string>();
  const add = (u?: string | null) => { const p = u ? pathFromPublicUrl(u) : null; if (p) referenced.add(p); };
  imgs.forEach((i) => { add(i.url); add(i.thumbUrl); });
  users.forEach((u) => add(u.avatarUrl));

  // Lista o bucket: pastas (ano) no topo, arquivos dentro de cada uma.
  let scanned = 0;
  const orphanPaths: string[] = [];
  const folders = await sb.storage.from(BUCKET).list('', { limit: 1000 });
  for (const folder of folders.data ?? []) {
    if (folder.id !== null) continue; // null id = pasta
    let offset = 0;
    for (;;) {
      const page = await sb.storage.from(BUCKET).list(folder.name, { limit: 1000, offset });
      const files = page.data ?? [];
      if (!files.length) break;
      for (const f of files) {
        if (f.id === null) continue;
        scanned++;
        const path = `${folder.name}/${f.name}`;
        const createdMs = f.created_at ? new Date(f.created_at).getTime() : 0;
        if (!referenced.has(path) && createdMs < cutoff) orphanPaths.push(path);
      }
      if (files.length < 1000) break;
      offset += files.length;
    }
  }

  let deleted = 0;
  if (opts.delete && orphanPaths.length) {
    // remove em lotes de 100
    for (let i = 0; i < orphanPaths.length; i += 100) {
      const batch = orphanPaths.slice(i, i + 100);
      const { error } = await sb.storage.from(BUCKET).remove(batch);
      if (!error) deleted += batch.length;
    }
  }
  return { scanned, referenced: referenced.size, orphans: orphanPaths.length, deleted, sample: orphanPaths.slice(0, 10) };
}

// Host oficial do storage (derivado do SUPABASE_URL).
function officialImageHost(): string | null {
  const u = process.env.SUPABASE_URL;
  if (!u) return null;
  try {
    return new URL(u).hostname;
  } catch {
    return null;
  }
}

// true só se a URL é https, aponta pro host do NOSSO Supabase e está no caminho
// público de storage. Bloqueia o cliente de persistir URL de imagem/avatar
// apontando pra fora (host externo, tracker, payload de CSS injection).
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
  const host = officialImageHost();
  if (!host || url.hostname !== host) return false;
  return url.pathname.startsWith('/storage/v1/object/public/');
}

// Valida, REMOVE EXIF/GPS (sharp descarta metadados), resize + thumbnail.
export async function processImage(
  buffer: Buffer,
  mimetype: string,
  size: number,
): Promise<ProcessedImage> {
  if (!ALLOWED.includes(mimetype)) throw new PublicError('Formato inválido (use JPEG, PNG ou WebP).');
  if (size > MAX_BYTES) throw new PublicError('Imagem maior que 12 MB.');

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

  const main = await img.clone().rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  const thumb = await img.clone().rotate().resize(400, 400, { fit: 'cover' }).jpeg({ quality: 75 }).toBuffer();

  const [url, thumbUrl] = await Promise.all([save(main), save(thumb)]);
  return { url, thumbUrl };
}
