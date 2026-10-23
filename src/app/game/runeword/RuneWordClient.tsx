'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './runeword.module.css';
import { SEASON2_RUNE_CATALOG, SEASON2_MYTHIC_RUNES } from './season2Catalog';

type Effect = { name: string; value: number };
export type RuneWord = { name: string; effects: Effect[]; runes: string[] };
type Season = 1 | 2;
type Category = '무기' | '방어구' | '클래스·장신구' | '엠블럼' | '분류 확인 필요';

const CATEGORY_ORDER: Category[] = ['무기', '방어구', '클래스·장신구', '엠블럼', '분류 확인 필요'];

const CLASS_GROUPS: Record<string, string[]> = {
  '화염술사': '불기둥+,열풍+,화력+,청염+,분출+,발화+,잿더미+,불씨+,폭격+'.split(','),
  '마법사': '서리기사+,낙뢰+,우레+,깜빡임+,증폭+,운석+,신시대+,암석+,빙창+'.split(','),
  '빙결술사': '수정+,빙검+,겨울+,빙하+,오로라+,고드름+,파편+,폭풍+,설원+'.split(','),
  '전격술사': '도관+,천둥+,벼락+,역장+,섬광+,환기+,방전+,장막+,폭풍우+'.split(','),
  '전사': '포효+,패기+,참격+,붕괴+,극점+,돌격+,맹공+,돌진+,검투사+'.split(','),
  '대검전사': '분노+,봉쇄+,회심+,광전사+,반격+,탄력+,회전+,절단+,무자비+'.split(','),
  '검술사': '맹렬+,일섬+,평정+,낙화+,관통+,압박+,무희+,피바람+,중검+'.split(','),
  '기사': '돌파+,헌신+,고결+,맹약+,결의+,격돌+,명예+,용기+,지진+'.split(','),
  '궁수': '치명적+,탈출+,닻+,추적+,매+,몰아침+,재빠른+,날렵함+,나선+'.split(','),
  '장궁병': '무너짐+,돌개+,집중+,비연+,초음파+,파쇄+,내상+,끈질김+,호응+'.split(','),
  '석궁사수': '연쇄+,화약+,감전+,균열+,방해+,반전+,산탄+,전류+,꿰뚫음+'.split(','),
  '힐러': '서약+,개화+,고동침+,물결+,억압+,감쌈+,광륜+,빛무리+,기호+'.split(','),
  '사제': '수레바퀴+,심판+,빛줄기+,희생+,성전+,결속+,축복+,날개+,집행+'.split(','),
  '수도사': '광휘+,축성+,업화+,정화+,인과+,해일+,뇌정+,응보+,등불+'.split(','),
  '암흑술사': '속박+,제사장+,광기+,착취+,절제+,심연+,타락+,나락+,구속+'.split(','),
  '음유시인': '즉흥+,무아+,기만+,재치+,조롱+,급습+,변주+,화음+,합주+'.split(','),
  '악사': '공명+,조율+,종장+,이중주+,속주+,박애+,매혹+,통성+,순환+'.split(','),
  '댄서': '갈채+,다가옴+,발걸음+,전환+,나비+,산뜻함+,간결함+,정열+,환호+'.split(','),
  '도적': '치밀함+,폭발+,주입+,땅거미+,독무+,교활함+,투척+,독성+,덫+'.split(','),
  '듀얼블레이드': '보름달+,질주+,속행+,강화+,회오리+,열상+,기본+,천침+,교차+'.split(','),
  '격투가': '도약+,순발력+,격파+,약점+,충돌+,일발+,강격+,전진+,승천+'.split(','),

};

// 시즌 1 ★8 도감: 게임 화면의 직업별 표시 순서.
// A rune belongs to one class only within a given season.
function validateClassRunes(groups: Record<string, string[]>, season: 1 | 2) {
  const seen = new Map<string, string>();
  for (const [job, names] of Object.entries(groups)) {
    for (const name of names) {
      const previous = seen.get(name);
      if (previous) throw new Error(`시즌 ${season} 장신구 룬 중복: ${name} (${previous}, ${job})`);
      seen.set(name, job);
    }
  }
}
validateClassRunes(CLASS_GROUPS, 2);

