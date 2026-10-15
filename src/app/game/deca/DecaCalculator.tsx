'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './deca.module.css';

const ITEMS = [
  '크리온 파이브스타 이어링 상자',
  '크리온 펜듈럼 앤 핀 커프 상자',
  '보석 스킬 세공기',
] as const;
type ItemName = typeof ITEMS[number];
const CASH_PRICE: Record<ItemName, { cash: number; won: number }> = {
  '크리온 파이브스타 이어링 상자': { cash: 600, won: 6000 },
  '크리온 펜듈럼 앤 핀 커프 상자': { cash: 600, won: 6000 },
  '보석 스킬 세공기': { cash: 100, won: 1000 },
};
type MarketItem = { name: string; min_price: number; total_count: number };
type Payload = { ok: boolean; items?: MarketItem[]; last_updated_at?: string | null; error?: string };

const STORAGE_KEY = 'nn-game-deca-calculator-v1';
const FEE_RATE = 0.15;
const fmt = (value: number) => value.toLocaleString('ko-KR');
const parseAmount = (value: string) => Math.max(0, Math.floor(Number(value) || 0));

export default function DecaCalculator() {
  const [required, setRequired] = useState('0');
  const [owned, setOwned] = useState('0');
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<'required' | 'owned' | null>(null);
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const value = JSON.parse(raw) as { required?: unknown; owned?: unknown };
        setRequired(String(parseAmount(String(value.required ?? 0))));
        setOwned(String(parseAmount(String(value.owned ?? 0))));
      }
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ required, owned })); } catch {}
  }, [required, owned, loaded]);

  const loadMarket = useCallback(async (fresh = false) => {
    setLoading(true);
    setError('');
    setItems([]);
    try {
      const response = await fetch('/api/game/deca' + (fresh ? '?fresh=1' : ''), { cache: 'no-store' });
      const payload = await response.json() as Payload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || '거래소 조회 실패');
      setItems(payload.items ?? []);
      setUpdatedAt(payload.last_updated_at ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '시세 조회 실패');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { if (loaded) void loadMarket(false); }, [loaded, loadMarket]);

  const shortage = Math.max(0, parseAmount(required) - parseAmount(owned));
  const changeValue = (field: 'required' | 'owned', text: string) => {
    if (text !== '' && (!/^\d+$/.test(text) || Number(text) > Number.MAX_SAFE_INTEGER)) return;
    (field === 'required' ? setRequired : setOwned)(text);
  };
  const amountInput = (field: 'required' | 'owned', label: string, value: string) => (
    <label className={styles.field} key={field}>
      <span>{label}</span>
      <input
        type="text" inputMode="numeric" pattern="[0-9]*"
        value={editing === field ? value : fmt(parseAmount(value))}
        onFocus={() => { setEditing(field); if (value === '0') (field === 'required' ? setRequired : setOwned)(''); }}
        onBlur={() => { setEditing(null); (field === 'required' ? setRequired : setOwned)(String(parseAmount(value))); }}
        onChange={event => changeValue(field, event.target.value)}
      />
    </label>
  );

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1>데카 판매 계산기</h1>
        <p>부족한 데카를 채우기 위해 아이템을 몇 개 판매해야 하는지 계산합니다.</p>
      </header>

      <section className={styles.panel}>
        <div className={styles.fields}>
          {amountInput('required', '필요 데카', required)}
          {amountInput('owned', '보유 데카', owned)}
        </div>
        <div className={styles.shortage}>
          <span>부족한 데카</span>
          <strong>{fmt(shortage)} <small>데카</small></strong>
          <p>거래소 판매 수수료 15% 차감 후의 실수령액으로 판매 개수를 계산합니다.</p>
        </div>
        <div className={styles.marketBar}>
          <div>
            <b>모비라이프 거래소</b>
            <span role="status">
              {loading ? '최저가 조회 중…' : error ? '조회 실패 · ' + error :
                '최저가 ' + items.length + '/' + ITEMS.length + '종 조회' +
                (updatedAt ? ' · ' + new Date(updatedAt).toLocaleString('ko-KR') : '')}
            </span>
          </div>
          <button type="button" disabled={loading} onClick={() => void loadMarket(true)}>{loading ? '조회 중…' : '시세 새로고침'}</button>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>아이템별 필요 판매 개수</h2>
        <div className={styles.cards}>
          {ITEMS.map((name: ItemName) => {
            const quote = items.find(item => item.name.replace(/\s+/g, ' ').trim() === name);
            const cashPrice = CASH_PRICE[name];
            const price = quote ? Number(quote.min_price) : null;
            // Conservatively round down each item's expected net proceeds to an integer.
            const net = price == null ? null : Math.floor(price * (1 - FEE_RATE));
            const fee = price == null || net == null ? null : price - net;
            const count = shortage === 0 ? 0 : net == null || net <= 0 ? null : Math.ceil(shortage / net);
            const total = count == null || net == null ? null : count * net;
            const label = (value: number | null) => value == null ? loading ? '조회 중…' : '조회 실패' : fmt(value) + ' 데카';
            return (
              <article key={name} className={styles.card}>
                <div className={styles.cardTop}>
                  <b>{name}</b>
                  <span>최저가 {label(price)}</span>
                </div>
                <div className={styles.metrics}>
                  <div><span>아이템 구매가</span><b>{fmt(cashPrice.cash)}캐시 · {fmt(cashPrice.won)}원</b></div>
                  <div><span>판매 수수료 (15%)</span><b>{label(fee)}</b></div>
                  <div><span>1개 실수령액</span><b>{label(net)}</b></div>
                </div>
                <div className={styles.answer}>
                  <span>필요 판매 수량</span>
                  <strong className={count == null ? styles.failed : ''}>{count == null ? loading ? '조회 중…' : '조회 실패' : fmt(count) + '개'}</strong>
                  {total != null && <small>{fmt(total)}데카 수령 · {fmt(Math.max(0, total - shortage))}데카 초과</small>}
                  {count != null && <div className={styles.cashTotal}>
                    <span>필요 현금 비용</span>
                    <b>{fmt(count * cashPrice.won)}원</b>
                    <small>{fmt(count * cashPrice.cash)}캐시 · 1,000데카당 약 {net != null && net > 0 ? fmt(Math.round(cashPrice.won * 1000 / net)) + '원' : '계산 불가'}</small>
                  </div>}
                </div>
              </article>
            );
          })}
        </div>
        <p className={styles.note}>거래소 최저가 기준 추정치입니다. 수수료 15% 차감 뒤 아이템당 실수령액을 정수 데카로 내림해 계산합니다. 현금 비용은 상자 1개당 6,000원(600캐시), 세공기 1개당 1,000원(100캐시)으로 계산합니다. 실제 판매 가격과 정산 방식에 따라 결과가 달라질 수 있으며, 시세가 없으면 가격을 임의로 채우지 않습니다.</p>
      </section>
    </main>
  );
}
