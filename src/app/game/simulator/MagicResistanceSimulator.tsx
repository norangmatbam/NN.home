'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './simulator.module.css';

type SlotId =
  | 'weapon' | 'necklace' | 'ring1' | 'ring2' | 'emblem'
  | 'hat' | 'top' | 'bottom' | 'gloves' | 'shoes';

type Infusion = { janyeong: number; haeyeon: number };
type SimState = {
  target: number;
  excludeWeapon: boolean;
  slots: Record<SlotId, Infusion>;
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

const emptySlots = () =>
  Object.fromEntries(SLOTS.map(slot => [slot.id, { janyeong: 0, haeyeon: 0 }])) as Record<SlotId, Infusion>;

function defaultState(): SimState {
  return { target: 8222, excludeWeapon: false, slots: emptySlots() };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(Number(value) || 0)));
}

function fmt(value: number) {
  return Number(value || 0).toLocaleString('ko-KR');
}

/**
 * 일반 장비:
 * 잔영 1회 +140, 이후 +28, 잔영 11회에서 +420.
 * 해연 첫 적용은 +420 단계로 점프하고 이후 +14씩 20회 추가해 최대 +700.
 * 무기는 엠블럼 몫까지 담당해 위 수치가 2배.
 */
function infusionBonus(slot: SlotId, infusion: Infusion) {
  const weapon = slot === 'weapon';
  const x = weapon ? 2 : 1;
  const firstJ = 140 * x;
  const jStep = 28 * x;
  const threshold = 420 * x;
  const hStep = 14 * x;
  const max = 700 * x;

  const j = clamp(infusion.janyeong, 0, 11);
  const h = clamp(infusion.haeyeon, 0, 21);

  if (h === 0) {
    if (j === 0) return 0;
    return Math.min(threshold, firstJ + (j - 1) * jStep);
  }

  // 잔영 11회로 이미 420(무기 840)에 도달했다면 해연 1회부터 +14(+28).
  if (j >= 11) return Math.min(max, threshold + Math.min(h, 20) * hStep);

  // 그 전에 첫 해연을 쓰면 즉시 420(무기 840), 이후 해연부터 +14(+28).
  return Math.min(max, threshold + Math.max(0, Math.min(h - 1, 20)) * hStep);
}

function maxHaeyeon(infusion: Infusion) {
  return infusion.janyeong >= 11 ? 20 : 21;
}

type Step = {
  slot: SlotId;
  label: string;
  grade: '잔영' | '해연';
  delta: number;
  after: Infusion;
};

function nextSteps(slot: SlotId, infusion: Infusion): Step[] {
  if (slot === 'emblem') return [];
  const meta = SLOTS.find(x => x.id === slot)!;
  const before = infusionBonus(slot, infusion);
  const out: Step[] = [];

  // 해연을 한 번이라도 쓴 뒤에는 잔영 추가를 추천하지 않는다.
  if (infusion.haeyeon === 0 && infusion.janyeong < 11) {
    const after = { ...infusion, janyeong: infusion.janyeong + 1 };
    const delta = infusionBonus(slot, after) - before;
    if (delta > 0) out.push({ slot, label: meta.label, grade: '잔영', delta, after });
  }

  const hMax = maxHaeyeon(infusion);
  if (infusion.haeyeon < hMax) {
    const after = { ...infusion, haeyeon: infusion.haeyeon + 1 };
    const delta = infusionBonus(slot, after) - before;
    if (delta > 0) out.push({ slot, label: meta.label, grade: '해연', delta, after });
  }

  return out;
}

