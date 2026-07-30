import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { r2Put, r2PublicBase } from './r2';
import { db } from './db';

// Migração one-shot Supabase Storage -> Cloudflare R2, rodada DENTRO da Vercel (onde as
// credenciais de prod já existem). Duas etapas independentes:
//   - 'copy': baixa cada objeto do Supabase e sobe pro R2 (idempotente; sobrescreve).
//   - 'db':   reescreve as URLs públicas no banco (Supabase -> base do R2).
// dry-run por padrão; só grava com apply=true. Ver runbook em docs/.

const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET ?? 'listings';

let sbClient: SupabaseClient | null = null;
function supabase(): SupabaseClient {
  if (sbClient) return sbClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados.');
  sbClient = createClient(url, key, { auth: { persistSession: false } });
  return sbClient;
}

const MARKER = `/storage/v1/object/public/${SUPABASE_BUCKET}/`;

// key (ano/uuid.ext) a partir de uma URL pública do Supabase; null se não casar.
function keyFromSupabaseUrl(u?: string | null): string | null {
  if (!u) return null;
  const i = u.indexOf(MARKER);
  return i === -1 ? null : u.slice(i + MARKER.length);
}

function contentTypeFor(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase();
  if (ext === 'webp') return 'image/webp';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

export type CopyResult = { scanned: number; copied: number; failed: number; remaining: number; errors: string[] };

// Copia objetos Supabase -> R2. `limit` limita quantos COPIAR nesta chamada (proteção de
// timeout serverless); `remaining` diz quantos ficaram pra próxima chamada. O download do
// Supabase conta como egress lá — se a cota estiver estourada, cai em erro aqui.
export async function copyObjectsToR2(opts: { apply?: boolean; limit?: number } = {}): Promise<CopyResult> {
  const limit = opts.limit ?? 500;
  const sb = supabase();
  const errors: string[] = [];
  let scanned = 0, copied = 0, failed = 0, remaining = 0;

  const folders = await sb.storage.from(SUPABASE_BUCKET).list('', { limit: 1000 });
  for (const folder of folders.data ?? []) {
    if (folder.id !== null) continue; // null id = pasta (ano)
    let offset = 0;
    for (;;) {
      const page = await sb.storage.from(SUPABASE_BUCKET).list(folder.name, { limit: 1000, offset });
      const files = page.data ?? [];
      if (!files.length) break;
      for (const f of files) {
        if (f.id === null) continue;
        scanned++;
        if (!opts.apply) { copied++; continue; } // dry-run conta como "copiaria"
        if (copied >= limit) { remaining++; continue; }
        const key = `${folder.name}/${f.name}`;
        const { data, error } = await sb.storage.from(SUPABASE_BUCKET).download(key);
        if (error || !data) { failed++; if (errors.length < 10) errors.push(`download ${key}: ${error?.message}`); continue; }
        try {
          const buf = Buffer.from(await data.arrayBuffer());
          await r2Put(key, buf, contentTypeFor(key));
          copied++;
        } catch (e) {
          failed++;
          if (errors.length < 10) errors.push(`upload ${key}: ${(e as Error).message}`);
        }
      }
      if (files.length < 1000) break;
      offset += files.length;
    }
  }
  return { scanned, copied, failed, remaining, errors };
}

export type DbRewriteResult = { listingImages: number; avatars: number };

// Reescreve URLs Supabase -> R2 no banco. Só toca linhas cuja URL casa com o marcador
// público do Supabase (idempotente: rodar de novo não mexe nas que já são R2).
export async function rewriteDbUrlsToR2(opts: { apply?: boolean } = {}): Promise<DbRewriteResult> {
  const base = r2PublicBase();
  let listingImages = 0, avatars = 0;

  const imgs = await db.listingImage.findMany({ select: { id: true, url: true, thumbUrl: true } });
  for (const img of imgs) {
    const data: { url?: string; thumbUrl?: string } = {};
    const uk = keyFromSupabaseUrl(img.url);
    if (uk) data.url = `${base}/${uk}`;
    const tk = keyFromSupabaseUrl(img.thumbUrl);
    if (tk) data.thumbUrl = `${base}/${tk}`;
    if (Object.keys(data).length) {
      listingImages++;
      if (opts.apply) await db.listingImage.update({ where: { id: img.id }, data });
    }
  }

  const users = await db.user.findMany({ where: { avatarUrl: { not: null } }, select: { id: true, avatarUrl: true } });
  for (const u of users) {
    const ak = keyFromSupabaseUrl(u.avatarUrl);
    if (ak) {
      avatars++;
      if (opts.apply) await db.user.update({ where: { id: u.id }, data: { avatarUrl: `${base}/${ak}` } });
    }
  }
  return { listingImages, avatars };
}
