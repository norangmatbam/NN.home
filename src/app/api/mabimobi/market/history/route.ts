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
  const kindId = Number.parseInt(input.get('kind_id') ?? '', 10);
  if (!Number.isSafeInteger(kindId) || kindId <= 0) {
    return Response.json(
      { error: 'kind_id must be a positive integer' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const upstream = new URL(`${API_BASE}/market/prices/history`);
  upstream.searchParams.set('kind_id', String(kindId));
  upstream.searchParams.set('days', String(intParam(input.get('days'), 7, 1, 90)));

  const interval = input.get('interval')?.trim().slice(0, 32);
  if (interval) upstream.searchParams.set('interval', interval);

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
    console.error('[mabimobi] market/prices/history failed', error);
    return Response.json(
      { error: 'Failed to reach Mabimobi OpenAPI' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
