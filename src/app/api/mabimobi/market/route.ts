'use server';

const API_BASE = 'https://open.mabimobi.life/v1';

function intParam(value: string | null, fallback: number, min: number, max: number) {
  const n = value == null || value === '' ? fallback : Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function GET(request: Request) {
  const apiKey = process.env.MABIMOBI_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      { error: 'MABIMOBI_API_KEY is not configured' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const input = new URL(request.url).searchParams;
  const upstream = new URL(`${API_BASE}/market/prices`);

  const parentCategory = input.get('parent_category')?.trim().slice(0, 80);
  const search = input.get('search')?.trim().slice(0, 80);
  const sort = input.get('sort')?.trim().slice(0, 64);

  if (parentCategory) upstream.searchParams.set('parent_category', parentCategory);
  if (search) upstream.searchParams.set('search', search);
  if (sort) upstream.searchParams.set('sort', sort);

  const minCount = input.get('min_count');
  if (minCount != null && minCount !== '') {
    upstream.searchParams.set('min_count', String(intParam(minCount, 0, 0, 1_000_000_000)));
  }
  upstream.searchParams.set('limit', String(intParam(input.get('limit'), 100, 1, 100)));
  upstream.searchParams.set('offset', String(intParam(input.get('offset'), 0, 0, 1_000_000)));

  try {
    const response = await fetch(upstream, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'application/json; charset=utf-8',
        'Cache-Control': response.ok
          ? 'public, s-maxage=300, stale-while-revalidate=60'
          : 'no-store',
      },
    });
  } catch (error) {
    console.error('[mabimobi] market/prices failed', error);
    return Response.json(
      { error: 'Failed to reach Mabimobi OpenAPI' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
