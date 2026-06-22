// Editar anúncio — só o dono. Monta os dados (serializáveis) e o schema da
// categoria pro EditForm (client).
import { notFound } from 'next/navigation';
import { getListing } from '../../../../lib/queries';
import { getCurrentUser } from '../../../../lib/session';
import { db } from '../../../../lib/db';
import { color } from '../../../../lib/tokens';
import { SiteHeader } from '../../../../components/SiteHeader';
import { Footer } from '../../../../components/Footer';
import { MobileAppBar } from '../../../../components/MobileChrome';
import { EditForm } from '../../../../components/EditForm';
import { isEditable, type ListingStatus } from '../../../../lib/listing-status';

export const dynamic = 'force-dynamic';

export default async function EditarAnuncio(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const [l, me] = await Promise.all([getListing(params.id), getCurrentUser()]);
  if (!l || !me || me.id !== l.userId) notFound();
  // Anúncio vendido/arquivado não é editável (preserva o histórico de venda).
  if (!isEditable(l.status as ListingStatus)) notFound();

  const barraSchema = l.hasBarra ? (await db.category.findUnique({ where: { slug: 'barra' } }))?.attributeSchema ?? null : null;

  const data = {
    id: l.id,
    title: l.title,
    description: l.description,
    price: l.price,
    city: l.city,
    spot: l.spot,
    shippable: l.shippable,
    hasBarra: l.hasBarra,
    kitePrice: l.kitePrice,
    barraPrice: l.barraPrice,
    attributes: l.attributes,
    barraAttributes: l.barraAttributes,
    images: (l.images ?? []).map((i: any) => ({ url: i.url, thumbUrl: i.thumbUrl, component: i.component })),
  };

  const form = <EditForm data={data} mainSchema={l.category?.attributeSchema as any} barraSchema={barraSchema as any} />;

  return (
    <>
      <div className="only-mobile" style={{ width: '100%', maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: color.bg }}>
        <MobileAppBar />
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
