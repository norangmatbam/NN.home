'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './runeword.module.css';

type Effect = { name: string; value: number };
export type RuneWord = { name: string; effects: Effect[]; runes: string[] };
type Season = 1 | 2;
type Category = '무기' | '방어구' | '클래스·장신구' | '엠블럼' | '분류 확인 필요';

const CATEGORY_ORDER: Category[] = ['무기', '방어구', '클래스·장신구', '엠블럼', '분류 확인 필요'];

// 확실히 확인한 룬만 분류합니다. 잘못된 슬롯으로 안내하는 것보다
// 미분류로 남기는 편이 정확합니다.
const EMBLEM = new Set((
  '아득한 빛,산맥 군주,흩날리는 검,대마법사,인도하는 빛,부서진 하늘,순수한 힘,' +
  '갈라진 땅,쌍둥이 별,압도적인 힘,고대 수호자,신전 기사,집정관,준비된 자,' +
  '바위 감시자,황혼,공포,태양,폭군,지휘관,불사,영웅,푸른 거목,다가오는 죽음,' +
  '무너진 경계,금 간 봉인,뼈 인장,첫 번째 서약,봉인술사,영원한 밤,위대함,' +
  '빛바랜 별,거대한 분노,잠들지 않는 불,가라앉은 왕국,해방,끓는 피'
).split(','));

// PDF는 룬워드 조합 자료이고 룬의 장착 부위 표가 아니므로,
// + 접미사의 장신구 룬과 확인된 일부 룬 외에는 미분류로 유지합니다.
function categoryOf(rune: string): Category {
  if (['무한','메아리치는 진노','만 갈래 물길','죽음','영웅','옛 마법사','서리바람+','망각+','검무+','파괴자+'].includes(rune)) return '무기';
  if (['무너진 경계','금 간 봉인','뼈 인장','첫 번째 서약','봉인술사','새벽별','고대 수호자','압도적인 힘','바위 감시자','준비된 자','집정관','신전 기사'].includes(rune)) return '방어구';
  if (rune.endsWith('+') && !['밤+','야수+','은둔자+','파멸+','근위병+','황폐+'].includes(rune)) return '클래스·장신구';
  if (['무너진 경계','금 간 봉인','뼈 인장','첫 번째 서약','봉인술사','고대 수호자','신전 기사','집정관','준비된 자','바위 감시자','압도적인 힘'].includes(rune)) return '방어구';
  if (EMBLEM.has(rune)) return '엠블럼';
  return '분류 확인 필요';
}

const WEIGHTS: Record<string, number> = {
  '치명타': .5 / 70,
  '추가타': .45 / 70,
  '강타 강화': .45 / 70,
  '연타 강화': .45 / 70,
  '스킬 위력': .45 / 70,
};
function estimate(word: RuneWord, baseAttack: number) {
  let factor = 1;
  const omitted: string[] = [];
  for (const effect of word.effects) {
    const rate = effect.name === '공격력'
      ? effect.value / (baseAttack + effect.value) / 100 * 100
      : WEIGHTS[effect.name] == null ? null : WEIGHTS[effect.name] * effect.value / 100;
    if (rate == null) { omitted.push(effect.name); continue; }
    factor *= (1 + rate);
  }
  return { percent: (factor - 1) * 100, omitted };
}
function signed(n: number) { return (n > 0 ? '+' : '') + n.toLocaleString('ko-KR'); }
function fmt(n: number) { return (n > 0 ? '+' : '') + n.toFixed(2) + '%'; }
const STORAGE = 'nn-game-runeword-ownership-v1';
const SELECTED_STORAGE = 'nn-game-runeword-selected-v1';

