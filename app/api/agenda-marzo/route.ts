const BASE = 'https://api.themoviedb.org/3';

const PROVIDERS: Record<string, number> = {
  Netflix: 8,
  'Disney+': 337,
  'HBO Max': 384,
  'Prime Video': 119,
  'Apple TV+': 350,
  'Movistar+': 149,
  SkyShowtime: 1773,
  'Paramount+': 531,
};

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = process.env.TMDB_BEARER_TOKEN;

  if (!token) {
    return Response.json(
      { ok: false, error: 'Missing TMDB_BEARER_TOKEN' },
      { status: 500 }
    );
  }

  const fechaInicio = '2026-03-01';
  const fechaFin = '2026-03-31';

  try {
    const results = await Promise.all(
      Object.entries(PROVIDERS).map(async ([providerName, providerId]) => {
        const url =
          `${BASE}/discover/tv?language=es-ES` +
          `&watch_region=ES` +
          `&with_watch_providers=${providerId}` +
          `&air_date.gte=${fechaInicio}` +
          `&air_date.lte=${fechaFin}` +
          `&sort_by=first_air_date.asc` +
          `&page=1`;

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          cache: 'no-store',
        });

        if (!res.ok) {
          return {
            provider: providerName,
            total: 0,
            series: [],
            error: `TMDB ${res.status}`,
          };
        }

        const data = await res.json();
        const series = Array.isArray(data.results) ? data.results : [];

        return {
          provider: providerName,
          total: series.length,
          series: series.map((s: any) => ({
            id: s.id,
            name: s.name,
            first_air_date: s.first_air_date,
            overview: s.overview,
            poster_path: s.poster_path,
          })),
        };
      })
    );

    return Response.json({
      ok: true,
      month: '2026-03',
      region: 'ES',
      results,
    });
  } catch {
    return Response.json(
      { ok: false, error: 'Error fetching TMDB data' },
      { status: 500 }
    );
  }
}
