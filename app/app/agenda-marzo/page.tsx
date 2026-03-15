// app/agenda-marzo/page.tsx

async function getAgenda() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/agenda-marzo`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('No se pudo cargar la agenda');
  }

  return res.json();
}

export default async function AgendaMarzoPage() {
  const data = await getAgenda();

  return (
    <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Agenda marzo 2026</h1>

      {data.results?.map((block: any) => (
        <section key={block.provider} style={{ marginBottom: '32px' }}>
          <h2>
            {block.provider} ({block.total})
          </h2>

          {block.error ? (
            <p>Error: {block.error}</p>
          ) : block.series?.length ? (
            <ul>
              {block.series.map((serie: any) => (
                <li key={`${block.provider}-${serie.id}`}>
                  <strong>{serie.name}</strong> — estreno: {serie.first_air_date || 'sin fecha'}
                </li>
              ))}
            </ul>
          ) : (
            <p>No hay series para este proveedor.</p>
          )}
        </section>
      ))}
    </main>
  );
}
