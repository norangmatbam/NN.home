'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './game.module.css';
import { getRecipe, JOB_GROUPS, type SlotId } from './simulator/marketData';
import {
  emptySharedOwned,
  useSharedOwnedMaterials,
  type SharedMaterialName,
} from './sharedOwnedMaterials';

type Grade = '해연' | '잔영';
type Slot = '무기' | '모자' | '상의' | '장갑' | '하의' | '신발' | '목걸이' | '반지';
type ArmorSlot = '모자' | '상의' | '장갑' | '하의' | '신발';
type ArmorKind = '중갑' | '경갑' | '천옷';
type MaterialId =
  | '허상' | '포식' | '심해' | '야생' | '삼림' | '공명' | '파동' | '망령' | '원념'
  | '백금강괴' | '특급 목재' | '특급 가죽' | '특급 옷감' | '특급 실크';

type MaterialMap = Record<MaterialId, number>;
type MarketItem = { name: string; min_price: number; total_count: number };
type MarketPayload = { ok: boolean; last_updated_at?: string | null; items?: MarketItem[]; error?: string };
type Plan = Record<Slot, Record<Grade, number>>;
type Profile = {
  id: string;
  name: string;
  job: string;
  armor: Record<ArmorSlot, ArmorKind>;
  plan: Plan;
  owned: MaterialMap;
};
type CalcState = { activeId: string; characters: Profile[] };

const MATERIALS: { id: MaterialId; name: SharedMaterialName; group: string; owned: number }[] = [
  { id: '백금강괴', name: '백금강괴', group: '제작', owned: 0 },
  { id: '특급 목재', name: '특급 목재', group: '제작', owned: 0 },
  { id: '특급 가죽', name: '특급 가죽', group: '제작', owned: 0 },
  { id: '특급 옷감', name: '특급 옷감', group: '제작', owned: 0 },
  { id: '특급 실크', name: '특급 실크', group: '제작', owned: 0 },
  { id: '허상', name: '허상의 마력석', group: '어비스', owned: 1 },
  { id: '포식', name: '포식의 마력석', group: '어비스', owned: 2 },
  { id: '심해', name: '심해의 마력석', group: '어비스', owned: 3 },
  { id: '야생', name: '야생의 영혼석', group: '피오드', owned: 26 },
  { id: '삼림', name: '삼림의 영혼석', group: '피오드', owned: 20 },
  { id: '공명', name: '공명의 영혼석', group: '룬디', owned: 53 },
  { id: '파동', name: '파동의 영혼석', group: '룬디', owned: 80 },
  { id: '망령', name: '망령의 영혼석', group: '페론', owned: 19 },
  { id: '원념', name: '원념의 영혼석', group: '페론', owned: 11 },
];

const MATERIAL_IDS = MATERIALS.map(m => m.id);
const SLOTS: Slot[] = ['무기', '모자', '상의', '장갑', '하의', '신발', '목걸이', '반지'];
const ARMOR_SLOTS: ArmorSlot[] = ['모자', '상의', '장갑', '하의', '신발'];
const ARMOR_KINDS: ArmorKind[] = ['중갑', '경갑', '천옷'];
const GRADES: Grade[] = ['해연', '잔영'];
const MAX_COUNT = 99;
const STORAGE_KEY = 'nn-game-material-calc-v1';
const FOLD_STORAGE_KEY = 'nn-game-calculator-folds-v1';

// Keep crafting counts in sync with the simulator's single recipe source.
const SLOT_IDS: Record<Slot, SlotId> = {
  무기: 'weapon',
  모자: 'hat',
  상의: 'top',
  장갑: 'gloves',
  하의: 'bottom',
  신발: 'shoes',
  목걸이: 'necklace',
  반지: 'ring1',
};
const MATERIAL_IDS_BY_NAME = Object.fromEntries(
  MATERIALS.map(material => [material.name, material.id])
) as Record<SharedMaterialName, MaterialId>;

