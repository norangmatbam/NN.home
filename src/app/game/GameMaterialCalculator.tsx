'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './game.module.css';
import {
  emptySharedOwned,
  useSharedOwnedMaterials,
  type SharedMaterialName,
} from './sharedOwnedMaterials';

type Grade = '해연' | '잔영';
type Slot = '무기' | '모자' | '상의' | '장갑' | '하의' | '신발' | '목걸이' | '반지';
type ArmorSlot = '모자' | '상의' | '장갑' | '하의' | '신발';
type ArmorKind = '중갑' | '경갑' | '천옷';
type MaterialId = '허상' | '포식' | '심해' | '야생' | '삼림' | '공명' | '파동' | '망령' | '원념';
type Role = '마력석' | 'A' | 'B' | 'C';

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

function roleOf(id: MaterialId): Role {
  if (id === '허상' || id === '포식' || id === '심해') return '마력석';
  if (id === '망령' || id === '원념') return 'A';
  if (id === '야생' || id === '삼림') return 'B';
  return 'C';
}

const QTY: Record<'무기' | '방어구', Record<Grade, Record<Role, number>>> = {
  무기: {
    해연: { 마력석: 15, A: 80, B: 75, C: 90 },
    잔영: { 마력석: 0, A: 9, B: 15, C: 16 },
  },
  방어구: {
    해연: { 마력석: 8, A: 40, B: 35, C: 55 },
    잔영: { 마력석: 0, A: 5, B: 7, C: 12 },
  },
};

const JOB_GROUPS = [
  { label: '전사 계열', jobs: ['전사', '대검전사', '검술사', '기사'], 해연: ['포식', '망령', '야생', '파동'], 잔영: ['망령', '야생', '공명'] },
  { label: '궁수 계열', jobs: ['궁수', '석궁사수', '장궁병'], 해연: ['포식', '망령', '삼림', '공명'], 잔영: ['망령', '삼림', '파동'] },
  { label: '마법사 계열', jobs: ['마법사', '화염술사', '빙결술사', '전격술사'], 해연: ['심해', '망령', '야생', '파동'], 잔영: ['망령', '야생', '공명'] },
  { label: '힐러 계열', jobs: ['힐러', '사제', '수도사', '암흑술사'], 해연: ['심해', '망령', '삼림', '공명'], 잔영: ['망령', '삼림', '파동'] },
  { label: '음유시인 계열', jobs: ['음유시인', '댄서', '악사'], 해연: ['허상', '망령', '야생', '파동'], 잔영: ['망령', '야생', '공명'] },
  { label: '도적 계열', jobs: ['도적', '격투가', '듀얼블레이드'], 해연: ['허상', '망령', '삼림', '파동'], 잔영: ['망령', '삼림', '파동'] },
] as const;

const WEAPON: Record<string, Record<Grade, MaterialId[]>> = {};
for (const group of JOB_GROUPS) {
  for (const job of group.jobs) {
    WEAPON[job] = {
      해연: [...group.해연] as MaterialId[],
      잔영: [...group.잔영] as MaterialId[],
    };
  }
}

const ARMOR: Record<ArmorKind, Record<ArmorSlot, Record<Grade, MaterialId[]>>> = {
  중갑: {
    모자: { 해연: ['허상', '망령', '삼림', '파동'], 잔영: ['망령', '삼림', '파동'] },
    상의: { 해연: ['포식', '원념', '삼림', '파동'], 잔영: ['원념', '삼림', '파동'] },
    장갑: { 해연: ['허상', '망령', '야생', '삼림'], 잔영: ['망령', '야생', '삼림'] },
    하의: { 해연: ['심해', '원념', '삼림', '공명'], 잔영: ['원념', '삼림', '공명'] },
    신발: { 해연: ['허상', '망령', '야생', '삼림'], 잔영: ['망령', '야생', '삼림'] },
  },
  경갑: {
    모자: { 해연: ['허상', '망령', '삼림', '공명'], 잔영: ['망령', '삼림', '공명'] },
    상의: { 해연: ['포식', '원념', '삼림', '파동'], 잔영: ['원념', '삼림', '파동'] },
    장갑: { 해연: ['포식', '망령', '야생', '삼림'], 잔영: ['망령', '야생', '삼림'] },
    하의: { 해연: ['심해', '원념', '야생', '파동'], 잔영: ['원념', '야생', '파동'] },
    신발: { 해연: ['포식', '망령', '야생', '삼림'], 잔영: ['망령', '야생', '삼림'] },
  },
  천옷: {
    모자: { 해연: ['허상', '망령', '야생', '공명'], 잔영: ['망령', '야생', '공명'] },
    상의: { 해연: ['포식', '원념', '야생', '공명'], 잔영: ['원념', '야생', '공명'] },
    장갑: { 해연: ['심해', '망령', '야생', '삼림'], 잔영: ['망령', '야생', '삼림'] },
    하의: { 해연: ['심해', '원념', '삼림', '파동'], 잔영: ['원념', '삼림', '파동'] },
    신발: { 해연: ['심해', '망령', '야생', '삼림'], 잔영: ['망령', '야생', '삼림'] },
  },
};