export default function RuneWordClient({ words }: { words: Record<Season, RuneWord[]> }) {
  const [season, setSeason] = useState<Season>(1);
  const [owned, setOwned] = useState<Record<Season, string[]>>({ 1: [], 2: [] });
  const [selected, setSelected] = useState<Record<Season, string[]>>({ 1: [], 2: [] });
  const [ready, setReady] = useState(false);
  const [filterAvailable, setFilterAvailable] = useState(false);
  const [search, setSearch] = useState('');
  const [runeSearch, setRuneSearch] = useState('');
  const [sort, setSort] = useState<'dps' | 'name' | 'missing'>('dps');
  const [baseAttack, setBaseAttack] = useState(26500);

  useEffect(() => {
    try {
      const a = JSON.parse(localStorage.getItem(STORAGE) || '{}');
      const b = JSON.parse(localStorage.getItem(SELECTED_STORAGE) || '{}');
      setOwned({ 1: Array.isArray(a[1]) ? a[1] : [], 2: Array.isArray(a[2]) ? a[2] : [] });
      setSelected({ 1: Array.isArray(b[1]) ? b[1] : [], 2: Array.isArray(b[2]) ? b[2] : [] });
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE, JSON.stringify(owned)); }, [owned, ready]);
  useEffect(() => { if (ready) localStorage.setItem(SELECTED_STORAGE, JSON.stringify(selected)); }, [selected, ready]);

  const currentWords = words[season];
  const currentOwned = useMemo(() => new Set(owned[season]), [owned, season]);
  const currentSelected = useMemo(() => new Set(selected[season]), [selected, season]);
  const runes = useMemo(() => [...new Set(currentWords.flatMap(w => w.runes))].sort((a, b) => a.localeCompare(b, 'ko')), [currentWords]);
  const categorized = useMemo(() => CATEGORY_ORDER.map(category => ({
    category, runes: runes.filter(r => categoryOf(r) === category && r.includes(runeSearch.trim())),
  })), [runes, runeSearch]);

  const items = useMemo(() => currentWords
    .map(word => ({
      ...word,
      ...estimate(word, baseAttack),
      missing: word.runes.filter(r => !currentOwned.has(r)),
    }))
    .filter(word => (!filterAvailable || word.missing.length === 0) &&
      [word.name, ...word.runes, ...word.effects.map(e => e.name)].join(' ').toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'ko');
      if (sort === 'missing') return a.missing.length - b.missing.length || b.percent - a.percent;
      return b.percent - a.percent || a.name.localeCompare(b.name, 'ko');
    }), [currentWords, baseAttack, currentOwned, filterAvailable, search, sort]);

  const selectedWords = currentWords.filter(w => currentSelected.has(w.name));
  const totalEffect = useMemo(() => {
    const totals = new Map<string, number>();
    for (const w of selectedWords) for (const e of w.effects) totals.set(e.name, (totals.get(e.name) || 0) + e.value);
    return [...totals.entries()];
  }, [selectedWords]);
  const combined = (selectedWords.reduce((factor, w) => factor * (1 + estimate(w, baseAttack).percent / 100), 1) - 1) * 100;

  const toggleRune = (name: string) => setOwned(prev => ({
    ...prev, [season]: prev[season].includes(name)
      ? prev[season].filter(v => v !== name)
      : [...prev[season], name],
  }));
  const toggleWord = (name: string) => setSelected(prev => ({
    ...prev, [season]: prev[season].includes(name)
      ? prev[season].filter(v => v !== name)
      : prev[season].length >= 5 ? prev[season] : [...prev[season], name],
  }));

  const availableCount = currentWords.filter(w => w.runes.every(r => currentOwned.has(r))).length;

  return <main className={styles.wrap}>
    <header className={styles.header}>
      <h1>룬워드 리스트</h1>
      <p>시즌별 룬워드 비교 · 보유 룬 체크 · 사용 가능한 조합 찾기</p>
    </header>
    <div className={styles.tabs} role="tablist" aria-label="룬워드 시즌">
      {([1, 2] as const).map(n => <button key={n} role="tab" aria-selected={season === n}
        className={season === n ? styles.active : ''} onClick={() => { setSeason(n); setSearch(''); setRuneSearch(''); }}>
        시즌 {n} <small>{words[n].length}개</small>
      </button>)}
    </div>

    <section className={styles.panel}>
      <div className={styles.sectionTitle}>
        <h2>보유 룬 체크</h2>
        <span>{currentOwned.size} / {runes.length}개 획득</span>
      </div>
      <p className={styles.sub}>획득한 룬을 체크하세요. 시즌별 체크 상태는 이 브라우저에 저장됩니다.</p>
      <input className={styles.input} aria-label="보유 룬 검색" placeholder="룬 이름 검색" value={runeSearch} onChange={e => setRuneSearch(e.target.value)} />
      <div className={styles.folds}>
        {categorized.map(group => <details className={styles.fold} key={group.category}>
          <summary><b>{group.category}</b><span>{group.runes.filter(r => currentOwned.has(r)).length} / {group.runes.length}개 <strong>⌄</strong></span></summary>
          <div className={styles.runes}>
            {group.runes.length ? group.runes.map(r => <label key={r} className={currentOwned.has(r) ? styles.runeChecked : styles.rune}>
              <input type="checkbox" checked={currentOwned.has(r)} onChange={() => toggleRune(r)} />{r}
            </label>) : <span className={styles.sub}>표시할 룬이 없어요.</span>}
          </div>
        </details>)}
      </div>
      <p className={styles.warning}>룬워드 PDF에는 룬별 장착 부위 정보가 없어, 확정할 수 없는 룬은 ‘분류 확인 필요’에 표시했어요. 해당 룬도 정상적으로 체크하고 필터링할 수 있습니다.</p>
      <button className={styles.secondary} onClick={() => { if (window.confirm('현재 시즌의 보유 룬 체크를 초기화할까요?')) setOwned(p => ({ ...p, [season]: [] })); }}>현재 시즌 보유 룬 초기화</button>
    </section>

    <section className={styles.panel}>
      <div className={styles.sectionTitle}><h2>선택한 룬워드</h2><span>{selectedWords.length} / 5개</span></div>
      {selectedWords.length ? <div className={styles.pills}>{selectedWords.map(w => <button key={w.name} onClick={() => toggleWord(w.name)} title="선택 해제">{w.name} ×</button>)}</div> : <p className={styles.sub}>아래 목록에서 최대 5개까지 선택할 수 있어요.</p>}
      {!!selectedWords.length && <>
        <div className={styles.stats}>{totalEffect.map(([name, value]) => <span key={name}>{name} <b>{signed(value)}</b></span>)}</div>
        <p className={styles.result}>계산 가능한 옵션의 합산 추정 DPS <b>{fmt(combined)}</b></p>
      </>}
    </section>

    <section className={styles.panel}>
      <div className={styles.sectionTitle}><h2>시즌 {season} 룬워드</h2><span>사용 가능 {availableCount} / {currentWords.length}개</span></div>
      <div className={styles.controls}>
        <input className={styles.input} placeholder="룬워드·옵션·필요 룬 검색" aria-label="룬워드 검색" value={search} onChange={e => setSearch(e.target.value)} />
        <select className={styles.input} aria-label="정렬" value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
          <option value="dps">추정 DPS 높은 순</option><option value="missing">부족한 룬 적은 순</option><option value="name">이름순</option>
        </select>
        <label className={styles.switch}><input type="checkbox" checked={filterAvailable} onChange={e => setFilterAvailable(e.target.checked)} /> 사용 가능만 보기</label>
      </div>
      <div className={styles.attack}>공증 제외 공격력 기준 <input aria-label="공증 제외 공격력" type="number" min={1} value={baseAttack} onChange={e => setBaseAttack(Math.max(1, Number(e.target.value) || 1))} /></div>
      <p className={styles.warning}>DPS는 특정 직업 가중치 없는 참고 추정치입니다. 공격력·치명타·추가타·강타·연타·스킬 위력만 환산하며 나머지 옵션은 제외하므로, 완전한 실전 DPS 순위가 아닙니다.</p>
      <p className={styles.sub}>검색 결과 {items.length}개</p>
      <div className={styles.cards}>
        {items.map(w => <article key={w.name} className={styles.word}>
          <div className={styles.wordTop}>
            <div><h3>{w.name}</h3><span className={w.missing.length ? styles.notReady : styles.ready}>{w.missing.length ? '부족한 룬 ' + w.missing.length + '개' : '사용 가능'}</span></div>
            <div className={styles.score}><b>{fmt(w.percent)}</b><small>부분 DPS 추정</small></div>
          </div>
          <div className={styles.stats}>{w.effects.map((e, i) => <span key={i}>{e.name} <b>{signed(e.value)}</b></span>)}</div>
          {w.omitted.length > 0 && <p className={styles.omitted}>미반영: {w.omitted.join(', ')}</p>}
          <div className={styles.requirements}><b>필요 룬</b><div className={styles.pills}>{w.runes.map(r =>
            <button key={r} title={currentOwned.has(r) ? '보유 해제' : '보유 체크'} className={currentOwned.has(r) ? styles.has : styles.lacks} onClick={() => toggleRune(r)}>
              {currentOwned.has(r) ? '✓ ' : '+ '}{r}
            </button>)}</div></div>
          <button className={currentSelected.has(w.name) ? styles.chosen : styles.choose} onClick={() => toggleWord(w.name)}
            disabled={!currentSelected.has(w.name) && currentSelected.size >= 5}>
            {currentSelected.has(w.name) ? '선택 해제' : '룬워드 선택'}
          </button>
        </article>)}
      </div>
      {items.length === 0 && <p className={styles.sub}>조건에 맞는 룬워드가 없어요. 필터를 해제하거나 보유 룬을 체크해 주세요.</p>}
    </section>
  </main>;
}
