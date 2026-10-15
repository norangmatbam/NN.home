import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const API_BASE = 'https://open.mabimobi.life/v1';

const MATERIAL_TERMS = [
  '마력석',
  '영혼석',
  '백금강괴',
  '특급 목재',
  '특급 가죽',
  '특급 옷감',
  '특급 실크',
];

const EQUIPMENT_TERMS = ['해연', '잔영'];
const PAGE_SIZE = 100;
const MAX_EQUIPMENT_PAGES = 8;

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

async function fetchTerm(
  term: string,
  key: string,
  fresh: boolean,
  offset = 0,
) {
  const qs = new URLSearchParams({
    search: term,
    sort: 'pct_change_24h_desc',
    min_count: '1',
    limit: String(PAGE_SIZE),
    offset: String(offset),
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

async function fetchEquipmentTerm(term: string, key: string, fresh: boolean) {
  const merged: ApiPrice[] = [];
  let lastUpdatedAt = '';

  for (let page = 0; page < MAX_EQUIPMENT_PAGES; page += 1) {
    const payload = await fetchTerm(term, key, fresh, page * PAGE_SIZE);
    const rows = payload.data ?? [];

    merged.push(...rows);
    if (payload.last_updated_at && payload.last_updated_at > lastUpdatedAt) {
      lastUpdatedAt = payload.last_updated_at;
    }

    if (rows.length < PAGE_SIZE) break;
  }

  return { data: merged, last_updated_at: lastUpdatedAt || undefined } satisfies PriceResponse;
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
    // 재료는 종류별 1회 조회, 완제품은 "해연" / "잔영"으로 넓게 검색하고
    // 100개 제한에 걸리지 않도록 페이지를 넘겨 수집한다.
    // 최대 호출 수는 7 + (8 × 2) = 23회로 키당 분당 30회 제한 안에 둔다.
    const [materialPayloads, equipmentPayloads] = await Promise.all([
      Promise.all(MATERIAL_TERMS.map(term => fetchTerm(term, key, fresh))),
      Promise.all(EQUIPMENT_TERMS.map(term => fetchEquipmentTerm(term, key, fresh))),
    ]);
    const payloads = [...materialPayloads, ...equipmentPayloads];

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