const SEASON1_MYTHIC = new Set('만 갈래 물길,메아리치는 진노,검게 물든 후광,그림자로 엮은 회랑,바스러지는 빛,세상을 삼키는 악의,이름 없는 혼돈,쏟아지는 별'.split(','));
const isMythic = (rune: string, season: Season) =>
  season === 1 ? SEASON1_MYTHIC.has(rune) : SEASON2_MYTHIC_RUNES.some(r => r === rune);
const SEASON1_WEAPONS = ["불길","결정","뇌명","독사+","공포","집행자","야수+","밤+","투사+","은둔자+","망각+","서리바람+","옛 마법사","물결치는 날","파괴자+","검무+","무수한 궤적","마지막 자비","끝없는 순환","종언+","영웅","폭군","천체 정렬","금빛 문장","만 갈래 물길","메아리치는 진노"];
const SEASON1_ARMORS = ["어망+","황혼","바위 감시자","쇄도+","무도가+","해결사+","돌톱","설산","절개+","환영+","황금 들판","모래 폭풍","황폐+","신성한 칙령","준비된 자","저무는 달","땅울림","신전 기사","근위병+","침묵하는 산","필사+","파멸+","집정관","새벽별","눈 먼 예언자","압도적인 힘","섬세한 손놀림","성역+","불안정한 힘","고대 수호자","갈퀴발톱+","태양","싹쓸바람","혼돈","붕괴하는 별","돌격대장+","지휘관","응징+","집념+","본색+","쌍둥이 별","푸른 거목","어두운 징조","요정 무리","수정 꽃잎","나무 사슴","에메랄드 숲","투사+","싸움꾼","약탈자","원소 조화","다가오는 죽음","잊힌 성소","바람 화살","무법자","천공의 화로","사냥꾼","쐐기","산들바람","나무 껍질","쏟아진 불길","주문 매듭","단조된 빛","유성","초신성","창백한 섬광","일렁이는 불꽃","물결퍼지는 전율","번개 채찍","기본기","검게 물든 후광","그림자로 엮은 회랑","바스러지는 빛","세상을 삼키는 악의","이름 없는 혼돈","쏟아지는 별"];
const SEASON1_EMBLEMS = '무자비한 포식자,순수한 힘,부서진 하늘,인도하는 빛,대마법사,물결치는 검,산맥 군주,아득한 빛,갈라진 땅,녹아내린 대지'.split(',');
const SEASON1_CLASSES: Record<string, string[]> = {
  '화염술사': '불기둥+,열풍+,화력+,청염+,분출+,발화+,잿더미+,불씨+'.split(','),
  '마법사': '서리기사+,낙뢰+,우레+,깜빡임+,증폭+,운석+,신시대+,암석+'.split(','),
  '빙결술사': '수정+,빙검+,겨울+,빙하+,오로라+,고드름+,파편+,폭풍+'.split(','),
  '전격술사': '도관+,천둥+,벼락+,역장+,섬광+,환기+,방전+,장막+'.split(','),
  '전사': '포효+,패기+,참격+,붕괴+,극점+,돌격+,맹공+,돌진+'.split(','),
  '대검전사': '분노+,봉쇄+,회심+,광전사+,반격+,탄력+,회전+,절단+'.split(','),
  '검술사': '열혈+,일섬+,평정+,낙화+,관통+,압박+,무희+,피바람+'.split(','),
  '기사': '돌파+,헌신+,고결+,맹약+,결의+,격돌+,명예+,용기+'.split(','),
  '궁수': '치명적+,탈출+,닻+,추적+,매+,몰아침+,재빠른+,날렵함+'.split(','),
  '장궁병': '무너짐+,돌개+,집중+,비연+,초음파+,파쇄+,내상+,끈질김+'.split(','),
  '석궁사수': '연쇄+,화약+,감전+,균열+,방해+,반전+,산탄+,전류+'.split(','),
  '힐러': '서약+,개화+,고동침+,물결+,억압+,감쌈+,광륜+,빛무리+'.split(','),
  '사제': '수레바퀴+,심판+,빛줄기+,희생+,성전+,결속+,축복+,날개+'.split(','),
  '수도사': '광휘+,축성+,업화+,정화+,인과+,해일+,뇌정+,응보+'.split(','),
  '암흑술사': '속박+,제사장+,광기+,착취+,절제+,심연+,타락+,나락+'.split(','),
  '음유시인': '즉흥+,무아+,기만+,재치+,조롱+,급습+,변주+,화음+'.split(','),
  '악사': '공명+,조율+,종장+,이중주+,속주+,박애+,매혹+,통성+'.split(','),
  '댄서': '갈채+,다가옴+,발걸음+,전환+,나비+,산뜻함+,간결함+,정열+'.split(','),
  '도적': '치밀함+,폭발+,주입+,땅거미+,독무+,교활함+,투척+,독성+'.split(','),
  '듀얼블레이드': '보름달+,질주+,속행+,강화+,회오리+,열상+,기본+,천침+'.split(','),
  '격투가': '도약+,순발력+,격파+,약점+,충돌+,일발+,강격+,전진+'.split(','),

};

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
validateClassRunes(SEASON1_CLASSES, 1);
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
  const baseAttack = 26500;

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
  // Capture order is authoritative: never dedupe or alphabetize display rows.
  const catalog = useMemo<Record<Category, string[]>>(() => {
    const standard = season === 1
      ? { '무기': SEASON1_WEAPONS, '방어구': SEASON1_ARMORS,
          '클래스·장신구': Object.values(SEASON1_CLASSES).flat(), '엠블럼': SEASON1_EMBLEMS }
      : { '무기': [...SEASON2_RUNE_CATALOG['무기']],
          '방어구': [...SEASON2_RUNE_CATALOG['방어구']],
          '클래스·장신구': Object.values(CLASS_GROUPS).flat(),
          '엠블럼': [...SEASON2_RUNE_CATALOG['엠블럼']] };
    const known = new Set(Object.values(standard).flat());
    const unmatched = [...new Set(currentWords.flatMap(word => word.runes).filter(r => !known.has(r)))];
    return { ...standard, '분류 확인 필요': unmatched };
  }, [season, currentWords]);
  const runeCatalogCount = Object.entries(catalog).filter(([kind]) => kind !== '분류 확인 필요')
    .flatMap(([, names]) => names).length;
  const obtainedCatalogCount = Object.entries(catalog).filter(([kind]) => kind !== '분류 확인 필요')
    .flatMap(([, names]) => names).filter(r => currentOwned.has(r)).length;
  const categorized = useMemo(() => CATEGORY_ORDER.map(category => ({
    category, runes: catalog[category].filter(r => r.includes(runeSearch.trim())),
  })), [catalog, runeSearch]);

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
        <span>{obtainedCatalogCount} / {runeCatalogCount}개 획득</span>
      </div>
      <p className={styles.sub}>획득한 룬을 체크하세요. 시즌별 체크 상태는 이 브라우저에 저장됩니다.</p>
      <input className={styles.input} aria-label="보유 룬 검색" placeholder="룬 이름 검색" value={runeSearch} onChange={e => setRuneSearch(e.target.value)} />
      <div className={styles.folds}>
        {categorized.map(group => <details className={styles.fold} key={group.category}>
          <summary><b>{group.category}</b><span>{group.runes.filter(r => currentOwned.has(r)).length} / {group.runes.length}개 <strong>⌄</strong></span></summary>
          <div className={styles.runes}>
            {group.category === '클래스·장신구' ? Object.keys(season === 1 ? SEASON1_CLASSES : CLASS_GROUPS).map(job => {
              const classRunes = (season === 1 ? SEASON1_CLASSES : CLASS_GROUPS)[job].filter(r => r.includes(runeSearch.trim()));
              return classRunes.length ? <div className={styles.classGroup} key={job}>
                <b>{job} <small>{classRunes.filter(r => currentOwned.has(r)).length} / {classRunes.length}</small></b>
                <div className={styles.runePills}>{classRunes.map(r => <button type="button" key={r}
                  className={isMythic(r, season) ? (currentOwned.has(r) ? styles.mythicChecked : styles.mythicRune) : (currentOwned.has(r) ? styles.runeChecked : styles.rune)}
                  aria-pressed={currentOwned.has(r)} onClick={() => toggleRune(r)}>{r}{isMythic(r, season) ? ' · 신화' : ''}</button>)}</div>
              </div> : null;
            }) : group.runes.map(r => <button type="button" key={r}
              className={isMythic(r, season) ? (currentOwned.has(r) ? styles.mythicChecked : styles.mythicRune) : (currentOwned.has(r) ? styles.runeChecked : styles.rune)}
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
