'use client';

import MaterialWithLocation from '../MaterialWithLocation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { JOB_GROUPS } from '../simulator/marketData';
import { useSharedOwnedMaterials, type SharedMaterialName } from '../sharedOwnedMaterials';
import styles from './drakein.module.css';

type Material = SharedMaterialName | '마력 깃든 용비늘';
type Recipe = Partial<Record<Material, number>>;
type MarketItem = { name: string; min_price: number; total_count: number };
type MarketPayload = { ok: boolean; items?: MarketItem[]; last_updated_at?: string | null; error?: string };

const COMMON: Recipe = {
  '마력 깃든 용비늘': 3,
  '포식의 마력석': 50,
  '망령의 영혼석': 250,
  '원념의 영혼석': 250,
};
const EXTRAS: Record<string, Recipe> = {
  'A': { '백금강괴': 30, '특급 목재': 30, '허상의 마력석': 50, '야생의 영혼석': 1500, '파동의 영혼석': 1500 },
  'B': { '특급 목재': 30, '특급 가죽': 30, '허상의 마력석': 50, '삼림의 영혼석': 1500, '공명의 영혼석': 1500 },
  'C': { '백금강괴': 30, '특급 가죽': 30, '허상의 마력석': 50, '삼림의 영혼석': 1500, '공명의 영혼석': 1500 },
  'D': { '백금강괴': 30, '특급 가죽': 30, '허상의 마력석': 50, '야생의 영혼석': 1500, '파동의 영혼석': 1500 },
  'E': { '특급 목재': 30, '백금강괴': 30, '허상의 마력석': 50, '삼림의 영혼석': 1500, '공명의 영혼석': 1500 },
  'F': { '특급 목재': 30, '특급 가죽': 30, '심해의 마력석': 50, '야생의 영혼석': 1500, '파동의 영혼석': 1500 },
  'G': { '특급 목재': 30, '백금강괴': 30, '심해의 마력석': 50, '삼림의 영혼석': 1500, '공명의 영혼석': 1500 },
  'H': { '백금강괴': 30, '특급 목재': 30, '심해의 마력석': 50, '야생의 영혼석': 1500, '파동의 영혼석': 1500 },
  'I': { '백금강괴': 30, '특급 가죽': 30, '심해의 마력석': 50, '야생의 영혼석': 1500, '파동의 영혼석': 1500 },
  'J': { '백금강괴': 30, '특급 가죽': 30, '심해의 마력석': 50, '삼림의 영혼석': 1500, '공명의 영혼석': 1500 },
};
const JOB_WEAPONS: { job: string; weapon: string; group: keyof typeof EXTRAS }[] = [
  { job: '전사', weapon: '소드', group: 'A' },
  { job: '대검전사', weapon: '그레이트소드', group: 'A' },
  { job: '검술사', weapon: '엣지소드', group: 'D' },
  { job: '기사', weapon: '핼버드', group: 'A' },
  { job: '궁수', weapon: '보우', group: 'B' },
  { job: '석궁사수', weapon: '크로스보우', group: 'E' },
  { job: '장궁병', weapon: '롱보우', group: 'B' },
  { job: '마법사', weapon: '완드', group: 'F' },
  { job: '화염술사', weapon: '케인', group: 'H' },
  { job: '빙결술사', weapon: '오브', group: 'H' },
  { job: '전격술사', weapon: '코일', group: 'I' },
  { job: '힐러', weapon: '힐링 완드', group: 'G' },
  { job: '사제', weapon: '스태프', group: 'G' },
  { job: '수도사', weapon: '쿼터스태프', group: 'G' },
  { job: '암흑술사', weapon: '의식용 단검', group: 'J' },
  { job: '음유시인', weapon: '류트', group: 'A' },
  { job: '댄서', weapon: '접부채', group: 'A' },
  { job: '악사', weapon: '하프', group: 'A' },
  { job: '도적', weapon: '대거', group: 'C' },
  { job: '격투가', weapon: '너클', group: 'C' },
  { job: '듀얼블레이드', weapon: '듀얼소드', group: 'C' },
];
const CHANGE_COST = 5000;
const DRAGON_OWNED_KEY = 'nn-drakein-dragon-scales-v1';
const TARGET_KEY = 'nn-drakein-target-job-v1';
const MATERIAL_FOLD_KEY = 'nn-drakein-materials-open-v1';
const fmt = (n: number) => n.toLocaleString('ko-KR');
const normalize = (v: string) => v.replace(/\s+/g, ' ').trim();

function fullRecipe(group: keyof typeof EXTRAS): Recipe {
  return { ...COMMON, ...EXTRAS[group] };
}

