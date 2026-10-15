'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './simulator.module.css';
import {
  SHARED_MATERIAL_NAMES,
  useSharedOwnedMaterials,
  type SharedOwnedMaterials,
  type SharedMaterialName,
} from '../sharedOwnedMaterials';
import {
  ARMOR_KINDS,
  JOB_GROUPS,
  getEquipmentName,
  getRecipe,
  type ArmorKind,
  type Grade,
  type MaterialName,
  type SlotId,
} from './marketData';

type SlotState = { runeOn: boolean; bonus: number };
type SimState = {
  target: number;
  excludeWeapon: boolean;
  job: string;
  armorKind: ArmorKind;
  slots: Record<SlotId, SlotState>;
};

type Stage = {
  grade: '없음' | '잔영' | '해연';
  stack: number;
  maxStack: number;
  valid: boolean;
};

type MarketItem = {
  kind_id: number;
  name: string;
  parent_category: string;
  icon_url?: string | null;
  min_price: number;
  total_count: number;
};

type MarketPayload = {
  ok: boolean;
  last_updated_at?: string | null;
  items?: MarketItem[];
  error?: string;
};

type Acquisition = {
  slot: SlotId;
  grade: Grade;
  itemName: string;
  purchaseCost: number | null;
  craftCost: number | null;
  craftComplete: boolean;
  missingMaterials: MaterialName[];
  bestCost: number | null;
  method: '제작' | '구매' | null;
};

type PlanStep = {
  slot: SlotId;
  label: string;
  kind: '룬' | Grade;
  delta: number;
  cost: number;
  next: SlotState;
  acquisition?: Acquisition;
};

type PlanResult = {
  steps: PlanStep[];
  cost: number;
  gain: number;
} | null;

const BASE_PER_SLOT = 300;
const STORAGE_KEY = 'nn-game-resistance-sim-v1';
const FOLD_STORAGE_KEY = 'nn-game-simulator-folds-v1';

const SLOTS: { id: SlotId; label: string; infusable: boolean; weapon?: boolean }[] = [
  { id: 'weapon', label: '무기', infusable: true, weapon: true },
  { id: 'necklace', label: '목걸이', infusable: true },
  { id: 'ring1', label: '반지 1', infusable: true },
  { id: 'ring2', label: '반지 2', infusable: true },
  { id: 'emblem', label: '엠블럼', infusable: false },
  { id: 'hat', label: '모자', infusable: true },
  { id: 'top', label: '상의', infusable: true },
  { id: 'bottom', label: '하의', infusable: true },
  { id: 'gloves', label: '장갑', infusable: true },
  { id: 'shoes', label: '신발', infusable: true },
];

function blankSlots(): Record<SlotId, SlotState> {
  return Object.fromEntries(
    SLOTS.map(slot => [slot.id, { runeOn: true, bonus: 0 }])
  ) as Record<SlotId, SlotState>;
}

function defaultState(): SimState {
  return {
    target: 8222,
    excludeWeapon: true,
    job: '화염술사',
    armorKind: '천옷',
    slots: blankSlots(),
  };
}

function bonusDraftsFromState(state: SimState): Record<SlotId, string> {
  return Object.fromEntries(
    SLOTS.map(slot => [slot.id, String(state.slots[slot.id].bonus)])
  ) as Record<SlotId, string>;
}

function fmt(value: number) {
  return Number(value || 0).toLocaleString('ko-KR');
}

function scaleOf(slot: SlotId) {
  return slot === 'weapon' ? 2 : 1;
}

function maxBonus(slot: SlotId) {
  return 700 * scaleOf(slot);
}

function clampBonus(slot: SlotId, value: number) {
  return Math.max(0, Math.min(maxBonus(slot), Math.floor(Number(value) || 0)));
}

