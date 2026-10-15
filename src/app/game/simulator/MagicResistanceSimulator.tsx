'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './simulator.module.css';

type SlotId =
  | 'weapon' | 'necklace' | 'ring1' | 'ring2' | 'emblem'
  | 'hat' | 'top' | 'bottom' | 'gloves' | 'shoes';

type SlotState = { runeOn: boolean; bonus: number };
type SimState = {
  target: number;
  excludeWeapon: boolean;
  slots: Record<SlotId, SlotState>;
};

type Stage = {
  grade: '없음' | '잔영' | '해연';
  stack: number;
  maxStack: number;
  valid: boolean;
};

type Step = {
  slot: SlotId;
  label: string;
  kind: '룬' | '잔영' | '해연';
  delta: number;
  next: SlotState;
};

const BASE_PER_SLOT = 300;
const STORAGE_KEY = 'nn-game-resistance-sim-v1';

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
  return { target: 8222, excludeWeapon: false, slots: blankSlots() };
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
  const v = clampBonus(slot, bonus);

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
    excludeWeapon: !!saved.excludeWeapon,
    slots,
  };
}

function nextSteps(slot: SlotId, state: SlotState): Step[] {
  const meta = SLOTS.find(item => item.id === slot)!;
  const result: Step[] = [];

  if (!state.runeOn) {
    result.push({
      slot,
      label: meta.label,
      kind: '룬',
      delta: BASE_PER_SLOT,
      next: { ...state, runeOn: true },
    });
  }

  if (!meta.infusable) return result;

  const x = scaleOf(slot);
  const firstJ = 140 * x;
  const jStep = 28 * x;
  const threshold = 420 * x;
  const hStep = 14 * x;
  const max = 700 * x;
  const bonus = clampBonus(slot, state.bonus);
  const stage = stageFromBonus(slot, bonus);

  if (!stage.valid) return result;

  if (bonus === 0) {
    result.push({
      slot,
      label: meta.label,
      kind: '잔영',
      delta: firstJ,
      next: { ...state, bonus: firstJ },
    });
    result.push({
      slot,
      label: meta.label,
      kind: '해연',
      delta: threshold,
      next: { ...state, bonus: threshold },
    });
    return result;
  }

  if (bonus < threshold) {
    const nextJ = bonus + jStep;
    if (nextJ <= threshold) {
      result.push({
        slot,
        label: meta.label,
        kind: '잔영',
        delta: nextJ - bonus,
        next: { ...state, bonus: nextJ },
      });
    }
    result.push({
      slot,
      label: meta.label,
      kind: '해연',
      delta: threshold - bonus,
      next: { ...state, bonus: threshold },
    });
    return result;
  }

  if (bonus < max) {
    result.push({
      slot,
      label: meta.label,
      kind: '해연',
      delta: Math.min(hStep, max - bonus),
      next: { ...state, bonus: Math.min(max, bonus + hStep) },
    });
  }

  return result;
}

function totalResistance(state: SimState) {
  return SLOTS.reduce((sum, slot) => {
    const current = state.slots[slot.id];
    return sum + (current.runeOn ? BASE_PER_SLOT : 0) + clampBonus(slot.id, current.bonus);
  }, 0);
}

function buildEfficiencyPlan(state: SimState) {
  const work: SimState = {
    ...state,
    slots: Object.fromEntries(
      Object.entries(state.slots).map(([key, value]) => [key, { ...value }])
    ) as Record<SlotId, SlotState>,
  };

  const chosen: Step[] = [];
  let resistance = totalResistance(work);

  for (let guard = 0; guard < 300 && resistance < work.target; guard++) {
    const candidates = SLOTS
      .filter(slot => !(work.excludeWeapon && slot.weapon))
      .flatMap(slot => nextSteps(slot.id, work.slots[slot.id]))
      .sort((a, b) => b.delta - a.delta);

    const best = candidates[0];
    if (!best) break;

    work.slots[best.slot] = best.next;
    chosen.push(best);
    resistance += best.delta;
  }

  return chosen;
}

