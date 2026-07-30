// Migra as fotos dos anúncios/avatares do Supabase Storage para o Cloudflare R2 e
// reescreve as URLs públicas no banco. Motivo: o free do Supabase tem teto de egress
// (5 GB/mês) e as fotos, servidas direto pro browser, estouravam a cota e sumiam. No R2
// o egress é gratuito — o problema deixa de existir.
//
// SEGURANÇA:
//   - Dry-run por padrão. Só grava com --apply.
//   - Idempotente: rodar de novo não duplica (R2 sobrescreve a mesma key; a reescrita de
//     URL só age em linhas que ainda apontam pro Supabase).
//   - Só reescreve linhas cuja URL casa com o marcador público do Supabase; ignora o resto.
//
// USO (com o env de PRODUÇÃO carregado — DATABASE_URL de prod, SUPABASE_* de prod, R2_*):
//   node --env-file=.env.prod apps/web/scripts/migrate-images-to-r2.mjs            # dry-run
//   node --env-file=.env.prod apps/web/scripts/migrate-images-to-r2.mjs --apply    # executa
//   flags extras: --copy-only (só copia objetos)  |  --db-only (só reescreve o banco)

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const APPLY = process.argv.includes('--apply');
const COPY_ONLY = process.argv.includes('--copy-only');
const DB_ONLY = process.argv.includes('--db-only');

const need = (k) => {
  const v = process.env[k];
  if (!v) { console.error(`env faltando: ${k}`); process.exit(1); }
  return v;
};

const SUPABASE_URL = need('SUPABASE_URL');
const SUPABASE_KEY = need('SUPABASE_SERVICE_ROLE_KEY');
const BUCKET = process.env.SUPABASE_BUCKET ?? 'listings';

const R2_ACCOUNT = need('R2_ACCOUNT_ID');
const R2_KEY = need('R2_ACCESS_KEY_ID');
const R2_SECRET = need('R2_SECRET_ACCESS_KEY');
const R2_BUCKET = process.env.R2_BUCKET ?? 'listings';
const R2_BASE = need('R2_PUBLIC_BASE_URL').replace(/\/+$/, '');

const MARKER = `/storage/v1/object/public/${BUCKET}/`;

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_KEY, secretAccessKey: R2_SECRET },
});
const db = new PrismaClient();

const contentTypeFor = (key) => {
  const ext = key.split('.').pop()?.toLowerCase();
  if (ext === 'webp') return 'image/webp';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return 'application/octet-stream';
};

// key (ano/uuid.ext) a partir de uma URL pública do Supabase; null se não casar.
const keyFromSupabaseUrl = (u) => {
  if (!u) return null;
  const i = u.indexOf(MARKER);
  return i === -1 ? null : u.slice(i + MARKER.length);
};

// ---- Passo 1: copiar objetos Supabase -> R2 -------------------------------------------
async function copyObjects() {
  console.log(`\n== COPIA objetos: Supabase[${BUCKET}] -> R2[${R2_BUCKET}] ==`);
  let scanned = 0, copied = 0, failed = 0;
  const folders = await sb.storage.from(BUCKET).list('', { limit: 1000 });
  for (const folder of folders.data ?? []) {
    if (folder.id !== null) continue; // null id = pasta (ano)
    let offset = 0;
    for (;;) {
      const page = await sb.storage.from(BUCKET).list(folder.name, { limit: 1000, offset });
      const files = page.data ?? [];
      if (!files.length) break;
      for (const f of files) {
        if (f.id === null) continue;
        const key = `${folder.name}/${f.name}`;
        scanned++;
        if (!APPLY) { copied++; continue; }
        const { data, error } = await sb.storage.from(BUCKET).download(key);
        if (error || !data) { console.error(`  ERRO download ${key}: ${error?.message}`); failed++; continue; }
        const buf = Buffer.from(await data.arrayBuffer());
        try {
          await r2.send(new PutObjectCommand({
            Bucket: R2_BUCKET, Key: key, Body: buf,
            ContentType: contentTypeFor(key), CacheControl: '31536000',
          }));
          copied++;
          if (copied % 50 === 0) console.log(`  ...${copied} copiados`);
        } catch (e) { console.error(`  ERRO upload ${key}: ${e.message}`); failed++; }
      }
      if (files.length < 1000) break;
      offset += files.length;
    }
  }
  console.log(`  objetos: scanned=${scanned} copied=${copied} failed=${failed}${APPLY ? '' : ' (dry-run)'}`);
  return { scanned, copied, failed };
}

// ---- Passo 2: reescrever URLs no banco ------------------------------------------------
async function rewriteDb() {
  console.log(`\n== REESCRITA de URLs no banco: Supabase -> ${R2_BASE} ==`);
  let imgRows = 0, avatarRows = 0;

  const imgs = await db.listingImage.findMany({ select: { id: true, url: true, thumbUrl: true } });
  for (const img of imgs) {
    const patch = {};
    const nk = keyFromSupabaseUrl(img.url);
    if (nk) patch.url = `${R2_BASE}/${nk}`;
    const tk = keyFromSupabaseUrl(img.thumbUrl);
    if (tk) patch.thumbUrl = `${R2_BASE}/${tk}`;
    if (Object.keys(patch).length) {
      imgRows++;
      if (APPLY) await db.listingImage.update({ where: { id: img.id }, data: patch });
    }
  }

  const users = await db.user.findMany({ where: { avatarUrl: { not: null } }, select: { id: true, avatarUrl: true } });
  for (const u of users) {
    const ak = keyFromSupabaseUrl(u.avatarUrl);
    if (ak) {
      avatarRows++;
      if (APPLY) await db.user.update({ where: { id: u.id }, data: { avatarUrl: `${R2_BASE}/${ak}` } });
    }
  }
  console.log(`  linhas atualizadas: listingImage=${imgRows} user.avatar=${avatarRows}${APPLY ? '' : ' (dry-run)'}`);
  return { imgRows, avatarRows };
}

async function main() {
  console.log(APPLY ? '>>> MODO APLICAR (grava) <<<' : '>>> DRY-RUN (nada é gravado; use --apply) <<<');
  if (!DB_ONLY) await copyObjects();
  if (!COPY_ONLY) await rewriteDb();
  console.log('\nOK. Ordem recomendada: copiar objetos ANTES de reescrever o banco.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
