import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import crypto from 'crypto';

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
  if (error) throw new Error(`Upload falhou: ${error.message}`);
  return supabase().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export interface ProcessedImage {
  url: string;
  thumbUrl: string;
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
  if (!ALLOWED.includes(mimetype)) throw new Error('Formato inválido (use JPEG, PNG ou WebP).');
  if (size > MAX_BYTES) throw new Error('Imagem maior que 12 MB.');

  const main = await sharp(buffer).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  const thumb = await sharp(buffer).rotate().resize(400, 400, { fit: 'cover' }).jpeg({ quality: 75 }).toBuffer();

  const [url, thumbUrl] = await Promise.all([save(main), save(thumb)]);
  return { url, thumbUrl };
}