function stageFromBonus(slot: SlotId, bonus: number): Stage {
  const x = scaleOf(slot);
  const firstJ = 140 * x;
  const jStep = 28 * x;
  const threshold = 420 * x;
  const hStep = 14 * x;
  const max = 700 * x;
  const v = Math.floor(Number(bonus));

  if (!Number.isFinite(v) || v < 0 || v > max) {
    return { grade: v >= threshold ? '해연' : '잔영', stack: 0, maxStack: v >= threshold ? 20 : 10, valid: false };
  }

  if (v === 0) return { grade: '없음', stack: 0, maxStack: 0, valid: true };

  if (v < threshold) {
    const raw = (v - firstJ) / jStep;
    const valid = v >= firstJ && Number.isInteger(raw) && raw >= 0 && raw <= 9;
    return { grade: '잔영', stack: valid ? raw : 0, maxStack: 10, valid };
  }

  if (v <= max) {
    const raw = (v - threshold) / hStep;
    const valid = Number.isInteger(raw) && raw >= 0 && raw <= 20;
    return { grade: '해연', stack: valid ? raw : 0, maxStack: 20, valid };
  }

  return { grade: '해연', stack: 20, maxStack: 20, valid: false };
}

function legacyBonus(slot: SlotId, value: unknown) {
  if (!value || typeof value !== 'object') return 0;
  const data = value as { bonus?: number; janyeong?: number; haeyeon?: number };
  if (typeof data.bonus === 'number') return clampBonus(slot, data.bonus);

  const x = scaleOf(slot);
  const j = Math.max(0, Math.min(11, Math.floor(Number(data.janyeong) || 0)));
  const h = Math.max(0, Math.min(21, Math.floor(Number(data.haeyeon) || 0)));
  const threshold = 420 * x;

  if (h > 0) {
    if (j >= 11) return Math.min(700 * x, threshold + Math.min(h, 20) * 14 * x);
    return Math.min(700 * x, threshold + Math.max(0, Math.min(h - 1, 20)) * 14 * x);
  }
  if (j === 0) return 0;
  return Math.min(threshold, 140 * x + (j - 1) * 28 * x);
}

function hydrate(saved: Partial<SimState> & { slots?: Record<string, unknown> }): SimState {
  const base = defaultState();
  const slots = blankSlots();

  for (const slot of SLOTS) {
    const raw = saved.slots?.[slot.id] as ({ runeOn?: boolean; bonus?: number } | undefined);
    if (!raw) continue;
    slots[slot.id] = {
      runeOn: typeof raw.runeOn === 'boolean' ? raw.runeOn : true,
      bonus: legacyBonus(slot.id, raw),
    };
  }

  return {
    target: Math.max(0, Number(saved.target) || base.target),
    excludeWeapon: typeof saved.excludeWeapon === 'boolean' ? saved.excludeWeapon : base.excludeWeapon,
    job: typeof saved.job === 'string' && saved.job ? saved.job : base.job,
    armorKind: ARMOR_KINDS.includes(saved.armorKind as ArmorKind)
      ? saved.armorKind as ArmorKind
      : base.armorKind,
    slots,
  };
}

function totalResistance(state: SimState) {
  return SLOTS.reduce((sum, slot) => {
    const current = state.slots[slot.id];
    return sum + (current.runeOn ? BASE_PER_SLOT : 0) + clampBonus(slot.id, current.bonus);
  }, 0);
}