export default function MagicResistanceSimulator() {
  const [state, setState] = useState<SimState>(() => defaultState());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(hydrate(JSON.parse(raw)));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state, loaded]);

  const current = useMemo(() => totalResistance(state), [state]);
  const lack = Math.max(0, state.target - current);
  const plan = useMemo(() => buildEfficiencyPlan(state), [state]);
  const projected = current + plan.reduce((sum, step) => sum + step.delta, 0);
  const progress = state.target > 0 ? Math.min(100, Math.round((current / state.target) * 100)) : 100;

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
        <p>주입으로 오른 마도저항을 입력하면 잔영·해연 단계와 중첩을 자동으로 계산합니다.</p>
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

      <section className={styles.toolbar}>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={state.excludeWeapon}
            onChange={e => setState(s => ({ ...s, excludeWeapon: e.target.checked }))}
          />
          <span>무기 강화 제외</span>
          <small>현재 수치는 포함하고, 목표까지 추천할 때만 무기를 제외합니다.</small>
        </label>
        <button type="button" className={styles.reset} onClick={() => setState(defaultState())}>초기화</button>
      </section>

      <div className={styles.sectionHead}>
        <h2>현재 장비</h2>
        <span>10성 룬은 기본 장착(+300) · 주입 상승분만 입력</span>
      </div>

      <section className={styles.grid}>
        {SLOTS.map(slot => {
          const slotState = state.slots[slot.id];
          const stage = stageFromBonus(slot.id, slotState.bonus);
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
                          type="number"
                          min={0}
                          max={maxBonus(slot.id)}
                          value={slotState.bonus}
                          onChange={e => patchSlot(slot.id, { bonus: Number(e.target.value) })}
                        />
                        <small>/ {fmt(maxBonus(slot.id))}</small>
                      </div>
                    </label>

                    <div className={styles.stageBox + (!stage.valid ? ' ' + styles.invalid : '')}>
                      <span>자동 계산</span>
                      {stage.valid ? (
                        stage.grade === '없음' ? (
                          <b>주입 없음</b>
                        ) : (
                          <b>
                            <em className={stage.grade === '해연' ? styles.haeyeon : styles.janyeong}>{stage.grade}</em>
                            {' · 중첩 '}{stage.stack} / {stage.maxStack}
                          </b>
                        )
                      ) : (
                        <b>유효한 주입 수치가 아닙니다</b>
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

      <div className={styles.sectionHead}>
        <h2>목표까지 추천</h2>
        <span>현재는 가격 연결 전 — 마도저항 상승 효율 기준</span>
      </div>

      <section className={styles.recommend}>
        {lack === 0 ? (
          <div className={styles.complete}>
            <b>목표 마도저항을 이미 달성했어요.</b>
            <span>현재 {fmt(current)} / 목표 {fmt(state.target)}</span>
          </div>
        ) : plan.length === 0 ? (
          <div className={styles.complete}>
            <b>현재 입력값에서 추천 가능한 다음 단계가 없습니다.</b>
            <span>유효하지 않은 주입 수치가 있는지 확인해 주세요.</span>
          </div>
        ) : (
          <>
            <div className={styles.planSummary}>
              <div><span>필요 상승량</span><b>{fmt(lack)}</b></div>
              <div><span>추천 단계</span><b>{plan.length}회</b></div>
              <div><span>예상 도달</span><b>{fmt(projected)}</b></div>
            </div>
            <div className={styles.planList}>
              {plan.map((step, index) => (
                <div className={styles.planRow} key={step.slot + '-' + index}>
                  <span className={styles.planNo}>{index + 1}</span>
                  <b>{step.label}</b>
                  <span className={
                    step.kind === '해연' ? styles.haeyeon
                    : step.kind === '잔영' ? styles.janyeong
                    : styles.runeKind
                  }>{step.kind === '룬' ? '10성 룬' : step.kind}</span>
                  <strong>+{fmt(step.delta)}</strong>
                </div>
              ))}
            </div>
            <p className={styles.note}>
              제작비·완제품 구매가가 연결되면 이 추천을 <b>최소 데카 기준</b>으로 바꿉니다.
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
