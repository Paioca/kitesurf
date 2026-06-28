// Editar anúncio — só o dono. Monta os dados (serializáveis) e o schema da
// categoria pro EditForm (client).
import { notFound } from 'next/navigation';
import { getListing } from '../../../../lib/queries';
import { getCurrentUser, getNavUser } from '../../../../lib/session';
import { db } from '../../../../lib/db';
import { color } from '../../../../lib/tokens';
import { SiteHeader } from '../../../../components/SiteHeader';
import { Footer } from '../../../../components/Footer';
import { MobileAppBar } from '../../../../components/MobileChrome';
import { EditForm } from '../../../../components/EditForm';
import { isEditable, type ListingStatus } from '../../../../lib/listing-status';

export const dynamic = 'force-dynamic';

function conditionOnlySchema(schema: any) {
  const condition = schema?.properties?.condition;
  return { required: ['condition'], properties: condition ? { condition } : {} };
}

export default async function EditarAnuncio(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const [l, me] = await Promise.all([getListing(params.id), getCurrentUser()]);
  const navMe = await getNavUser();
  if (!l || !me || me.id !== l.userId) notFound();
  // Anúncio vendido/arquivado não é editável (preserva o histórico de venda).
  if (!isEditable(l.status as ListingStatus)) notFound();

  const barraCat = l.hasBarra ? await db.category.findUnique({ where: { slug: 'barra' } }) : null;
  const barraSchema = barraCat ? conditionOnlySchema(barraCat.attributeSchema) : null;
  const mainSchema = l.category?.slug === 'barra' ? conditionOnlySchema(l.category?.attributeSchema) : l.category?.attributeSchema;

  const data = {
    id: l.id,
    title: l.title,
    description: l.description,
    price: l.price,
    year: l.year,
    barraYear: (l as any).barraYear,
    city: l.city,
    spot: l.spot,
    shippable: l.shippable,
    hasBarra: l.hasBarra,
    barraBrandId: (l as any).barraBrandId,
    barraModelId: (l as any).barraModelId,
    barraCategoryId: barraCat?.id ?? null,
    kitePrice: l.kitePrice,
    barraPrice: l.barraPrice,
    attributes: l.attributes,
    barraAttributes: l.barraAttributes,
    images: (l.images ?? []).map((i: any) => ({ url: i.url, thumbUrl: i.thumbUrl, component: i.component })),
  };

  const form = <EditForm data={data} mainSchema={mainSchema as any} barraSchema={barraSchema as any} />;

  return (
    <>
      <div className="only-mobile" style={{ width: '100%', maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: color.bg }}>
        <MobileAppBar initialMe={navMe} />
        <div style={{ padding: '22px 18px 96px' }}>{form}</div>
      </div>
      <div className="only-desktop">
        <SiteHeader />
        <main style={{ padding: '40px 32px 80px' }}>{form}</main>
        <Footer />
      </div>
    </>
  );
}
