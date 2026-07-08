// Importador de seeding de Cumbuco — publica anúncios reais a partir de um CSV.
//   (rodar de dentro de apps/web)  npx ts-node prisma/seed-cumbuco.ts <caminho.csv> [--dry]
// Cada linha vira 1 anúncio sob um vendedor (criado/reusado pelo telefone, WhatsApp = telefone).
// Fotos podem ser URL (http...) ou caminho local; passam por resize + EXIF strip + thumb 400px e
// vão pro Storage (mesmo pipeline do app). Idempotente: pula se já há anúncio com (vendedor, título).
//
// Coluna `type`: kite | barra | kit | <slug de categoria standalone (ex.: wing)>.
//   Standalone usa as colunas size_m2, condition e photos (ou photos_kite); wing aceita
//   opcionais controle (handles|boom|ambos) e janela (com_janela|sem_janela). `condition`
//   aceita a lista legada OU o enum do attributeSchema da categoria (ex.: novo_lacrado).
//   Categoria pode estar INATIVA — dá pra pré-carregar âncoras antes do flip (ficam
//   invisíveis na busca até ativar).
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient, ListingStatus, Prisma } from '@prisma/client';

const db = new PrismaClient();
const CONDITION = ['novo', 'seminovo', 'bom', 'usado', 'com_reparos'];
type Row = Record<string, string>;

// .env é carregado manualmente (script standalone não tem o loader do Next).
async function loadEnv() {
  try {
    const txt = await fs.readFile(path.join(process.cwd(), '.env'), 'utf8');
    for (const line of txt.split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
}

let _sb: ReturnType<typeof createClient> | null = null;
function sb() {
  if (!_sb) _sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  return _sb;
}
const BUCKET = () => process.env.SUPABASE_BUCKET ?? 'listings';

async function save(buf: Buffer): Promise<string> {
  const p = `${new Date().getFullYear()}/${randomUUID()}.jpg`;
  const { error } = await sb().storage.from(BUCKET()).upload(p, buf, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(`upload: ${error.message}`);
  return sb().storage.from(BUCKET()).getPublicUrl(p).data.publicUrl;
}

// resize main (1600) + thumb (400), strip EXIF (sharp descarta metadados).
async function processImage(buffer: Buffer): Promise<{ url: string; thumbUrl: string }> {
  const main = await sharp(buffer).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  const thumb = await sharp(buffer).rotate().resize(400, 400, { fit: 'cover' }).jpeg({ quality: 75 }).toBuffer();
  const [url, thumbUrl] = await Promise.all([save(main), save(thumb)]);
  return { url, thumbUrl };
}

// CSV parser mínimo (vírgula entre aspas, "" = aspas escapada).
function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let field = '', record: string[] = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { record.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      if (field !== '' || record.length) { record.push(field); rows.push(record); record = []; field = ''; }
    } else field += c;
  }
  if (field !== '' || record.length) { record.push(field); rows.push(record); }
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some((c) => c.trim())).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}

const cents = (reais: string) => Math.round(Number(reais.replace(/[^\d]/g, '')) * 100);