function buildEfficiencyPlan(state: SimState, current: number) {
  if (current >= state.target) return [] as Step[];

  const work: SimState = {
    ...state,
    slots: Object.fromEntries(
      Object.entries(state.slots).map(([key, value]) => [key, { ...value }])
    ) as Record<SlotId, Infusion>,
  };

  const chosen: Step[] = [];
  let resistance = current;

  for (let guard = 0; guard < 300 && resistance < state.target; guard++) {
    const candidates = SLOTS
      .filter(slot => slot.infusable && !(state.excludeWeapon && slot.weapon))
      .flatMap(slot => nextSteps(slot.id, work.slots[slot.id]))
      .sort((a, b) => b.delta - a.delta || (a.grade === '잔영' ? -1 : 1));

    const best = candidates[0];
    if (!best) break;

    work.slots[best.slot] = best.after;
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
      if (raw) {
        const saved = JSON.parse(raw) as Partial<SimState>;
        setState({
          ...defaultState(),
          ...saved,
          slots: { ...emptySlots(), ...(saved.slots || {}) },
        });
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state, loaded]);

  const current = useMemo(
    () => SLOTS.reduce((sum, slot) => sum + BASE_PER_SLOT + infusionBonus(slot.id, state.slots[slot.id]), 0),
    [state.slots],
  );

  const lack = Math.max(0, state.target - current);
  const plan = useMemo(() => buildEfficiencyPlan(state, current), [state, current]);
  const projected = current + plan.reduce((sum, step) => sum + step.delta, 0);

  const patchSlot = (slot: SlotId, patch: Partial<Infusion>) => {
    setState(currentState => {
      const now = currentState.slots[slot];
      const next = {
        janyeong: clamp(patch.janyeong ?? now.janyeong, 0, 11),
        haeyeon: clamp(patch.haeyeon ?? now.haeyeon, 0, 21),
      };
      next.haeyeon = Math.min(next.haeyeon, maxHaeyeon(next));
      return {
        ...currentState,
        slots: { ...currentState.slots, [slot]: next },
      };
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

  const progress = state.target > 0 ? Math.min(100, Math.round((current / state.target) * 100)) : 100;

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h1>마도저항 시뮬레이터</h1>
          <p>현재 주입 상태를 입력하고 목표 마도저항까지 필요한 상승량을 확인합니다.</p>
        </div>
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
        <div className={styles.progressTrack} aria-label="목표 마도저항 진행률">
          <i style={{ width: progress + '%' }} />
        </div>
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
          <small>체크하면 추천 경로에서만 무기를 제외합니다.</small>
        </label>
        <button type="button" className={styles.reset} onClick={() => setState(defaultState())}>초기화</button>
      </section>

      <div className={styles.sectionHead}>
        <h2>현재 장비</h2>
        <span>10성 룬 기준 기본 3,000부터 시작</span>
      </div>

      <section className={styles.grid}>
        {SLOTS.map(slot => {
          const infusion = state.slots[slot.id];
          const bonus = infusionBonus(slot.id, infusion);
          const total = BASE_PER_SLOT + bonus;
          const excluded = !!slot.weapon && state.excludeWeapon;

          return (
            <article className={styles.card + (excluded ? ' ' + styles.excluded : '')} key={slot.id}>
              <div className={styles.cardTop}>
                <div>
                  <strong>{slot.label}</strong>
                  {slot.weapon && <span className={styles.tag}>2배 적용</span>}
                  {!slot.infusable && <span className={styles.lockTag}>주입 불가</span>}
                  {excluded && <span className={styles.excludeTag}>추천 제외</span>}
                </div>
                <div className={styles.resistance}>
                  <b>{fmt(total)}</b>
                  <small>기본 300 {bonus > 0 ? '+ ' + fmt(bonus) : ''}</small>
                </div>
              </div>

              {slot.infusable ? (
                <div className={styles.controls}>
                  <div className={styles.controlRow}>
                    <span className={styles.janyeong}>잔영</span>
                    <button type="button" onClick={() => patchSlot(slot.id, { janyeong: infusion.janyeong - 1 })}>−</button>
                    <input
                      type="number"
                      min={0}
                      max={11}
                      value={infusion.janyeong}
                      onChange={e => patchSlot(slot.id, { janyeong: Number(e.target.value) })}
                    />
                    <button
                      type="button"
                      disabled={infusion.haeyeon > 0 || infusion.janyeong >= 11}
                      onClick={() => patchSlot(slot.id, { janyeong: infusion.janyeong + 1 })}
                    >+</button>
                    <small>/ 11</small>
                  </div>
                  <div className={styles.controlRow}>
                    <span className={styles.haeyeon}>해연</span>
                    <button type="button" onClick={() => patchSlot(slot.id, { haeyeon: infusion.haeyeon - 1 })}>−</button>
                    <input
                      type="number"
                      min={0}
                      max={maxHaeyeon(infusion)}
                      value={infusion.haeyeon}
                      onChange={e => patchSlot(slot.id, { haeyeon: Number(e.target.value) })}
                    />
                    <button
                      type="button"
                      disabled={infusion.haeyeon >= maxHaeyeon(infusion)}
                      onClick={() => patchSlot(slot.id, { haeyeon: infusion.haeyeon + 1 })}
                    >+</button>
                    <small>/ {maxHaeyeon(infusion)}</small>
                  </div>
                </div>
              ) : (
                <div className={styles.emblemInfo}>
                  엠블럼은 잔영·해연 주입 없이 10성 룬의 기본 마도저항 300만 적용됩니다.
                </div>
              )}
            </article>
          );
        })}
      </section>

      <div className={styles.sectionHead}>
        <h2>목표까지 추천</h2>
        <span>현재는 가격이 아닌 마도저항 상승 효율 기준</span>
      </div>

      <section className={styles.recommend}>
        {lack === 0 ? (
          <div className={styles.complete}>
            <b>목표 마도저항을 이미 달성했어요.</b>
            <span>현재 {fmt(current)} / 목표 {fmt(state.target)}</span>
          </div>
        ) : plan.length === 0 ? (
          <div className={styles.complete}>
            <b>현재 설정으로 더 올릴 수 있는 주입 단계가 없습니다.</b>
            <span>무기 제외 여부와 각 부위의 주입 상태를 확인해 주세요.</span>
          </div>
        ) : (
          <>
            <div className={styles.planSummary}>
              <div><span>필요 상승량</span><b>{fmt(lack)}</b></div>
              <div><span>추천 주입</span><b>{plan.length}회</b></div>
              <div><span>예상 도달</span><b>{fmt(projected)}</b></div>
            </div>
            <div className={styles.planList}>
              {plan.map((step, index) => (
                <div className={styles.planRow} key={step.slot + '-' + index}>
                  <span className={styles.planNo}>{index + 1}</span>
                  <b>{step.label}</b>
                  <span className={step.grade === '해연' ? styles.haeyeon : styles.janyeong}>{step.grade}</span>
                  <strong>+{fmt(step.delta)}</strong>
                </div>
              ))}
            </div>
            <p className={styles.note}>
              제작비·완제품 구매가가 연결되면 이 영역을 <b>최소 데카 기준 추천</b>으로 바꿀 예정입니다.
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
