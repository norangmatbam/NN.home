import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const API_BASE = 'https://open.mabimobi.life/v1';
const TERMS = [
  '크리온 파이브스타 이어링 상자',
  '크리온 펜듈럼 앤 핀 커프 상자',
  '보석 스킬 세공기',
  '그랜드 앙상블 토탈 패키지',
  '망령의 영혼석',
  '야생의 영혼석',
  '원념의 영혼석',
  '공명의 영혼석',
  '삼림의 영혼석',
  '파동의 영혼석',
];

type MarketItem = {
  name: string;
  min_price: number;
  total_count: number;
};
type MarketResponse = { data?: MarketItem[]; last_updated_at?: string };

export async function GET(request: NextRequest) {
  const key = process.env.MABIMOBI_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: '거래소 API 키가 설정되지 않았습니다.' }, { status: 500 });
  const fresh = request.nextUrl.searchParams.get('fresh') === '1';

  try {
    const payloads = await Promise.all(TERMS.map(async term => {
      const params = new URLSearchParams({
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
      const response = await fetch(`${API_BASE}/market/prices?${params}`, init);
      if (!response.ok) throw new Error(`거래소 API 조회 실패 (${response.status})`);
      return await response.json() as MarketResponse;
    }));
    const matches = new Map<string, MarketItem>();
    let updatedAt = '';
    for (const payload of payloads) {
      if (payload.last_updated_at && payload.last_updated_at > updatedAt) updatedAt = payload.last_updated_at;
      for (const item of payload.data ?? []) {
        const name = item.name.replace(/\s+/g, ' ').trim();
        if (!TERMS.includes(name) || item.total_count <= 0 || !Number.isFinite(Number(item.min_price)) || Number(item.min_price) <= 0) continue;
        const previous = matches.get(name);
        if (!previous || Number(item.min_price) < Number(previous.min_price)) matches.set(name, item);
      }
    }
    return NextResponse.json({ ok: true, items: Array.from(matches.values()), last_updated_at: updatedAt || null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : '시세 조회 실패' }, { status: 502 });
  }
}