const FIXED: Partial<Record<Slot, Record<Grade, Partial<MaterialMap>>>> = {
  목걸이: {
    해연: { 포식: 5, 심해: 5, 망령: 30, 원념: 30, 삼림: 50, 파동: 75 },
    잔영: { 망령: 4, 원념: 4, 삼림: 10, 파동: 14 },
  },
  반지: {
    해연: { 허상: 8, 원념: 55, 야생: 40, 공명: 60 },
    잔영: { 원념: 6, 야생: 8, 공명: 12 },
  },
};

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
  const fixed = FIXED[slot];
  if (fixed) return fixed[grade];

  const kind: '무기' | '방어구' = slot === '무기' ? '무기' : '방어구';
  const ids = slot === '무기'
    ? (WEAPON[profile.job] || WEAPON['마법사'])[grade]
    : ARMOR[profile.armor[slot as ArmorSlot]][slot as ArmorSlot][grade];

  const result: Partial<MaterialMap> = {};
  for (const id of ids) result[id] = QTY[kind][grade][roleOf(id)];
  return result;
}

function slotMaterials(slot: Slot, profile: Profile) {
  const total = blankMaterialMap();
  for (const grade of GRADES) {
    const count = clampCount(profile.plan[slot][grade]);
    const data = recipe(slot, grade, profile);
    for (const id of MATERIAL_IDS) total[id] += (data[id] || 0) * count;
  }
  return MATERIAL_IDS.filter(id => total[id] > 0).map(id => [id, total[id]] as const);
}

export default function GameMaterialCalculator() {
  const [state, setState] = useState<CalcState>(() => initialState());
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
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
      for (const [id, qty] of slotMaterials(slot, active)) total[id] += qty;
    }
    return total;
  }, [active]);

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
          <h1>장비 재료 계산기</h1>
          <div className={styles.steps}>
            <p>1. 제작할 장비에서 직업과 방어구 종류, 개수를 선택합니다.</p>
            <p>2. 모비라이프 거래소 최저가를 자동으로 조회합니다.</p>
            <p>3. 시뮬레이터와 공유되는 보유량을 입력합니다.</p>
            <p>4. 필요 데카를 확인합니다.</p>
          </div>
        </div>
        <div className={styles.total}>
          <div className={styles.totalLabel}>모자란 재료 구매 비용</div>
          <div className={styles.totalValue + (grand == null ? ' ' + styles.lookupFailed : '')}>
            {grand == null ? priceText(grand) : <>{fmt(grand)}<small>데카</small></>}
          </div>
        </div>
      </header>

      <div className={styles.marketBar}>
        <div className={styles.marketInfo} role="status" aria-live="polite">
          <b>모비라이프 거래소 시세</b>
          {marketLoading
            ? <span>거래소 최저가 조회 중…</span>
            : marketError
              ? <span className={styles.marketError}>조회 실패 · {marketError}</span>
              : <span>최저가 {marketMatchedCount}/{MATERIALS.length}종 조회{marketUpdatedAt ? ' · ' + marketTimeLabel(marketUpdatedAt) : ''}{marketMatchedCount < MATERIALS.length ? ' · 미조회 재료는 조회 실패 표시' : ''}</span>
          }
          <span>단가는 API 조회값만 사용합니다</span>
        </div>
        <button type="button" className={styles.marketRefresh} disabled={marketLoading} onClick={() => void loadMarket(true)}>
          {marketLoading ? '조회 중…' : '시세 새로고침'}
        </button>
      </div>

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

      <div className={styles.cols}>
        <section>
          <div className={styles.sectionHead}>
            <h2>제작할 장비</h2>
            <span>{SLOTS.reduce((sum, slot) => sum + active.plan[slot].해연 + active.plan[slot].잔영, 0)}개 제작</span>
          </div>

          <div className={styles.gear}>
            {SLOTS.map(slot => {
              const materials = slotMaterials(slot, active);
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

        <section className={styles.side}>
          <div className={styles.sectionHead}>
            <h2>재료 집계</h2>
            <span>보유 수량은 계산기·시뮬레이터 공용</span>
          </div>

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
                      value={sharedOwned[material.name]}
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
      </div>

      <div className={styles.floatNav} aria-label="페이지 위치 이동">
        <button type="button" onClick={() => jumpPage('top')} aria-label="맨 위로 이동">↑ 맨 위</button>
        <button type="button" onClick={() => jumpPage('bottom')} aria-label="맨 아래로 이동">↓ 맨 아래</button>
      </div>
    </div>
  );
}
