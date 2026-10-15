import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const API_BASE = 'https://open.mabimobi.life/v1';

const SEARCH_TERMS = [
  '마력석',
  '영혼석',
  '백금강괴',
  '특급 목재',
  '특급 가죽',
  '특급 옷감',
  '특급 실크',
  '해연의',
  '잔영의',
];

type ApiPrice = {
  kind_id: number;
  name: string;
  parent_category: string;
  icon_url?: string | null;
  min_price: number;
  total_count: number;
  is_sold_out?: boolean;
  last_version?: string | null;
};

type PriceResponse = {
  data?: ApiPrice[];
  last_updated_at?: string;
};

async function fetchTerm(term: string, key: string, fresh: boolean) {
  const qs = new URLSearchParams({
    search: term,
    sort: 'pct_change_24h_desc',
    min_count: '1',
    limit: '100',
    offset: '0',
  });

  const init: RequestInit & { next?: { revalidate: number } } = {
    headers: { Authorization: `Bearer ${key}` },
  };

  if (fresh) init.cache = 'no-store';
  else init.next = { revalidate: 300 };

  const response = await fetch(`${API_BASE}/market/prices?${qs.toString()}`, init);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`MOBILIFE ${response.status}: ${body.slice(0, 160)}`);
  }
  return await response.json() as PriceResponse;
}

export async function GET(request: NextRequest) {
  const key = process.env.MABIMOBI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { ok: false, error: 'MABIMOBI_API_KEY가 설정되지 않았습니다.' },
      { status: 500 },
    );
  }

  const fresh = request.nextUrl.searchParams.get('fresh') === '1';

  try {
    // 9회 조회로 재료군 + 해연/잔영 완제품 전체를 한 번에 모은다.
    // 키당 분당 30회 제한을 피하기 위해 항목별 개별 조회는 하지 않는다.
    const payloads = await Promise.all(
      SEARCH_TERMS.map(term => fetchTerm(term, key, fresh))
    );

    const byName = new Map<string, ApiPrice>();
    let lastUpdatedAt = '';

    for (const payload of payloads) {
      if (payload.last_updated_at && payload.last_updated_at > lastUpdatedAt) {
        lastUpdatedAt = payload.last_updated_at;
      }
      for (const item of payload.data ?? []) {
        const prev = byName.get(item.name);
        if (!prev || item.min_price < prev.min_price) byName.set(item.name, item);
      }
    }

    return NextResponse.json({
      ok: true,
      last_updated_at: lastUpdatedAt || null,
      items: Array.from(byName.values()),
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : '거래소 시세를 불러오지 못했습니다.',
      },
      { status: 502 },
    );
  }
}
