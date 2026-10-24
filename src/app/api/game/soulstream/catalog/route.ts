import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CATALOG_URL = 'https://mabimobi.life/d/api/v1/soulstream/catalog';

export async function GET() {
  try {
    const response = await fetch(CATALOG_URL, {
      cache: 'no-store',
      headers: {
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Source API returned an error', upstreamStatus: response.status },
        { status: 502 },
      );
    }

    const catalog: unknown = await response.json();
    if (!catalog || typeof catalog !== 'object' || !('nodes' in catalog)
      || !Array.isArray(catalog.nodes) || catalog.nodes.length !== 283) {
      return NextResponse.json({ error: 'Invalid or incomplete Soulstream catalog' }, { status: 502 });
    }

    const ids = new Set(catalog.nodes.map((node: { sheet_id?: unknown }) => node.sheet_id));
    if (ids.size !== 283 || !catalog.nodes.every((node: { sheet_id?: unknown; x?: unknown; y?: unknown; previous_nodes?: unknown; next_nodes?: unknown; effect_data?: unknown }) =>
      typeof node.sheet_id === 'number' && Number.isSafeInteger(node.sheet_id) && typeof node.x === 'number' && Number.isFinite(node.x) && typeof node.y === 'number' && Number.isFinite(node.y)
      && Array.isArray(node.previous_nodes) && Array.isArray(node.next_nodes) && node.effect_data)) {
      return NextResponse.json({ error: 'Catalog validation failed' }, { status: 502 });
    }

    return NextResponse.json(catalog, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch {
    return NextResponse.json({ error: 'Could not fetch upstream Soulstream catalog' }, { status: 502 });
  }
}
