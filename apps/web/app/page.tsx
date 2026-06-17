// Home do Bloco 0 — placeholder. Browse/busca chegam no Bloco 1.
async function getCategories() {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  try {
    const res = await fetch(`${base}/api/catalog/categories`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function Home() {
  const categories: { id: string; slug: string; namePt: string }[] = await getCategories();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-ocean-700">
          Equipamento de kite, sem golpe.
        </h1>
        <p className="mt-2 text-ocean-900/70">
          Compra e venda em Cumbuco com pagamento protegido por escrow. Navegue sem login.
        </p>
        <a
          href="/anuncios"
          className="mt-4 inline-block rounded-lg bg-ocean-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Ver anúncios
        </a>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ocean-900/50">
          Categorias
        </h2>
        {categories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ocean-100 p-6 text-center text-sm text-ocean-900/50">
            Sem conexão com a API ou banco ainda não semeado. <br />
            Rode <code className="rounded bg-sand-100 px-1">npm run db:seed</code>.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {categories.map((c) => (
              <div
                key={c.id}
                className="rounded-xl bg-white p-4 text-center shadow-sm ring-1 ring-ocean-100"
              >
                {c.namePt}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