function blankMaterialMap(): MaterialMap {
  return Object.fromEntries(MATERIAL_IDS.map(id => [id, 0])) as MaterialMap;
}
function blankPlan(): Plan {
  return Object.fromEntries(SLOTS.map(slot => [slot, { 해연: 0, 잔영: 0 }])) as Plan;
}
function blankArmor(): Record<ArmorSlot, ArmorKind> {
  return Object.fromEntries(ARMOR_SLOTS.map(slot => [slot, '천옷'])) as Record<ArmorSlot, ArmorKind>;
}
function defaultOwned(): MaterialMap {
  return Object.fromEntries(MATERIALS.map(m => [m.id, m.owned])) as MaterialMap;
}
function newProfile(name: string): Profile {
  return {
    id: 'c' + Date.now() + Math.random().toString(36).slice(2, 6),
    name,
    job: '마법사',
    armor: blankArmor(),
    plan: blankPlan(),
    owned: defaultOwned(),
  };
}
function initialState(): CalcState {
  const profile = newProfile('슬롯 1');
  for (const slot of SLOTS) profile.plan[slot].해연 = 1;
  return {
    activeId: profile.id,
    characters: [profile],
  };
}
function clampCount(value: number) {
  return Math.max(0, Math.min(MAX_COUNT, Math.floor(Number(value) || 0)));
}
function fmt(value: number) {
  return Number(value || 0).toLocaleString('ko-KR');
}
function marketTimeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ko-KR', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
function normalized(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function recipe(slot: Slot, grade: Grade, profile: Profile): Partial<MaterialMap> {
  const armorKind = ARMOR_SLOTS.includes(slot as ArmorSlot)
    ? profile.armor[slot as ArmorSlot]
    : '천옷';
  const result = getRecipe(SLOT_IDS[slot], grade, profile.job, armorKind);
  if (!result) return {};

  const materials: Partial<MaterialMap> = {};
  for (const [name, count] of Object.entries(result.materials) as [SharedMaterialName, number][]) {
    materials[MATERIAL_IDS_BY_NAME[name]] = count;
  }
  return materials;
}

function slotMaterials(
  slot: Slot,
  profile: Profile,
  prices: Partial<MaterialMap> = {},
) {
  const total = blankMaterialMap();
  for (const grade of GRADES) {
    const count = clampCount(profile.plan[slot][grade]);
    if (count === 0) continue;
    const selected = recipe(slot, grade, profile);
    const isArmor = ARMOR_SLOTS.includes(slot as ArmorSlot);
    // Only the last armor overlay needs the selected final material.
    // For intermediate overlays choose the cheapest known crafting recipe.
    let intermediate = selected;
    if (isArmor && count > 1) {
      const choices = ARMOR_KINDS.map(kind => {
        const candidate = recipe(slot, grade, {
          ...profile,
          armor: { ...profile.armor, [slot]: kind },
        });
        let cost = 0;
        for (const [id, qty] of Object.entries(candidate) as [MaterialId, number][]) {
          if (qty > 0 && prices[id] == null) return { candidate, cost: Infinity };
          cost += (prices[id] ?? 0) * qty;
        }
        return { candidate, cost };
      }).filter(choice => Number.isFinite(choice.cost)).sort((a, b) => a.cost - b.cost);
      if (choices[0]) intermediate = choices[0].candidate;
    }
    for (const id of MATERIAL_IDS) {
      total[id] += (selected[id] || 0) + (intermediate[id] || 0) * (count - 1);
    }
  }
  return MATERIAL_IDS.filter(id => total[id] > 0).map(id => [id, total[id]] as const);
}

export default function GameMaterialCalculator({ mode = 'M' }: { mode?: 'M' | 'D' }) {
  const [state, setState] = useState<CalcState>(() => initialState());
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [decaBudget, setDecaBudget] = useState(0);
  const [focusedMaterial, setFocusedMaterial] = useState<MaterialId | null>(null);
  const [folds, setFolds] = useState({ materials: true, equipment: true });
  const [marketPrices, setMarketPrices] = useState<Partial<MaterialMap>>({});
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketError, setMarketError] = useState('');
  const [marketUpdatedAt, setMarketUpdatedAt] = useState<string | null>(null);
  const [marketMatchedCount, setMarketMatchedCount] = useState(0);
  const {
    owned: sharedOwned,
    setMaterial: setSharedMaterial,
    replaceOwned: replaceSharedOwned,
    loaded: sharedOwnedLoaded,
  } = useSharedOwnedMaterials();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw) as CalcState);
    } catch {}

    try {
      const raw = localStorage.getItem(FOLD_STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const savedFolds = parsed as Partial<typeof folds>;
          setFolds({
            materials: typeof savedFolds.materials === 'boolean' ? savedFolds.materials : true,
            equipment: typeof savedFolds.equipment === 'boolean' ? savedFolds.equipment : true,
          });
        }
      }
    } catch {}
    try { setDecaBudget(Math.max(0, Math.floor(Number(localStorage.getItem('nn-game-simulator-deca-budget-v1')) || 0))); } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setSaved(true);
        window.setTimeout(() => setSaved(false), 900);
      } catch {}
    }, 250);
    return () => window.clearTimeout(timer);
  }, [state, loaded]);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(FOLD_STORAGE_KEY, JSON.stringify(folds)); } catch {}
  }, [folds, loaded]);

  useEffect(() => {
    if (!loaded || mode !== 'D') return;
    try { localStorage.setItem('nn-game-simulator-deca-budget-v1', String(decaBudget)); } catch {}
  }, [mode, decaBudget, loaded]);

  const toggleFold = (key: 'materials' | 'equipment') => {
    setFolds(current => ({ ...current, [key]: !current[key] }));
  };

  const active = state.characters.find(c => c.id === state.activeId) || state.characters[0];

  // Migrate legacy calculator inventory only when the shared inventory is absent.
  // Wait for the saved calculator to load so defaults never overwrite user data.
  useEffect(() => {
    if (!loaded || !sharedOwnedLoaded || !active) return;
    try {
      if (localStorage.getItem('nn-game-owned-materials-v1') !== null) return;
      const legacyRaw = localStorage.getItem(STORAGE_KEY);
      if (!legacyRaw) return;
      const legacyState = JSON.parse(legacyRaw) as Partial<CalcState>;
      const legacyProfile = legacyState.characters?.find(c => c.id === legacyState.activeId)
        ?? legacyState.characters?.[0];
      if (!legacyProfile?.owned) return;
      const migrated = emptySharedOwned();
      for (const material of MATERIALS) {
        migrated[material.name] = Math.max(0, legacyProfile.owned[material.id] || 0);
      }
      replaceSharedOwned(migrated);
    } catch {}
  }, [loaded, sharedOwnedLoaded, active, replaceSharedOwned]);

  // Use the same server-side market proxy as the simulator.
  const loadMarket = useCallback(async (fresh = false) => {
    setMarketLoading(true);
    setMarketPrices({});
    setMarketError('');
    try {
      const response = await fetch('/api/game/market' + (fresh ? '?fresh=1' : ''), {
        cache: 'no-store',
      });
      const payload = await response.json() as MarketPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || '거래소 시세를 불러오지 못했습니다.');
      }

      const byName = new Map<string, number>();
      for (const item of payload.items ?? []) {
        const price = Number(item.min_price);
        if (!Number.isFinite(price) || price <= 0 || item.total_count <= 0) continue;
        const key = normalized(item.name);
        const previous = byName.get(key);
        if (previous == null || price < previous) byName.set(key, price);
      }
      const updates: Partial<MaterialMap> = {};
      for (const material of MATERIALS) {
        const price = byName.get(normalized(material.name));
        if (price != null) updates[material.id] = price;
      }
      const matched = Object.keys(updates).length;
      if (matched === 0) throw new Error('재료 시세를 찾지 못했습니다.');

      // API quotes are the only prices used; missing items must stay unknown.
      setMarketPrices(updates);
      setMarketUpdatedAt(payload.last_updated_at ?? null);
      setMarketMatchedCount(matched);
    } catch (error) {
      setMarketError(error instanceof Error ? error.message : '거래소 시세 조회 실패');
    } finally {
      setMarketLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loaded) void loadMarket(false);
  }, [loaded, loadMarket]);

  const need = useMemo(() => {
    const total = blankMaterialMap();
    if (!active) return total;
    for (const slot of SLOTS) {
      for (const [id, qty] of slotMaterials(slot, active, marketPrices)) total[id] += qty;
    }
    return total;
  }, [active, marketPrices]);

  if (!active) return null;

  // Return null instead of understating the cost when a needed quote is missing.
  const totalCost = (materials: ReadonlyArray<readonly [MaterialId, number]>): number | null => {
    let total = 0;
    for (const [id, qty] of materials) {
      if (qty <= 0) continue;
      const unitPrice = marketPrices[id];
      if (unitPrice == null) return null;
      total += qty * unitPrice;
    }
    return total;
  };

  const priceText = (cost: number | null) =>
    cost == null ? (marketLoading ? '조회 중…' : '조회 실패') : fmt(cost);

  const grand = totalCost(MATERIALS.map(material => [
    material.id,
    Math.max(0, need[material.id] - sharedOwned[material.name]),
  ] as const));

  const updateActive = (change: (profile: Profile) => Profile) => {
    setState(current => ({
      ...current,
      characters: current.characters.map(profile =>
        profile.id === current.activeId ? change(profile) : profile
      ),
    }));
  };

  const setAllGrade = (grade: Grade | null) => {
    updateActive(profile => {
      const plan = blankPlan();
      if (grade) for (const slot of SLOTS) plan[slot][grade] = 1;
      return { ...profile, plan };
    });
  };

  const jumpPage = (where: 'top' | 'bottom') => {
    const scroller = document.getElementById('appMain');
    if (!scroller) return;
    scroller.scrollTo({
      top: where === 'top' ? 0 : scroller.scrollHeight,
      behavior: 'smooth',
    });
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <h1>장비 재료 계산기 {mode}</h1>
          <div className={styles.steps}>
            <p>1. 제작할 장비에서 직업과 방어구 종류, 개수를 선택합니다.</p>
            <p>2. 모비라이프 거래소 최저가를 자동으로 조회합니다.</p>
            <p>3. 시뮬레이터와 공유되는 보유량을 입력합니다.</p>
            <p>4. 필요 데카를 확인합니다.</p>
          </div>
        </div>
        <div className={styles.total}>
          <div className={styles.totalLabel}>모자란 재료 구매 비용</div>
          {mode === 'D' && <label style={{display:'grid',gap:4,margin:'8px 0',textAlign:'left',fontSize:12,color:'#4c5a78'}}>
            <span>사용 가능한 데카 (시뮬레이터 D와 동일 입력값)</span>
            <input type="number" min={0} value={decaBudget}
              onChange={e => setDecaBudget(Math.max(0,Math.floor(Number(e.target.value)||0)))}
              style={{height:38,border:'1px solid #d8e0ec',borderRadius:8,padding:'0 10px',background:'#fff',color:'#18203a'}} />
          </label>}
          <div className={styles.totalValue + (grand == null ? ' ' + styles.lookupFailed : '')}>
            {grand == null ? priceText(grand) : <>{fmt(grand)}<small>데카</small></>}
          </div>
          <div className={styles.marketBar}>
            <div className={styles.marketInfo} role="status" aria-live="polite">
              <b>모비라이프 거래소</b>
              {marketLoading
                ? <span>최저가 조회 중…</span>
                : marketError
                  ? <span className={styles.marketError}>조회 실패 · {marketError}</span>
                  : <span>최저가 {marketMatchedCount}/{MATERIALS.length}종{marketUpdatedAt ? ' · ' + marketTimeLabel(marketUpdatedAt) : ''}{marketMatchedCount < MATERIALS.length ? ' · 일부 조회 실패' : ''}</span>
              }
            </div>
            <button type="button" className={styles.marketRefresh} disabled={marketLoading} onClick={() => void loadMarket(true)}>
              {marketLoading ? '조회 중…' : '시세 새로고침'}
            </button>
          </div>
        </div>
      </header>
      {mode === 'D' && <div className={styles.marketBar} style={{margin:'0 0 16px',border:'1px solid #d8e0ec',borderRadius:10,padding:'10px 14px'}}>
        <div className={styles.marketInfo}>
          <b>현재 선택한 제작 계획의 예산 비교</b>
          <span>{grand == null ? '재료 시세 조회 실패' : decaBudget >= grand ? '예산 내 제작 가능 · 잔여 ' + fmt(decaBudget-grand) + ' 데카' : '예산보다 ' + fmt(grand-decaBudget) + ' 데카 부족'}</span>
        </div>
      </div>}

      <div className={styles.chars}>
        <span className={styles.charsLabel}>슬롯</span>
        {state.characters.map(profile =>
          profile.id === state.activeId ? (
            <span className={styles.chip + ' ' + styles.activeChip} key={profile.id}>
              <input
                className={styles.chipName}
                value={profile.name}
                maxLength={16}
                aria-label="슬롯 이름"
                onChange={e => updateActive(p => ({ ...p, name: e.target.value }))}
              />
              {state.characters.length > 1 && (
                <button
                  type="button"
                  className={styles.chipX}
                  onClick={() => setState(current => {
                    const characters = current.characters.filter(c => c.id !== profile.id);
                    return { ...current, characters, activeId: characters[0].id };
                  })}
                >×</button>
              )}
            </span>
          ) : (
            <button
              type="button"
              className={styles.chip}
              key={profile.id}
              onClick={() => setState(current => ({ ...current, activeId: profile.id }))}
            >{profile.name || '이름 없음'}</button>
          )
        )}
        {state.characters.length < 10 && (
          <button
            type="button"
            className={styles.chip + ' ' + styles.chipAdd}
            onClick={() => setState(current => {
              const profile = newProfile('슬롯 ' + (current.characters.length + 1));
              return {
                ...current,
                characters: [...current.characters, profile],
                activeId: profile.id,
              };
            })}
          >+ 슬롯 추가</button>
        )}
      </div>

      <div className={styles.bar}>
        <span className={styles.barLabel}>한 번에 넣기</span>
        <button type="button" className={styles.ghost} onClick={() => setAllGrade('해연')}>해연</button>
        <button type="button" className={styles.ghost} onClick={() => setAllGrade('잔영')}>잔영</button>
        <span className={styles.sep} />
        {ARMOR_KINDS.map(kind => (
          <button
            type="button"
            className={styles.ghost}
            key={kind}
            onClick={() => updateActive(profile => ({
              ...profile,
              armor: Object.fromEntries(ARMOR_SLOTS.map(slot => [slot, kind])) as Record<ArmorSlot, ArmorKind>,
            }))}
          >{kind}</button>
        ))}
        <span className={styles.spacer} />
        <span className={styles.saved + (saved ? ' ' + styles.savedOn : '')}>저장됨</span>
        <button type="button" className={styles.ghost + ' ' + styles.reset} onClick={() => setAllGrade(null)}>초기화</button>
      </div>

      <div className={styles.sections}>
        <details className={styles.fold} open={folds.materials}>
          <summary onClick={e => { e.preventDefault(); toggleFold('materials'); }}>
            <div>
              <h2>보유 재료</h2>
              <span>보유 수량은 계산기·시뮬레이터 공용 · 제작비 계산에 자동 반영</span>
            </div>
            <span className={styles.foldToggle}>{folds.materials ? '접기 ▲' : '펼치기 ▼'}</span>
          </summary>
          <section className={styles.side}>
          <div className={styles.ledger}>
            <div className={styles.ledgerHead}>
              <div>재료</div><div>거래소 데카</div><div>필요</div><div>보유</div><div>잔여</div><div>필요 데카</div>
            </div>

            {MATERIALS.map(material => {
              const rest = Math.max(0, need[material.id] - sharedOwned[material.name]);
              const unitPrice = marketPrices[material.id];
              const cost = totalCost([[material.id, rest]]);
              const dotClass = styles['dot' + material.group] || '';
              return (
                <div
                  className={styles.ledgerRow + (need[material.id] > 0 && rest === 0 ? ' ' + styles.done : '')}
                  key={material.id}
                >
                  <div className={styles.who}>
                    <i className={styles.dot + ' ' + dotClass} />
                    <span>{material.name}</span>
                  </div>
                  <div className={styles.mobileCell}>
                    <span>거래소 데카</span>
                    <b className={unitPrice == null ? styles.lookupFailed : ''}>{priceText(unitPrice ?? null)}</b>
                  </div>
                  <div className={styles.mobileCell}><span>필요</span><b>{fmt(need[material.id])}</b></div>
                  <label className={styles.mobileCell}>
                    <span>보유</span>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={focusedMaterial === material.id && sharedOwned[material.name] === 0 ? '' : sharedOwned[material.name]}
                      onFocus={() => setFocusedMaterial(material.id)}
                      onBlur={() => setFocusedMaterial(null)}
                      onChange={e => setSharedMaterial(material.name, Number(e.target.value))}
                    />
                  </label>
                  <div className={styles.mobileCell}><span>잔여</span><b>{fmt(rest)}</b></div>
                  <div className={styles.rowCost + (cost == null ? ' ' + styles.lookupFailed : '')}>{priceText(cost)}</div>
                </div>
              );
            })}

            <div className={styles.ledgerFoot}>
              <span>{active.name || '이름 없음'} 합계</span>
              <b className={grand == null ? styles.lookupFailed : ''}>{priceText(grand)}{grand == null ? '' : ' 데카'}</b>
            </div>
          </div>

          <p className={styles.note}><b>필요</b>는 선택한 장비의 재료를 모두 더한 값, <b>잔여</b>는 필요에서 보유를 뺀 값입니다.</p>
          <p className={styles.note}><b>필요 데카</b>는 잔여 수량 × 모비라이프 거래소 최저가입니다. 필요한 재료의 시세 조회에 실패하면 해당 비용과 합계에도 <b>조회 실패</b>를 표시합니다. 기존 입력 단가나 임의 가격으로 대신 계산하지 않습니다.</p>
          </section>
        </details>

        <details className={styles.fold} open={folds.equipment}>
          <summary onClick={e => { e.preventDefault(); toggleFold('equipment'); }}>
            <div>
              <h2>제작할 장비</h2>
              <span>{SLOTS.reduce((sum, slot) => sum + active.plan[slot].해연 + active.plan[slot].잔영, 0)}개 제작</span>
            </div>
            <span className={styles.foldToggle}>{folds.equipment ? '접기 ▲' : '펼치기 ▼'}</span>
          </summary>
          <section>
          <div className={styles.gear}>
            {SLOTS.map(slot => {
              const materials = slotMaterials(slot, active, marketPrices);
              const selected = active.plan[slot].해연 + active.plan[slot].잔영;
              const sum = totalCost(materials);
              const isArmor = ARMOR_SLOTS.includes(slot as ArmorSlot);

              return (
                <article className={styles.card + ' ' + (selected ? styles.cardOn : styles.cardOff)} key={slot}>
                  <div className={styles.cardTop}>
                    <span className={styles.cardName}>{slot}</span>
                    <span className={styles.cardSum + (sum == null ? ' ' + styles.lookupFailed : '')}>{priceText(sum)}{sum == null ? '' : ' 데카'}</span>
                  </div>

                  {(slot === '무기' || isArmor) && (
                    <div className={styles.pick}>
                      <span className={styles.pickLabel}>{slot === '무기' ? '직업' : '종류'}</span>
                      <select
                        value={slot === '무기' ? active.job : active.armor[slot as ArmorSlot]}
                        onChange={e => updateActive(profile =>
                          slot === '무기'
                            ? { ...profile, job: e.target.value }
                            : { ...profile, armor: { ...profile.armor, [slot]: e.target.value as ArmorKind } }
                        )}
                      >
                        {slot === '무기'
                          ? JOB_GROUPS.map(group => (
                              <optgroup label={group.label} key={group.label}>
                                {group.jobs.map(job => <option value={job} key={job}>{job}</option>)}
                              </optgroup>
                            ))
                          : ARMOR_KINDS.map(kind => <option value={kind} key={kind}>{kind}</option>)
                        }
                      </select>
                    </div>
                  )}

                  <div className={styles.counts}>
                    {GRADES.map(grade => (
                      <div className={styles.count + (active.plan[slot][grade] === 0 ? ' ' + styles.zero : '')} key={grade}>
                        <span className={grade === '해연' ? styles.haeyeon : styles.janyeong}>{grade}</span>
                        <button
                          type="button"
                          className={styles.stepper}
                          onClick={() => updateActive(profile => ({
                            ...profile,
                            plan: {
                              ...profile.plan,
                              [slot]: {
                                ...profile.plan[slot],
                                [grade]: clampCount(profile.plan[slot][grade] - 1),
                              },
                            },
                          }))}
                        >−</button>
                        <input
                          type="number"
                          min={0}
                          max={MAX_COUNT}
                          value={active.plan[slot][grade]}
                          onChange={e => updateActive(profile => ({
                            ...profile,
                            plan: {
                              ...profile.plan,
                              [slot]: {
                                ...profile.plan[slot],
                                [grade]: clampCount(Number(e.target.value)),
                              },
                            },
                          }))}
                        />
                        <button
                          type="button"
                          className={styles.stepper}
                          onClick={() => updateActive(profile => ({
                            ...profile,
                            plan: {
                              ...profile.plan,
                              [slot]: {
                                ...profile.plan[slot],
                                [grade]: clampCount(profile.plan[slot][grade] + 1),
                              },
                            },
                          }))}
                        >+</button>
                      </div>
                    ))}
                  </div>

                  <div className={styles.mats}>
                    {materials.length === 0 ? (
                      <div className={styles.empty}>개수를 1 이상으로 올리면 재료가 표시됩니다</div>
                    ) : materials.map(([id, qty]) => {
                      const material = MATERIALS.find(m => m.id === id)!;
                      const dotClass = styles['dot' + material.group] || '';
                      return (
                        <div className={styles.mat} key={id}>
                          <div className={styles.matName}>
                            <i className={styles.dot + ' ' + dotClass} />
                            <b>{material.name}</b>
                          </div>
                          <div>{fmt(qty)}</div>
                          <div className={styles.gold + (marketPrices[id] == null ? ' ' + styles.lookupFailed : '')}>
                            {priceText(totalCost([[id, qty]]))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
          </section>
        </details>
      </div>

      <div className={styles.floatNav} aria-label="페이지 위치 이동">
        <button type="button" onClick={() => jumpPage('top')} aria-label="맨 위로 이동">↑ 맨 위</button>
        <button type="button" onClick={() => jumpPage('bottom')} aria-label="맨 아래로 이동">↓ 맨 아래</button>
      </div>
    </div>
  );
}
