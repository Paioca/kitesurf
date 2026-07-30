// Fusão da marca legada "Core" na canônica "CORE" (lista oficial do catálogo).
//
// Por quê: seeds antigos criavam uma marca "Core" vazia. Quando ela coexiste com a
// "CORE" oficial, o passo do seed.ts que renomeava "Core" -> "CORE" colide com o unique
// Brand.name (P2002) e ABORTA o seed inteiro — bloqueando, entre outros, o seed de barras
// e o de Cumbuco. Renomear não resolve; é preciso FUNDIR: reapontar as FKs de "Core" para
// "CORE" e remover a legada.
//
// FKs reapontadas: Model.brandId, Listing.brandId, Listing.barraBrandId. Colisão possível
// no unique Model(brandId,name): se "CORE" já tem um modelo de mesmo nome, o modelo legado
// é duplicata — antes de apagá-lo, os anúncios que o usam (modelId/barraModelId) são
// reapontados para o modelo canônico.
//
// Idempotente: se "Core" não existir, é no-op. Tudo numa transação. Loga os IDs alterados
// para reversão manual.
//
// Uso (com DATABASE_URL/DIRECT_URL apontando pro banco-alvo — valide o ambiente antes):
//   node prisma/merge-brand-core.mjs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LEGACY = 'Core';
const CANONICAL = 'CORE';

async function main() {
  const legacy = await prisma.brand.findUnique({ where: { name: LEGACY } });
  if (!legacy) {
    console.log(`Nada a fundir: marca "${LEGACY}" não existe. (no-op idempotente)`);
    return;
  }

  const canonical = await prisma.brand.findUnique({ where: { name: CANONICAL } });

  // Só a legada existe → rename simples (sem colisão possível no unique Brand.name).
  if (!canonical) {
    await prisma.brand.update({ where: { id: legacy.id }, data: { name: CANONICAL } });
    console.log(`Renomeado "${LEGACY}" (${legacy.id}) -> "${CANONICAL}" — não havia canônica.`);
    return;
  }

  console.log(`Fundindo "${LEGACY}" (${legacy.id}) em "${CANONICAL}" (${canonical.id})...`);

  const report = await prisma.$transaction(
    async (tx) => {
      const modelsReassigned = [];
      const modelsDeletedDup = [];

      for (const m of await tx.model.findMany({ where: { brandId: legacy.id } })) {
        const clash = await tx.model.findUnique({
          where: { brandId_name: { brandId: canonical.id, name: m.name } },
        });
        if (clash) {
          // Modelo duplicado sob a canônica: move os anúncios do legado p/ o canônico e apaga o legado.
          const a = await tx.listing.updateMany({ where: { modelId: m.id }, data: { modelId: clash.id } });
          const b = await tx.listing.updateMany({ where: { barraModelId: m.id }, data: { barraModelId: clash.id } });
          await tx.model.delete({ where: { id: m.id } });
          modelsDeletedDup.push({ id: m.id, name: m.name, mergedInto: clash.id, listingsMoved: a.count + b.count });
        } else {
          await tx.model.update({ where: { id: m.id }, data: { brandId: canonical.id } });
          modelsReassigned.push({ id: m.id, name: m.name });
        }
      }

      const l1 = await tx.listing.updateMany({ where: { brandId: legacy.id }, data: { brandId: canonical.id } });
      const l2 = await tx.listing.updateMany({ where: { barraBrandId: legacy.id }, data: { barraBrandId: canonical.id } });
      await tx.brand.delete({ where: { id: legacy.id } });

      return { modelsReassigned, modelsDeletedDup, listingBrand: l1.count, listingBarraBrand: l2.count };
    },
    { timeout: 20000 },
  );

  console.log('--- Merge concluído (guarde estes IDs para eventual reversão manual) ---');
  console.log(`Marca legada removida:  "${LEGACY}"      id=${legacy.id}`);
  console.log(`Marca canônica destino: "${CANONICAL}"      id=${canonical.id}`);
  console.log(`Modelos reapontados (${report.modelsReassigned.length}): ${JSON.stringify(report.modelsReassigned)}`);
  console.log(`Modelos duplicados removidos (${report.modelsDeletedDup.length}): ${JSON.stringify(report.modelsDeletedDup)}`);
  console.log(`Anúncios brandId reapontados:      ${report.listingBrand}`);
  console.log(`Anúncios barraBrandId reapontados: ${report.listingBarraBrand}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
