import { getListing } from '../../../lib/queries';
import { formatBRL } from '../../../lib/api';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const CONDITION_LABEL: Record<string, string> = {
  novo: 'Novo',
  seminovo: 'Seminovo',
  bom: 'Bom',
  usado: 'Usado',
  com_reparos: 'Com reparos',
};

export default async function AnuncioPage({ params }: { params: { id: string } }) {
  const l = await getListing(params.id);
  if (!l) notFound();

  const attrs = (l.attributes ?? {}) as Record<string, any>;
  const memberSince = l.user?.createdAt
    ? new Date(l.user.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {/* Galeria */}
      <div className="space-y-2">
        <div className="aspect-square overflow-hidden rounded-2xl bg-sand-100">
          {l.images?.[0]?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.images[0].url} alt={l.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl">🪁</div>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(l.images ?? []).slice(1, 5).map((img: any) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.url}
              src={img.url}
              alt=""
              className="aspect-square rounded-lg object-cover ring-1 ring-ocean-100"
            />
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="space-y-4">
        <div>
          <span className="text-xs uppercase tracking-wide text-ocean-900/40">
            {l.category?.namePt}
          </span>
          <h1 className="text-2xl font-bold">{l.title}</h1>
          <p className="text-sm text-ocean-900/60">
            {l.brand?.name} {l.model?.name} {l.year ? `· ${l.year}` : ''}
          </p>
          <p className="mt-2 text-3xl font-bold text-ocean-700">{formatBRL(l.price)}</p>
          <p className="text-sm text-ocean-900/50">
            📍 {l.city}
            {l.spot ? ` · ${l.spot}` : ''} {l.shippable ? '· 📦 envia' : '· 🤝 presencial'}
          </p>
        </div>

        {/* Atributos padronizados */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-ocean-900/60">Especificações</h2>
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            {Object.entries(attrs).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-ocean-900/50">{label(k)}</dt>
                <dd className="font-medium">{display(k, v)}</dd>
              </div>
            ))}
          </dl>
        </div>

        {l.description && (
          <p className="whitespace-pre-line text-sm text-ocean-900/80">{l.description}</p>
        )}

        {/* Vendedor — sinais de confiança */}
        <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
          {l.user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.user.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-sand-100" />
          )}
          <div className="text-sm">
            <p className="font-semibold">{l.user?.name}</p>
            <p className="text-ocean-900/50">
              {l.user?.phoneVerified && '✅ Telefone verificado'}
              {l.user?.instagramHandle ? ` · @${l.user.instagramHandle}` : ''}
            </p>
            {memberSince && <p className="text-xs text-ocean-900/40">membro desde {memberSince}</p>}
          </div>
        </div>

        <button className="w-full rounded-lg bg-ocean-600 py-3 font-semibold text-white">
          {l.shippable ? 'Comprar com escrow' : 'Conversar com vendedor'}
        </button>
        <p className="text-center text-xs text-ocean-900/40">
          Chat e pagamento chegam nos Blocos 2 e 3.
        </p>
      </div>
    </div>
  );
}

function label(k: string) {
  const map: Record<string, string> = {
    size_m2: 'Tamanho',
    condition: 'Estado',
    repairs_count: 'Reparos',
    usage_time: 'Tempo de uso',
    bar_size: 'Tamanho da barra',
    harness_size: 'Tamanho',
    subtype: 'Tipo',
  };
  return map[k] ?? k;
}

function display(k: string, v: any) {
  if (k === 'condition') return CONDITION_LABEL[v] ?? v;
  if (k === 'size_m2') return `${v} m²`;
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  return String(v);
}