async function loadBuffer(src: string, baseDir: string): Promise<Buffer> {
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`fetch falhou (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.readFile(path.isAbsolute(src) ? src : path.join(baseDir, src));
}

async function uploadPhotos(list: string, component: 'kite' | 'barra' | null, baseDir: string, dry: boolean) {
  const out: { url: string; thumbUrl: string | null; component: string | null }[] = [];
  for (const src of list.split('|').map((s) => s.trim()).filter(Boolean)) {
    if (dry) { out.push({ url: src, thumbUrl: null, component }); continue; }
    const buf = await loadBuffer(src, baseDir);
    const r = await processImage(buf);
    out.push({ url: r.url, thumbUrl: r.thumbUrl, component });
  }
  return out;
}

async function main() {
  const csvPath = process.argv[2];
  const dry = process.argv.includes('--dry');
  if (!csvPath) { console.error('Uso: ts-node prisma/seed-cumbuco.ts <caminho.csv> [--dry]'); process.exit(1); }
  await loadEnv();
  const baseDir = path.dirname(path.resolve(csvPath));
  const rows = parseCsv(await fs.readFile(csvPath, 'utf8'));
  console.log(`${rows.length} linhas${dry ? ' (DRY RUN — não grava)' : ''}`);

  const kiteCat = await db.category.findUniqueOrThrow({ where: { slug: 'kite' } });
  const barraCat = await db.category.findUniqueOrThrow({ where: { slug: 'barra' } });
  let ok = 0, skip = 0, fail = 0;

  for (const [i, r] of rows.entries()) {
    const tag = `[${i + 1}] ${r.type} ${r.brand} ${r.model}`;
    try {
      const type = r.type;
      if (!r.seller_phone) throw new Error('seller_phone vazio');
      const isKit = type === 'kit';
      // kite/barra/kit = fluxo original; qualquer outro type é slug de categoria STANDALONE
      // (wing...). Categoria pode estar inativa (pré-carga de âncoras antes do flip).
      const standalone = !isKit && type !== 'kite' && type !== 'barra';
      const cat = standalone
        ? await db.category.findUnique({ where: { slug: type } })
        : type === 'barra' ? barraCat : kiteCat;
      if (!cat) throw new Error(`type inválido: "${r.type}" (use kite, barra, kit ou o slug de uma categoria, ex.: wing)`);
      // condition: lista legada OU enum do attributeSchema da categoria (ex.: novo_lacrado do kite/wing).
      const schemaCond: string[] = (cat.attributeSchema as any)?.properties?.condition?.enum ?? [];
      if (!CONDITION.includes(r.condition) && !schemaCond.includes(r.condition)) {
        throw new Error(`condition inválida: ${r.condition} (aceitas: ${[...new Set([...CONDITION, ...schemaCond])].join(', ')})`);
      }

      const phone = r.seller_phone.startsWith('+') ? r.seller_phone : `+55${r.seller_phone.replace(/\D/g, '')}`;
      const seller = await db.user.upsert({
        where: { phone }, update: { name: r.seller_name || undefined },
        create: { phone, name: r.seller_name || 'Vendedor', phoneVerified: true, phoneCountry: phone.startsWith('+55') ? 'BR' : 'INT' },
      });

      const title = [r.brand, r.model, type === 'barra' ? (r.line_length_m && `${r.line_length_m} m`) : (r.size_m2 && `${r.size_m2} m²`), r.year, isKit && '+ Barra'].filter(Boolean).join(' · ') || cat.namePt;
      if (await db.listing.findFirst({ where: { userId: seller.id, title } })) { console.log(`  SKIP ${tag} (já existe)`); skip++; continue; }

      const attributes = type === 'barra'
        ? { line_length_m: Number(r.line_length_m), condition: r.condition }
        : {
            size_m2: Number(r.size_m2), condition: r.condition,
            // opcionais de wing (só entram se preenchidos; inofensivos p/ kite)
            ...(r.controle ? { controle: r.controle } : {}),
            ...(r.janela ? { janela: r.janela } : {}),
          };
      const barraAttributes = isKit ? { line_length_m: Number(r.line_length_m), condition: r.condition } : undefined;

      const photos = standalone
        ? await uploadPhotos(r.photos || r.photos_kite || '', null, baseDir, dry) // peça única: sem componente
        : [
            ...(type !== 'barra' ? await uploadPhotos(r.photos_kite, 'kite', baseDir, dry) : []),
            ...(type !== 'kite' ? await uploadPhotos(r.photos_barra, 'barra', baseDir, dry) : []),
          ];
      if (photos.length < 3) throw new Error(`precisa de ≥3 fotos (tem ${photos.length})`);
      if (isKit && (!photos.some((p) => p.component === 'kite') || !photos.some((p) => p.component === 'barra'))) throw new Error('kit precisa de foto do kite E da barra');

      if (dry) { console.log(`  OK(dry) ${tag} — "${title}", ${photos.length} fotos`); ok++; continue; }
      const brand = r.brand ? (await db.brand.findFirst({ where: { name: r.brand } })) ?? (await db.brand.create({ data: { name: r.brand } })) : null;
      await db.listing.create({
        data: {
          userId: seller.id, categoryId: cat.id, brandId: brand?.id ?? null,
          year: r.year ? Number(r.year) : null, attributes: attributes as Prisma.InputJsonValue,
          description: r.description || null, // coluna opcional do CSV (ex.: "vem sem handles/boom")
          title, price: cents(r.price), city: r.city || 'Cumbuco', spot: r.spot || null,
          shippable: r.shippable === 'true', status: ListingStatus.active, lastConfirmedAt: new Date(),
          hasBarra: isKit, kitePrice: isKit && r.kite_price ? cents(r.kite_price) : null,
          barraPrice: isKit && r.barra_price ? cents(r.barra_price) : null,
          barraAttributes: (barraAttributes as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          images: { create: photos.map((p, pos) => ({ url: p.url, thumbUrl: p.thumbUrl, component: p.component, position: pos })) },
        },
      });
      console.log(`  OK ${tag} — "${title}"`);
      ok++;
    } catch (e: any) { console.error(`  FAIL ${tag} — ${e.message}`); fail++; }
  }
  console.log(`\nResumo: ${ok} criados · ${skip} pulados · ${fail} falhas`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
