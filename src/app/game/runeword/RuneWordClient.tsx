'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './runeword.module.css';

type Effect = { name: string; value: number };
export type RuneWord = { name: string; effects: Effect[]; runes: string[] };
type Season = 1 | 2;
type Category = '무기' | '방어구' | '클래스·장신구' | '엠블럼' | '분류 확인 필요';

const CATEGORY_ORDER: Category[] = ['무기', '방어구', '클래스·장신구', '엠블럼', '분류 확인 필요'];

// 스크린샷에서 명확하게 식별되는 룬을 기준으로 부위별 분류합니다.
// PDF의 룬워드 조합만으로 부위를 추론하지 않습니다.
const WEAPON = new Set('눈부신 잔영,황산+,계시+,광채+,타오르는 영광,오랜 광기,어둠의 충동,위엄+,부패+,창백한 기수,거대한 분노,비열한 날개,두 갈래 뿔,추적자,대군주+,죽음'.split(','));
const ARMOR = new Set('기본가+,첫 번째 서약,녹슨 방패,긍지,위엄,극점,공세+,정복자+,일번 찬가,기사단장,승전,열의+,수호자,맹세+,계승자,등대지기,빛살+,교차하는 사슬,날 선 적의,무덤지기+,복수+,모호한 형상,잿빛 장막,금 간 봉인,무너진 경계,아귀,부서진 왕관,거두는 손길,남아 있는 무력,민중,광휘,잊힌 맹약,칼바람,불안정한 힘,폭염+,행복한 결말,번개 숨결,들 심장,용암 비늘,얼음 발톱,숲 길잡이,바다뱀+,잠든 땅,비늘 덮인 현자,오랜 성배,무너진 경계,금 간 봉인,뼈 인장,첫 번째 서약,봉인술사,끓는 피'.split(','));
const EMBLEM = new Set('아득한 빛,위대함,영원한 밤,빛바랜 별'.split(','));
const CLASS_GROUPS: Record<string, string[]> = {
  '화염술사': '불기둥+,열풍+,화력+,청염+,분출+,발화+,잿더미+,불씨+,폭격+'.split(','),
  '빙결술사': '수정+,빙검+,겨울+,빙하+,파편+,고드름+,설원+,북풍+,오로라+'.split(','),
  '전격술사': '뇌정+,낙뢰+,우레+,섬광+,도관+,천둥+,환기+'.split(','),
  '전사': '포효+,패기+,참격+,붕괴+,맹공+,돌진+,광전사+,회전+,분노+'.split(','),
  '대검전사': '분노+,봉쇄+,회심+,절단+,무자비+,중검+'.split(','),
  '검술사': '연출+,일섬+,평정+,낙화+,무희+,격파+,무아+'.split(','),
  '수도사': '광휘+,축성+,업화+,정화+,뇌정+'.split(','),
};
const CLASS_OF = new Map(Object.entries(CLASS_GROUPS).flatMap(([job, names]) => names.map(name => [name, job] as const)));
function categoryOf(rune: string): Category {
  if (WEAPON.has(rune)) return '무기';
  if (ARMOR.has(rune)) return '방어구';
  if (EMBLEM.has(rune)) return '엠블럼';
  if (CLASS_OF.has(rune)) return '클래스·장신구';
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
            {group.category === '클래스·장신구' ? Object.keys(CLASS_GROUPS).map(job => {
              const classRunes = group.runes.filter(r => CLASS_OF.get(r) === job);
              return classRunes.length ? <div className={styles.classGroup} key={job}>
                <b>{job} <small>{classRunes.filter(r => currentOwned.has(r)).length} / {classRunes.length}</small></b>
                <div className={styles.runePills}>{classRunes.map(r => <button type="button" key={r}
                  className={currentOwned.has(r) ? styles.runeChecked : styles.rune}
                  aria-pressed={currentOwned.has(r)} onClick={() => toggleRune(r)}>{r}</button>)}</div>
              </div> : null;
            }) : group.runes.map(r => <button type="button" key={r}
              className={currentOwned.has(r) ? styles.runeChecked : styles.rune}
              aria-pressed={currentOwned.has(r)} onClick={() => toggleRune(r)}>{r}</button>)}
            {!group.runes.length && <span className={styles.sub}>표시할 룬이 없어요.</span>}
          </div>
        </details>)}
      </div>
      <p className={styles.warning}>공식 화면 이미지에서 분류를 확인할 수 없는 룬은 ‘분류 확인 필요’에 표시했어요. 해당 룬도 정상적으로 체크하고 필터링할 수 있습니다.</p>
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