function normalized(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function marketPrice(items: MarketItem[], name: string) {
  const target = normalized(name);
  const exact = items.find(item => normalized(item.name) === target);
  return exact?.min_price ?? null;
}

function recipeCost(
  slot: SlotId,
  grade: Grade,
  state: SimState,
  items: MarketItem[],
) {
  const recipe = getRecipe(slot, grade, state.job, state.armorKind);
  if (!recipe) return {
    cost: null as number | null,
    complete: false,
    missing: [] as MaterialName[],
  };

  const missing: MaterialName[] = [];
  let cost = 0;

  for (const [name, qty] of Object.entries(recipe.materials) as [MaterialName, number][]) {
    const price = marketPrice(items, name);
    if (price == null) missing.push(name);
    else cost += price * qty;
  }

  return {
    cost: recipe.complete && missing.length === 0 ? cost : null,
    complete: recipe.complete,
    missing,
  };
}

function acquisitionFor(
  slot: SlotId,
  grade: Grade,
  state: SimState,
  items: MarketItem[],
): Acquisition {
  const itemName = getEquipmentName(slot, grade, state.job, state.armorKind);
  const purchaseCost = itemName ? marketPrice(items, itemName) : null;
  const craft = recipeCost(slot, grade, state, items);

  let bestCost: number | null = null;
  let method: '제작' | '구매' | null = null;

  if (craft.cost != null && purchaseCost != null) {
    if (craft.cost <= purchaseCost) {
      bestCost = craft.cost;
      method = '제작';
    } else {
      bestCost = purchaseCost;
      method = '구매';
    }
  } else if (craft.cost != null) {
    bestCost = craft.cost;
    method = '제작';
  } else if (purchaseCost != null) {
    bestCost = purchaseCost;
    method = '구매';
  }

  return {
    slot,
    grade,
    itemName,
    purchaseCost,
    craftCost: craft.cost,
    craftComplete: craft.complete,
    missingMaterials: craft.missing,
    bestCost,
    method,
  };
}

function infusionTransitions(
  slot: SlotId,
  current: SlotState,
  acquisition: Record<Grade, Acquisition>,
) {
  const label = SLOTS.find(item => item.id === slot)!.label;
  const x = scaleOf(slot);
  const firstJ = 140 * x;
  const jStep = 28 * x;
  const threshold = 420 * x;
  const hStep = 14 * x;
  const max = 700 * x;
  const bonus = clampBonus(slot, current.bonus);
  const stage = stageFromBonus(slot, bonus);
  const steps: PlanStep[] = [];

  if (!stage.valid) return steps;

  const add = (kind: Grade, nextBonus: number) => {
    const price = acquisition[kind];
    if (price.bestCost == null || nextBonus <= bonus) return;
    steps.push({
      slot,
      label,
      kind,
      delta: nextBonus - bonus,
      cost: price.bestCost,
      next: { ...current, bonus: nextBonus },
      acquisition: price,
    });
  };

  if (bonus === 0) {
    add('잔영', firstJ);
    add('해연', threshold);
    return steps;
  }

  if (bonus < threshold) {
    if (bonus + jStep <= threshold) add('잔영', bonus + jStep);
    add('해연', threshold);
    return steps;
  }

  if (bonus < max) add('해연', Math.min(max, bonus + hStep));
  return steps;
}

function slotOptions(
  slot: SlotId,
  current: SlotState,
  acquisition: Record<Grade, Acquisition>,
  excluded: boolean,
) {
  type Option = { gain: number; cost: number; steps: PlanStep[] };
  const results = new Map<number, Option>();
  results.set(0, { gain: 0, cost: 0, steps: [] });

  if (excluded) return Array.from(results.values());

  const runeVariants: { state: SlotState; gain: number; cost: number; steps: PlanStep[] }[] = [
    { state: current, gain: 0, cost: 0, steps: [] },
  ];

  if (!current.runeOn) {
    runeVariants.push({
      state: { ...current, runeOn: true },
      gain: BASE_PER_SLOT,
      cost: 0,
      steps: [{
        slot,
        label: SLOTS.find(item => item.id === slot)!.label,
        kind: '룬',
        delta: BASE_PER_SLOT,
        cost: 0,
        next: { ...current, runeOn: true },
      }],
    });
  }

  for (const runeVariant of runeVariants) {
    const best = new Map<number, { cost: number; steps: PlanStep[] }>();
    best.set(runeVariant.state.bonus, { cost: 0, steps: [] });
    const queue = [runeVariant.state.bonus];

    while (queue.length) {
      queue.sort((a, b) => (best.get(a)?.cost ?? Infinity) - (best.get(b)?.cost ?? Infinity));
      const bonus = queue.shift()!;
      const found = best.get(bonus)!;
      const stateAtBonus = { ...runeVariant.state, bonus };

      for (const step of infusionTransitions(slot, stateAtBonus, acquisition)) {
        const nextBonus = step.next.bonus;
        const nextCost = found.cost + step.cost;
        const previous = best.get(nextBonus);

        if (!previous || nextCost < previous.cost) {
          best.set(nextBonus, { cost: nextCost, steps: [...found.steps, step] });
          if (!queue.includes(nextBonus)) queue.push(nextBonus);
        }
      }
    }

    for (const [bonus, found] of best) {
      const gain = runeVariant.gain + (bonus - current.bonus);
      const cost = runeVariant.cost + found.cost;
      const option: Option = {
        gain,
        cost,
        steps: [...runeVariant.steps, ...found.steps],
      };
      const previous = results.get(gain);
      if (!previous || cost < previous.cost) results.set(gain, option);
    }
  }

  return Array.from(results.values());
}

function buildCostPlan(
  state: SimState,
  items: MarketItem[],
  current: number,
): PlanResult {
  const needed = Math.max(0, state.target - current);
  if (needed <= 0) return { steps: [], cost: 0, gain: 0 };

  type Node = { cost: number; steps: PlanStep[] };
  let dp = new Map<number, Node>([[0, { cost: 0, steps: [] }]]);

  for (const slot of SLOTS) {
    if (!slot.infusable && state.slots[slot.id].runeOn) continue;

    const acquisition = {
      잔영: acquisitionFor(slot.id, '잔영', state, items),
      해연: acquisitionFor(slot.id, '해연', state, items),
    };

    const options = slotOptions(
      slot.id,
      state.slots[slot.id],
      acquisition,
      !!slot.weapon && state.excludeWeapon,
    );

    const next = new Map<number, Node>();

    for (const [gain, node] of dp) {
      for (const option of options) {
        const totalGain = gain + option.gain;
        const totalCost = node.cost + option.cost;
        const previous = next.get(totalGain);
        if (!previous || totalCost < previous.cost) {
          next.set(totalGain, {
            cost: totalCost,
            steps: [...node.steps, ...option.steps],
          });
        }
      }
    }

    dp = next;
  }

  const candidates = Array.from(dp.entries())
    .filter(([gain]) => gain >= needed)
    .sort((a, b) => {
      const costDiff = a[1].cost - b[1].cost;
      if (costDiff !== 0) return costDiff;
      return a[0] - b[0];
    });

  const best = candidates[0];
  if (!best) return null;
  return { gain: best[0], cost: best[1].cost, steps: best[1].steps };
}

function timeLabel(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function applyOwnedInventory(
  plan: PlanResult,
  state: SimState,
  items: MarketItem[],
  owned: SharedOwnedMaterials,
): PlanResult {
  if (!plan) return null;

  const remaining = { ...owned };
  const steps = plan.steps.map(step => {
    if (step.kind === '룬') return step;

    const recipe = getRecipe(step.slot, step.kind, state.job, state.armorKind);
    const purchaseCost = step.acquisition?.purchaseCost ?? null;

    let craftCost: number | null = null;
    let canCraft = !!recipe?.complete;
    const materialUse: Partial<Record<SharedMaterialName, number>> = {};

    if (recipe?.complete) {
      let cost = 0;
      for (const [rawName, qty] of Object.entries(recipe.materials) as [MaterialName, number][]) {
        const name = rawName as SharedMaterialName;
        const price = marketPrice(items, rawName);
        if (price == null) {
          canCraft = false;
          break;
        }

        const have = remaining[name] ?? 0;
        const use = Math.min(have, qty);
        const buy = qty - use;
        materialUse[name] = use;
        cost += buy * price;
      }
      if (canCraft) craftCost = cost;
    }

    let method: '제작' | '구매' | null = null;
    let cost: number | null = null;

    if (craftCost != null && purchaseCost != null) {
      if (craftCost <= purchaseCost) {
        method = '제작';
        cost = craftCost;
      } else {
        method = '구매';
        cost = purchaseCost;
      }
    } else if (craftCost != null) {
      method = '제작';
      cost = craftCost;
    } else if (purchaseCost != null) {
      method = '구매';
      cost = purchaseCost;
    }

    if (method === '제작') {
      for (const [name, used] of Object.entries(materialUse) as [SharedMaterialName, number][]) {
        remaining[name] = Math.max(0, (remaining[name] ?? 0) - used);
      }
    }

    return {
      ...step,
      cost: cost ?? step.cost,
      acquisition: step.acquisition ? {
        ...step.acquisition,
        craftCost,
        bestCost: cost,
        method,
      } : step.acquisition,
    };
  });

  return {
    ...plan,
    steps,
    cost: steps.reduce((sum, step) => sum + step.cost, 0),
  };
}

export default function MagicResistanceSimulator() {
  const [state, setState] = useState<SimState>(() => defaultState());
  const [bonusDrafts, setBonusDrafts] = useState<Record<SlotId, string>>(
    () => bonusDraftsFromState(defaultState())
  );
  const [loaded, setLoaded] = useState(false);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [marketUpdatedAt, setMarketUpdatedAt] = useState<string | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketError, setMarketError] = useState('');
  const [editingSlot, setEditingSlot] = useState<SlotId | null>(null);
  const [folds, setFolds] = useState({ materials: true, equipment: true });
  const [focusedMaterial, setFocusedMaterial] = useState<SharedMaterialName | null>(null);
  const {
    owned: sharedOwned,
    setMaterial: setSharedMaterial,
  } = useSharedOwnedMaterials();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const next = hydrate(JSON.parse(raw));
        setState(next);
        setBonusDrafts(bonusDraftsFromState(next));
      }

    } catch {}

    // Restore the section layout separately so corrupt simulator data
    // does not prevent previously saved expand/collapse states from loading.
    try {
      const savedFolds = localStorage.getItem(FOLD_STORAGE_KEY);
      if (savedFolds) {
        const parsed: unknown = JSON.parse(savedFolds);
        if (parsed && typeof parsed === 'object') {
          const saved = parsed as Partial<typeof folds>;
          setFolds({
            materials: typeof saved.materials === 'boolean' ? saved.materials : true,
            equipment: typeof saved.equipment === 'boolean' ? saved.equipment : true,
          });
        }
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state, loaded]);

  // Persist only after the first localStorage read to avoid overwriting
  // a previously collapsed section with the initial defaults.
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(FOLD_STORAGE_KEY, JSON.stringify(folds)); } catch {}
  }, [folds, loaded]);

  const loadMarket = useCallback(async (fresh = false) => {
    setMarketLoading(true);
    setMarketError('');
    try {
      const response = await fetch('/api/game/market' + (fresh ? '?fresh=1' : ''), {
        cache: 'no-store',
      });
      const payload = await response.json() as MarketPayload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || '시세 조회 실패');
      setMarketItems(payload.items ?? []);
      setMarketUpdatedAt(payload.last_updated_at ?? null);
    } catch (error) {
      setMarketError(error instanceof Error ? error.message : '거래소 시세를 불러오지 못했습니다.');
    } finally {
      setMarketLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMarket(false);
  }, [loadMarket]);

  const current = useMemo(() => totalResistance(state), [state]);
  const lack = Math.max(0, state.target - current);
  const basePricePlan = useMemo(
    () => marketItems.length ? buildCostPlan(state, marketItems, current) : null,
    [state, marketItems, current],
  );
  const pricePlan = useMemo(
    () => applyOwnedInventory(basePricePlan, state, marketItems, sharedOwned),
    [basePricePlan, state, marketItems, sharedOwned],
  );
  const projected = pricePlan ? current + pricePlan.gain : current;
  const progress = state.target > 0 ? Math.min(100, Math.round((current / state.target) * 100)) : 100;

  const planGroups = useMemo(() => {
    if (!pricePlan) return [];

    const groups = new Map<string, {
      slot: SlotId;
      label: string;
      kind: PlanStep['kind'];
      method: string;
      itemName: string;
      count: number;
      totalDelta: number;
      totalCost: number;
      unitCost: number;
      purchaseCost: number | null;
      craftCost: number | null;
      craftComplete: boolean;
    }>();

    for (const step of pricePlan.steps) {
      const method = step.kind === '룬' ? '장착' : (step.acquisition?.method ?? '확인 필요');
      const itemName = step.acquisition?.itemName ?? '10성 룬';
      const key = [step.slot, step.kind, method, step.cost].join('|');
      const group = groups.get(key) ?? {
        slot: step.slot,
        label: step.label,
        kind: step.kind,
        method,
        itemName,
        count: 0,
        totalDelta: 0,
        totalCost: 0,
        unitCost: step.cost,
        purchaseCost: step.acquisition?.purchaseCost ?? null,
        craftCost: step.acquisition?.craftCost ?? null,
        craftComplete: step.acquisition?.craftComplete ?? true,
      };
      group.count += 1;
      group.totalDelta += step.delta;
      group.totalCost += step.cost;
      groups.set(key, group);
    }

    return Array.from(groups.values());
  }, [pricePlan]);

  const planGradeTotals = useMemo(() => {
    const out = { 해연: 0, 잔영: 0, 룬: 0 };
    for (const step of pricePlan?.steps ?? []) out[step.kind] += 1;
    return out;
  }, [pricePlan]);

  const patchSlot = (slot: SlotId, patch: Partial<SlotState>) => {
    setState(currentState => ({
      ...currentState,
      slots: {
        ...currentState.slots,
        [slot]: {
          ...currentState.slots[slot],
          ...patch,
          ...(patch.bonus != null ? { bonus: clampBonus(slot, patch.bonus) } : {}),
        },
      },
    }));
  };

  const commitBonusDraft = (slot: SlotId) => {
    const raw = bonusDrafts[slot].trim();
    setEditingSlot(null);

    if (raw === '') {
      setBonusDrafts(drafts => ({ ...drafts, [slot]: String(state.slots[slot].bonus) }));
      return;
    }

    const parsed = Number(raw);
    const parsedStage = stageFromBonus(slot, parsed);

    if (!Number.isFinite(parsed) || !parsedStage.valid) {
      // 잘못된 값을 0이나 최대치로 강제 보정하지 않는다.
      // 입력값을 그대로 남겨 사용자가 이어서 수정할 수 있게 한다.
      return;
    }

    patchSlot(slot, { bonus: parsed });
    setBonusDrafts(drafts => ({ ...drafts, [slot]: String(parsed) }));
  };

  const resetSimulator = () => {
    const next = defaultState();
    setState(next);
    setBonusDrafts(bonusDraftsFromState(next));
    setEditingSlot(null);
  };

  const toggleFold = (key: 'materials' | 'equipment') => {
    setFolds(currentFolds => ({ ...currentFolds, [key]: !currentFolds[key] }));
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
        <h1>마도저항 시뮬레이터</h1>
        <p>현재 상태와 목표를 입력하면 거래소 시세 기준으로 제작·구매 비용을 비교해 가장 저렴한 경로를 계산합니다.</p>
      </header>

      <section className={styles.summary}>
        <div className={styles.summaryTop}>
          <div className={styles.stat}>
            <span>현재 마도저항</span>
            <strong>{fmt(current)}</strong>
          </div>
          <label className={styles.targetBox}>
            <span>목표 마도저항</span>
            <input
              type="number"
              min={0}
              value={state.target}
              onChange={e => setState(s => ({ ...s, target: Math.max(0, Number(e.target.value) || 0) }))}
            />
          </label>
          <div className={styles.stat}>
            <span>{lack > 0 ? '부족' : '목표 달성'}</span>
            <strong className={lack > 0 ? styles.danger : styles.ok}>{lack > 0 ? fmt(lack) : '완료'}</strong>
          </div>
        </div>
        <div className={styles.progressTrack}><i style={{ width: progress + '%' }} /></div>
        <div className={styles.progressText}>{progress}%</div>
      </section>

      <section className={styles.options}>
        <label className={styles.jobPick}>
          <span>직업</span>
          <select
            value={state.job}
            onChange={e => setState(s => ({ ...s, job: e.target.value }))}
          >
            {JOB_GROUPS.map(group => (
              <optgroup label={group.label} key={group.label}>
                {group.jobs.map(job => <option value={job} key={job}>{job}</option>)}
              </optgroup>
            ))}
          </select>
        </label>

        <div className={styles.armorPick}>
          <span>방어구 재질</span>
          <div>
            {ARMOR_KINDS.map(kind => (
              <button
                type="button"
                key={kind}
                className={state.armorKind === kind ? styles.armorOn : ''}
                onClick={() => setState(s => ({ ...s, armorKind: kind }))}
              >{kind}</button>
            ))}
          </div>
        </div>

        <div className={styles.optionBottom}>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={state.excludeWeapon}
              onChange={e => setState(s => ({ ...s, excludeWeapon: e.target.checked }))}
            />
            <span>무기 강화 제외</span>
            <small>현재 수치는 포함하고 추천 경로에서만 제외</small>
          </label>
          <button type="button" className={styles.reset} onClick={resetSimulator}>초기화</button>
        </div>

        <div className={styles.marketBar}>
          <div>
            <b>모비라이프 거래소</b>
            {marketLoading
              ? <span>시세 불러오는 중…</span>
              : marketError
                ? <span className={styles.marketError}>{marketError}</span>
                : <span>최저가 기준{marketUpdatedAt ? ' · ' + timeLabel(marketUpdatedAt) : ''}</span>
            }
          </div>
          <button type="button" disabled={marketLoading} onClick={() => void loadMarket(true)}>
            {marketLoading ? '조회 중' : '시세 새로고침'}
          </button>
        </div>
      </section>

      <details
        className={styles.fold}
        open={folds.materials}
      >
        <summary onClick={e => { e.preventDefault(); toggleFold('materials'); }}>
          <div>
            <h2>보유 재료</h2>
            <span>계산기와 공용 · 제작비 계산에 자동 반영</span>
          </div>
          <span className={styles.foldToggle}>{folds.materials ? '접기 ▲' : '펼치기 ▼'}</span>
        </summary>
        <div className={styles.materialGrid}>
          {SHARED_MATERIAL_NAMES.map(name => (
            <label className={styles.materialInput} key={name}>
              <span>{name}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={focusedMaterial === name && sharedOwned[name] === 0 ? '' : sharedOwned[name]}
                onFocus={() => setFocusedMaterial(name)}
                onBlur={() => setFocusedMaterial(null)}
                onChange={e => setSharedMaterial(name, Number(e.target.value))}
              />
            </label>
          ))}
        </div>
      </details>

      <details
        className={styles.fold}
        open={folds.equipment}
      >
        <summary onClick={e => { e.preventDefault(); toggleFold('equipment'); }}>
          <div>
            <h2>현재 장비</h2>
            <span>10성 룬은 기본 장착(+300) · 주입 상승분만 입력</span>
          </div>
          <span className={styles.foldToggle}>{folds.equipment ? '접기 ▲' : '펼치기 ▼'}</span>
        </summary>

        <section className={styles.grid}>
          {SLOTS.map(slot => {
          const slotState = state.slots[slot.id];
          const stage = stageFromBonus(slot.id, slotState.bonus);
          const draft = bonusDrafts[slot.id];
          const draftNumber = draft === '' ? null : Number(draft);
          const draftStage = draftNumber != null && Number.isFinite(draftNumber)
            ? stageFromBonus(slot.id, draftNumber)
            : null;
          const draftInvalid = draft !== '' && !draftStage?.valid;
          const visibleStage = draftStage?.valid ? draftStage : stage;
          const total = (slotState.runeOn ? BASE_PER_SLOT : 0) + slotState.bonus;
          const excluded = !!slot.weapon && state.excludeWeapon;

          return (
            <article className={styles.card + (excluded ? ' ' + styles.excluded : '')} key={slot.id}>
              <div className={styles.cardTop}>
                <div className={styles.cardTitle}>
                  <strong>{slot.label}</strong>
                  {slot.weapon && <span className={styles.tag}>주입 2배</span>}
                  {!slot.infusable && <span className={styles.lockTag}>주입 불가</span>}
                  {excluded && <span className={styles.excludeTag}>추천 제외</span>}
                </div>
                <div className={styles.resistance}>
                  <small>총 마도저항</small>
                  <b>{fmt(total)}</b>
                </div>
              </div>

              <div className={styles.cardBody}>
                <button
                  type="button"
                  className={styles.runeButton + (slotState.runeOn ? ' ' + styles.runeOn : '')}
                  onClick={() => patchSlot(slot.id, { runeOn: !slotState.runeOn })}
                >
                  <span>10성 룬</span>
                  <b>{slotState.runeOn ? '+300' : '미장착'}</b>
                </button>

                {slot.infusable ? (
                  <>
                    <label className={styles.bonusInput}>
                      <span>주입 마도저항</span>
                      <div>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={bonusDrafts[slot.id]}
                          onFocus={e => {
                            setEditingSlot(slot.id);
                            e.currentTarget.select();
                          }}
                          onChange={e => {
                            const next = e.target.value.replace(/[^0-9]/g, '');
                            setBonusDrafts(drafts => ({ ...drafts, [slot.id]: next }));
                          }}
                          onBlur={() => commitBonusDraft(slot.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                          }}
                        />
                        <small>/ {fmt(maxBonus(slot.id))}</small>
                      </div>
                    </label>

                    <div className={styles.stageBox + (draftInvalid && editingSlot !== slot.id ? ' ' + styles.invalid : '')}>
                      <span>자동 계산</span>
                      {draftInvalid && editingSlot === slot.id ? (
                        <b>입력 중…</b>
                      ) : draftInvalid ? (
                        <b>유효한 주입 수치를 확인해 주세요</b>
                      ) : visibleStage.grade === '없음' ? (
                        <b>주입 없음</b>
                      ) : (
                        <b>
                          <em className={visibleStage.grade === '해연' ? styles.haeyeon : styles.janyeong}>{visibleStage.grade}</em>
                          {' · 중첩 '}{visibleStage.stack} / {visibleStage.maxStack}
                        </b>
                      )}
                    </div>
                  </>
                ) : (
                  <div className={styles.emblemInfo}>
                    엠블럼은 잔영·해연 주입이 없고 10성 룬의 +300만 적용됩니다.
                  </div>
                )}
              </div>
            </article>
          );
          })}
        </section>
      </details>

      <div className={styles.sectionHead}>
        <h2>목표까지 추천</h2>
        <span>제작비와 완제품 최저가 중 더 싼 방법 기준</span>
      </div>

      <section className={styles.recommend}>
        {lack === 0 ? (
          <div className={styles.complete}>
            <b>목표 마도저항을 이미 달성했어요.</b>
            <span>현재 {fmt(current)} / 목표 {fmt(state.target)}</span>
          </div>
        ) : marketLoading ? (
          <div className={styles.complete}>
            <b>거래소 시세를 불러오는 중이에요.</b>
            <span>시세 조회가 끝나면 최소 비용 경로를 계산합니다.</span>
          </div>
        ) : marketError ? (
          <div className={styles.complete}>
            <b>거래소 시세를 사용할 수 없어요.</b>
            <span>{marketError}</span>
          </div>
        ) : !pricePlan ? (
          <div className={styles.complete}>
            <b>현재 시세로 목표까지 계산할 수 있는 경로가 없습니다.</b>
            <span>매물이 없는 장비가 있거나 유효하지 않은 주입 수치가 있는지 확인해 주세요.</span>
          </div>
        ) : (
          <>
            <div className={styles.costHero}>
              <span>목표 달성 예상 비용</span>
              <strong>{fmt(pricePlan.cost)}<small>데카</small></strong>
              <div>
                <span>현재 {fmt(current)}</span>
                <i>→</i>
                <span>주입 후 {fmt(projected)}</span>
                <b>+{fmt(pricePlan.gain)}</b>
              </div>
            </div>

            <div className={styles.planSummary}>
              <div><span>필요 상승량</span><b>{fmt(lack)}</b></div>
              <div><span>해연</span><b>{planGradeTotals.해연}개</b></div>
              <div><span>잔영</span><b>{planGradeTotals.잔영}개</b></div>
            </div>

            <div className={styles.planCards}>
              {planGroups.map((group, index) => (
                <article className={styles.planCard} key={[group.slot, group.kind, group.method, index].join('-')}>
                  <div className={styles.planCardTop}>
                    <div>
                      <b>{group.label} {group.kind === '룬' ? '10성 룬' : group.kind}</b>
                      <small>{group.itemName}</small>
                    </div>
                    <strong>{fmt(group.totalCost)}<small> 데카</small></strong>
                  </div>

                  <div className={styles.planMeta}>
                    <span className={group.method === '제작' ? styles.makeBadge : group.method === '구매' ? styles.buyBadge : styles.runeBadge}>
                      {group.method}
                    </span>
                    <b>{group.count}개</b>
                    <span>마도저항 +{fmt(group.totalDelta)}</span>
                  </div>

                  {group.kind !== '룬' && (
                    <div className={styles.compareRow}>
                      <span className={group.method === '제작' ? styles.chosenMethod : ''}>
                        제작 {group.craftCost != null ? fmt(group.craftCost) + ' /개' : group.craftComplete ? '시세 부족' : '잔영 재료 미완성'}
                      </span>
                      <span className={group.method === '구매' ? styles.chosenMethod : ''}>
                        구매 {group.purchaseCost != null ? fmt(group.purchaseCost) + ' /개' : '매물 없음'}
                      </span>
                    </div>
                  )}
                </article>
              ))}
            </div>

            <p className={styles.note}>
              해연 제작비는 보유 재료를 먼저 차감한 뒤 부족분만 거래소가로 계산합니다.
              여러 장비를 제작해도 같은 보유 재료를 중복 차감하지 않습니다.
              잔영은 추가 재료가 아직 비어 있어 제작비를 추천 판단에 사용하지 않고 완제품 거래소가를 사용합니다.
            </p>
          </>
        )}
      </section>

      <div className={styles.floatNav} aria-label="페이지 위치 이동">
        <button type="button" onClick={() => jumpPage('top')}>↑ 맨 위</button>
        <button type="button" onClick={() => jumpPage('bottom')}>↓ 맨 아래</button>
      </div>
    </div>
  );
}
