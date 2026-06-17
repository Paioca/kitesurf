import Link from 'next/link';
import { searchListings, getCategories, formatBRL, type ListingCard } from '../../lib/api';

export const dynamic = 'force-dynamic';

type SP = Record<string, string | undefined>;

export default async function AnunciosPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const [result, categories] = await Promise.all([
    searchListings(searchParams),
    getCategories(),
  ]);

  const items = result?.items ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ocean-700">Anúncios em Cumbuco</h1>
        <p className="text-sm text-ocean-900/60">
          {result ? `${result.total} resultado(s)` : 'Sem conexão com a API.'}
        </p>
      </div>

      {/* Filtros — GET, sem JS, funciona sem login */}
      <form className="grid grid-cols-2 gap-2 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-4">
        <select name="category" defaultValue={searchParams.category ?? ''} className={sel}>
          <option value="">Todas categorias</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.slug}>
              {c.namePt}
            </option>
          ))}
        </select>
        <input
          name="sizeMin"
          defaultValue={searchParams.sizeMin}
          placeholder="Tamanho mín (m²)"
          className={inp}
        />
        <input
          name="sizeMax"
          defaultValue={searchParams.sizeMax}
          placeholder="Tamanho máx (m²)"
          className={inp}
        />
        <input name="city" defaultValue={searchParams.city} placeholder="Cidade" className={inp} />
        <select name="sort" defaultValue={searchParams.sort ?? 'recent'} className={sel}>
          <option value="recent">Mais recentes</option>
          <option value="price_asc">Menor preço</option>
          <option value="price_desc">Maior preço</option>
        </select>
        <select name="shippable" defaultValue={searchParams.shippable ?? ''} className={sel}>
          <option value="">Enviável?</option>
          <option value="true">Só enviáveis</option>
          <option value="false">Só presencial</option>
        </select>
        <button className="col-span-2 rounded-lg bg-ocean-600 py-2 text-sm font-semibold text-white sm:col-span-2">
          Filtrar
        </button>
      </form>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ocean-100 p-8 text-center text-sm text-ocean-900/50">
          Nenhum anúncio encontrado. {result ? 'Ajuste os filtros ou semeie anúncios.' : ''}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((l) => (
            <Card key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ listing }: { listing: ListingCard }) {
  const size = listing.attributes?.size_m2;
  return (
    <Link
      href={`/anuncio/${listing.id}`}
      className="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-ocean-100"
    >
      <div className="aspect-square bg-sand-100">
        {listing.images?.[0]?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.images[0].url}
            alt={listing.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl">🪁</div>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium">{listing.title}</p>
        <p className="text-xs text-ocean-900/50">
          {listing.brand?.name} {listing.model?.name}
          {size ? ` · ${size}m²` : ''}
        </p>
        <p className="mt-1 font-bold text-ocean-700">{formatBRL(listing.price)}</p>
        <p className="text-xs text-ocean-900/40">
          {listing.city}
          {listing.shippable ? ' · envia' : ' · local'}
        </p>
      </div>
    </Link>
  );
}

const inp = 'rounded-lg border border-ocean-100 px-2 py-2 text-sm outline-none focus:border-ocean-500';
const sel = inp;
