// Diagnóstico do Passo 0 — negociacao-v2.  **READ-ONLY** (não escreve NADA no banco).
//
// Rodar (em STAGING primeiro):
//   node --env-file=.env prisma/diag-negociacao-v2.mjs
//
// A migração de negociacao-v2 (estados novos + índice único parcial de
// seller_confirmed + normalização E.164) SÓ pode prosseguir quando este relatório
// estiver com TODOS os gates verdes. Ver docs/negociacao-v2.md §6.
//
// O script só LÊ e imprime. A resolução (cancelar duplicados, normalizar telefones,
// merge de colisões) é decisão humana — feita depois, com base neste relatório.

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// --- E.164 best-effort, só pra DETECTAR colisões/telefones fora do padrão. ---
// A normalização CANÔNICA entra na migração; aqui é diagnóstico.
function normalizeE164(raw) {
  if (!raw) return { value: null, ok: false, note: 'vazio' };
  const trimmed = String(raw).trim();
  // contas excluídas (anonimização LGPD): phone = "deleted_<uuid>"
  if (/^deleted_/.test(trimmed)) return { value: trimmed, ok: true, note: 'conta removida (ignorar)' };
  let digits = trimmed.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    const d = digits.slice(1).replace(/\D/g, '');
    return /^\d{10,15}$/.test(d) ? { value: '+' + d, ok: true } : { value: '+' + d, ok: false, note: 'fora de 10–15 dígitos' };
  }
  const d = digits.replace(/\D/g, '');
  if (/^55\d{10,11}$/.test(d)) return { value: '+' + d, ok: false, note: 'sem + (assumido BR)' };
  if (/^\d{10,11}$/.test(d)) return { value: '+55' + d, ok: false, note: 'sem DDI (assumido +55)' };
  return { value: d ? '+' + d : null, ok: false, note: 'ambíguo — revisar à mão' };
}

// componentes que cada venda RESERVA (matriz de unidade física, §3 da spec)
const RESERVES = { conjunto: ['kite', 'barra'], kite: ['kite'], barra: ['barra'] };
function overlaps(a, b) { const sa = new Set(RESERVES[a] ?? [a]); return (RESERVES[b] ?? [b]).some((u) => sa.has(u)); }

async function main() {
  const report = { duplicados_mesma_peca: [], conflitos_kit: [], telefones_nao_normalizados: [], colisoes_telefone: [], deals_orfaos: [] };

  // ===== 1+2. Reservas pendentes conflitantes (seller_confirmed) =====
  const pendentes = await db.deal.findMany({
    where: { status: 'seller_confirmed' },
    select: { id: true, listingId: true, component: true, buyerId: true, sellerConfirmedAt: true },
    orderBy: { sellerConfirmedAt: 'asc' },
  });
  const porListing = new Map();
  for (const d of pendentes) {
    if (!porListing.has(d.listingId)) porListing.set(d.listingId, []);
    porListing.get(d.listingId).push(d);
  }
  for (const [listingId, deals] of porListing) {
    // 1. mesma peça (mesmo component) com >1 reserva
    const porComp = new Map();
    for (const d of deals) { (porComp.get(d.component) ?? porComp.set(d.component, []).get(d.component)).push(d); }
    for (const [component, ds] of porComp) {
      if (ds.length > 1) report.duplicados_mesma_peca.push({ listingId, component, count: ds.length, dealIds: ds.map((x) => x.id) });
    }
    // 2. conflito cross-componente (conjunto × peça, ou qualquer par que sobrepõe unidade)
    for (let i = 0; i < deals.length; i++) {
      for (let j = i + 1; j < deals.length; j++) {
        if (deals[i].component !== deals[j].component && overlaps(deals[i].component, deals[j].component)) {
          report.conflitos_kit.push({ listingId, a: { id: deals[i].id, component: deals[i].component }, b: { id: deals[j].id, component: deals[j].component } });
        }
      }
    }
  }

  // ===== 3. Telefones — não-normalizados + colisões pós-normalização =====
  const users = await db.user.findMany({ select: { id: true, phone: true, deletedAt: true } });
  const byNorm = new Map();
  for (const u of users) {
    if (u.deletedAt) continue; // conta removida não entra na unicidade ativa
    const n = normalizeE164(u.phone);
    if (n.note === 'conta removida (ignorar)') continue;
    if (!n.ok) report.telefones_nao_normalizados.push({ userId: u.id, raw: u.phone, normalizado: n.value, motivo: n.note });
    const key = n.value ?? `__null_${u.id}`;
    if (!byNorm.has(key)) byNorm.set(key, []);
    byNorm.get(key).push(u.id);
  }
  for (const [norm, ids] of byNorm) {
    if (ids.length > 1) report.colisoes_telefone.push({ normalizado: norm, userIds: ids });
  }

  // ===== 4. Deals órfãos (listing inexistente/excluído) =====
  const allDeals = await db.deal.findMany({ select: { id: true, listingId: true, status: true } });
  const listingIds = [...new Set(allDeals.map((d) => d.listingId))];
  const liveListings = new Set((await db.listing.findMany({ where: { id: { in: listingIds }, deletedAt: null }, select: { id: true } })).map((l) => l.id));
  for (const d of allDeals) {
    if (!liveListings.has(d.listingId)) report.deals_orfaos.push({ dealId: d.id, listingId: d.listingId, status: d.status });
  }

  // ===== relatório =====
  const line = (n) => '─'.repeat(n);
  console.log('\n' + line(64));
  console.log('  DIAGNÓSTICO PASSO 0 — negociacao-v2  (READ-ONLY)');
  console.log(line(64));
  const sec = (titulo, arr, gate) => {
    const n = arr.length;
    const verde = gate ? (n === 0) : null;
    const tag = verde === null ? '' : verde ? '  ✅ OK' : '  ⛔ BLOQUEIA MIGRAÇÃO';
    console.log(`\n${titulo}: ${n}${tag}`);
    for (const it of arr.slice(0, 20)) console.log('   ', JSON.stringify(it));
    if (n > 20) console.log(`    … +${n - 20}`);
  };
  sec('1. seller_confirmed duplicados (mesma peça)', report.duplicados_mesma_peca, true);
  sec('2. conflitos de reserva no kit (conjunto × peça)', report.conflitos_kit, true);
  sec('3. telefones colidindo pós-normalização', report.colisoes_telefone, true);
  sec('   (telefones fora do E.164 — normalizar na migração)', report.telefones_nao_normalizados, false);
  sec('4. deals órfãos (listing excluído)', report.deals_orfaos, false);

  const bloqueia = report.duplicados_mesma_peca.length || report.conflitos_kit.length || report.colisoes_telefone.length;
  console.log('\n' + line(64));
  console.log(bloqueia
    ? '  VEREDITO: ⛔ NÃO migrar. Resolver os itens com ⛔ acima primeiro.'
    : '  VEREDITO: ✅ gates verdes — pode preparar a migração (revisar órfãos/telefones não-E.164 antes).');
  console.log(line(64) + '\n');

  // universo, pra contexto
  const [nUsers, nListings, nDeals] = await Promise.all([db.user.count(), db.listing.count(), db.deal.count()]);
  console.log(`  universo: ${nUsers} users · ${nListings} listings · ${nDeals} deals\n`);
}

main()
  .catch((e) => { console.error('ERRO:', e.message); process.exit(1); })
  .finally(() => db.$disconnect());