export default function DrakeinCalculator() {
  const { owned, setMaterial, loaded: ownedLoaded } = useSharedOwnedMaterials();
  const [job, setJob] = useState('화염술사');
  const [dragonOwned, setDragonOwned] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [materialDraft, setMaterialDraft] = useState<{ name: Material; text: string } | null>(null);
  const [materialsOpen, setMaterialsOpen] = useState(true);
  const [prices, setPrices] = useState<Partial<Record<Material, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const j = localStorage.getItem(TARGET_KEY);
      if (j && JOB_WEAPONS.some(w => w.job === j)) setJob(j);
      const value = localStorage.getItem(DRAGON_OWNED_KEY);
      if (value != null) setDragonOwned(Math.max(0, Math.floor(Number(value) || 0)));
      const fold = localStorage.getItem(MATERIAL_FOLD_KEY);
      if (fold !== null) setMaterialsOpen(fold === 'true');
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(TARGET_KEY, job);
      localStorage.setItem(DRAGON_OWNED_KEY, String(dragonOwned));
    } catch {}
  }, [job, dragonOwned, loaded]);

  const toggleMaterials = () => {
    setMaterialsOpen(current => {
      const next = !current;
      try { localStorage.setItem(MATERIAL_FOLD_KEY, String(next)); } catch {}
      return next;
    });
  };

  const loadMarket = useCallback(async (fresh = false) => {
    setLoading(true);
    setError('');
    setPrices({});
    try {
      const response = await fetch('/api/game/market' + (fresh ? '?fresh=1' : ''), { cache: 'no-store' });
      const payload = await response.json() as MarketPayload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || '시세 조회 실패');
      const found: Partial<Record<Material, number>> = {};
      const names = new Set<Material>([
        ...Object.keys(COMMON) as Material[],
        ...Object.values(EXTRAS).flatMap(recipe => Object.keys(recipe) as Material[]),
      ]);
      for (const item of payload.items ?? []) {
        const name = normalize(item.name) as Material;
        const price = Number(item.min_price);
        if (!names.has(name) || item.total_count <= 0 || !Number.isFinite(price) || price <= 0) continue;
        if (found[name] == null || price < found[name]) found[name] = price;
      }
      // Missing quotes are not replaced by estimates or manually entered unit prices.
      setPrices(found);
      setUpdatedAt(payload.last_updated_at ?? null);
      if (Object.keys(found).length === 0) throw new Error('드래케인 재료 시세를 찾지 못했습니다.');
    } catch (e) {
      setError(e instanceof Error ? e.message : '조회 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (loaded) void loadMarket(); }, [loaded, loadMarket]);

  const results = useMemo(() => JOB_WEAPONS.map(weapon => {
    const recipe = fullRecipe(weapon.group);
    const rows = (Object.entries(recipe) as [Material, number][]).map(([name, need]) => {
      const have = name === '마력 깃든 용비늘' ? dragonOwned : owned[name as SharedMaterialName];
      const shortage = Math.max(0, need - (have || 0));
      const quote = prices[name];
      return { name, need, have: have || 0, shortage, price: quote, cost: shortage === 0 ? 0 : quote == null ? null : shortage * quote };
    });
    const unknown = rows.filter(row => row.cost === null);
    const cost = unknown.length === 0 ? rows.reduce((sum, row) => sum + (row.cost ?? 0), 0) : null;
    const change = weapon.job === job ? 0 : CHANGE_COST;
    return { ...weapon, rows, unknown, cost, change, total: cost === null ? null : cost + change };
  }), [owned, dragonOwned, prices, job]);

  const selected = results.find(w => w.job === job)!;
  const ranked = results.filter(r => r.total !== null).sort((a, b) => (a.total ?? Infinity) - (b.total ?? Infinity));
  const cheapest = ranked[0];
  const missing = results.filter(r => r.total === null);
  const maxRows = expanded ? results : results.filter(r => r.job === job || r.group !== selected.group).filter((row, index, array) => array.findIndex(other => other.group === row.group) === index || row.job === job);
  const totalMaterialCount = new Set(results.flatMap(r => r.rows.map(row => row.name))).size;
  const pricedMaterialCount = new Set(results.flatMap(r => r.rows.map(row => row.name).filter(name => prices[name] != null))).size;

  const costLabel = (n: number | null) => n === null ? (loading ? '조회 중…' : '조회 실패') : fmt(n) + ' 데카';

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h1>드래케인 무기 제작 계산기</h1>
          <p>직접 제작과 다른 직군으로 제작한 뒤 변경하는 경로를 비교합니다.</p>
        </div>
        <a href="/game">← 장비 재료 계산기</a>
      </header>

      <section className={styles.panel}>
        <div className={styles.field}>
          <label htmlFor="drakein-job">최종적으로 사용할 직군</label>
          <select id="drakein-job" value={job} onChange={e => setJob(e.target.value)}>
            {JOB_GROUPS.map(group => (
              <optgroup label={group.label} key={group.label}>
                {group.jobs.map(name => <option value={name} key={name}>{name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <p className={styles.hint}>레시피는 이미 구매한 것으로 간주하여 비용에 포함하지 않습니다. 다른 직군 무기 제작 후 변경 시에만 <b>5,000데카</b>가 추가됩니다.</p>
        <div className={styles.market}>
          <div><b>모비라이프 거래소</b><span role="status">{loading ? '최저가 조회 중…' : error ? '조회 실패 · ' + error : '재료 ' + pricedMaterialCount + '/' + totalMaterialCount + '종 조회' + (updatedAt ? ' · ' + new Date(updatedAt).toLocaleString('ko-KR') : '')}</span></div>
          <button type="button" disabled={loading} onClick={() => void loadMarket(true)}>{loading ? '조회 중…' : '시세 새로고침'}</button>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionTitle}><h2>제작 경로 비교</h2><span>보유 재료 차감 · 직군 변경비 반영</span></div>
        <div className={styles.compare}>
          <article className={styles.compareBox}>
            <span>내 직군 직접 제작 · {selected.weapon}</span>
            <strong className={selected.total === null ? styles.failed : ''}>{costLabel(selected.total)}</strong>
            <small>직군 변경비 0데카</small>
          </article>
          <article className={styles.compareBox}>
            <span>가장 저렴한 다른 직군 제작 + 변경</span>
            {(() => {
              const alternative = ranked.find(r => r.job !== job);
              return <>
                <strong className={!alternative ? styles.failed : ''}>{alternative ? costLabel(alternative.total) : loading ? '조회 중…' : '조회 실패'}</strong>
                <small>{alternative ? alternative.job + ' · ' + alternative.weapon + ' · 변경비 5,000데카 포함' : '계산 가능한 다른 직군이 없습니다.'}</small>
              </>;
            })()}
          </article>
        </div>
        {cheapest && missing.length === 0 ? (
          <p className={styles.verdict}>최저 비용: <b>{cheapest.job} {cheapest.weapon}</b> {cheapest.job === job ? '직접 제작' : '제작 후 직군 변경'} · <b>{costLabel(cheapest.total)}</b>{selected.total !== null && cheapest.total !== null && selected.total > cheapest.total ? ' · 직접 제작 대비 ' + fmt(selected.total - cheapest.total) + ' 데카 절약' : ''}</p>
        ) : (
          <p className={styles.warning}>{loading ? '시세를 조회하고 있습니다.' : '일부 재료의 거래소 시세가 없어 모든 경로의 최저가를 확정할 수 없습니다. 조회 가능한 경로만 비교 표시합니다.'}</p>
        )}
      </section>

      <section className={styles.panel}>
        <div className={styles.foldTitle}>
          <div className={styles.sectionTitle}><h2>보유 재료</h2><span>기존 계산기·시뮬레이터의 보유량 공유</span></div>
          <button type="button" className={styles.foldButton} aria-expanded={materialsOpen} aria-controls="drakein-owned-materials" onClick={toggleMaterials}>{materialsOpen ? '접기 ▲' : '펼치기 ▼'}</button>
        </div>
        {materialsOpen && <div className={styles.inventory} id="drakein-owned-materials">
          {Array.from(new Set(results.flatMap(r => r.rows.map(row => row.name)))).map(name => {
            const value = name === '마력 깃든 용비늘' ? dragonOwned : owned[name as SharedMaterialName];
            return <label key={name} className={styles.material}>
              <MaterialWithLocation name={name} />
              <input type="number" min={0} inputMode="numeric"
                value={materialDraft?.name === name ? materialDraft.text : value}
                onFocus={() => setMaterialDraft({ name, text: value === 0 ? '' : String(value) })}
                onBlur={() => setMaterialDraft(null)}
                onChange={e => {
                  const text = e.target.value;
                  setMaterialDraft({ name, text });
                  const next = Math.max(0, Math.floor(Number(text) || 0));
                  if (name === '마력 깃든 용비늘') setDragonOwned(next);
                  else setMaterial(name as SharedMaterialName, next);
                }}
              />
            </label>;
          })}
        </div>}
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionTitle}><h2>직군별 제작비</h2><button type="button" className={styles.smallButton} onClick={() => setExpanded(v => !v)}>{expanded ? '간략히 보기' : '전체 직군 보기'}</button></div>
        <div className={styles.resultList}>
          {maxRows.slice().sort((a,b) => (a.total ?? Infinity) - (b.total ?? Infinity)).map(row => (
            <details className={styles.result} key={row.job}>
              <summary>
                <div><b>{row.job} <small>{row.weapon}</small></b><span>{row.job === job ? '직접 제작' : '제작 후 변경 +5,000데카'}</span></div>
                <strong className={row.total === null ? styles.failed : ''}>{costLabel(row.total)}</strong>
              </summary>
              <div className={styles.breakdown}>
                {row.rows.map(material => (
                  <div className={styles.breakdownRow} key={material.name}>
                    <MaterialWithLocation name={material.name} />
                    <span>필요 {fmt(material.need)} · 보유 {fmt(material.have)} · 부족 {fmt(material.shortage)}</span>
                    <b className={material.cost === null ? styles.failed : ''}>{costLabel(material.cost)}</b>
                  </div>
                ))}
                <p>직군 변경 비용: {fmt(row.change)} 데카</p>
              </div>
            </details>
          ))}
        </div>
        <p className={styles.hint}>비용은 부족한 재료 수량 × 거래소 최저가입니다. 시세가 없는 재료는 임의 가격으로 대체하지 않고 ‘조회 실패’로 표시합니다. 레시피 구매 비용(골드)은 제외합니다.</p>
      </section>
    </main>
  );
}
