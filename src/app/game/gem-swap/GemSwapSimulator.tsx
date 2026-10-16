'use client';

import { useEffect, useMemo, useState } from 'react';
import { Gem, Swap, TAGS, DEFAULT_TARGETS, optimize, stats } from './optimizer';
import styles from './gemSwap.module.css';

type Profile = { id: string; name: string; targets: string[][]; gems: Gem[] };
const KEY = 'nn-game-gem-swap-v1';
const normalizeTargets = (raw: unknown): string[][] => {
  if (!Array.isArray(raw)) return DEFAULT_TARGETS.map(t=>[...t]);
  if (!Array.isArray(raw[0])) return DEFAULT_TARGETS.map(t=>[...t]);
  return Array.from({length:5},(_,i)=>uniqueTags(Array.isArray(raw[i])?raw[i]:[],3));
};
const GEM_NAME = '온전한 스타프리즘';
const normalizeTag = (value: unknown): string => {
  const text = String(value ?? '').trim();
  if (TAGS.includes(text)) return text;
  const legacy = text.match(/^(강타|연타|이동|방해|보조|생존|원소|소환)(댐|쿨)$/);
  if (legacy) return `${legacy[1]} ${legacy[2] === '댐' ? '댐증' : '쿨감'}`;
  return '';
};
const uniqueTags = (values: unknown[], size: number) => {
  const seen = new Set<string>();
  return Array.from({length:size},(_,i)=>{
    const tag = normalizeTag(values[i]);
    if (!tag || seen.has(tag)) return '';
    seen.add(tag);
    return tag;
  });
};
const safeCount = (value: unknown) => Math.max(1, Math.min(999, Math.floor(Number(value) || 1)));
const blank = (): Gem => ({ id: Math.random().toString(36).slice(2), name: GEM_NAME, count: 1, tags: ['', '', ''] });
const newProfile = (): Profile => ({ id: Math.random().toString(36).slice(2), name: '캐릭터 1', targets: DEFAULT_TARGETS.map(t=>[...t]), gems: Array.from({ length: 22 }, blank) });
const defaults = () => [newProfile()];

export default function GemSwapSimulator() {
  const [profiles, setProfiles] = useState<Profile[]>(defaults);
  const [activeId, setActiveId] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showExtraTargets, setShowExtraTargets] = useState(false);
  const [shareText, setShareText] = useState('');
  const [picker, setPicker] = useState<{ kind: 'gem' | 'target'; id?: string; index: number; rank?: number } | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { profiles?: Profile[]; activeId?: string };
        if (Array.isArray(saved.profiles) && saved.profiles.length) {
          const valid = saved.profiles.slice(0, 16).map(p => ({
            id: String(p.id), name: String(p.name || '캐릭터'),
            targets: normalizeTargets(p.targets),
            gems: Array.isArray(p.gems) ? p.gems.slice(0,120).map(g => ({
              id: String(g.id), name: GEM_NAME, count: safeCount(g.count),
              tags: uniqueTags(g.tags ?? [], 3),
            })) : [],
          }));
          setProfiles(valid);
          setActiveId(valid.some(p=>p.id===saved.activeId) ? saved.activeId! : valid[0].id);
        }
      }
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify({profiles,activeId})); } catch {}
  }, [profiles, activeId, loaded]);
  const active = profiles.find(p=>p.id===activeId) || profiles[0];
  const update = (change: (p:Profile)=>Profile) => {
    setProfiles(current=>current.map(p=>p.id===active.id ? change(p) : p));
    setResultOpen(false);
  };
  const updateGem = (id:string, patch:Partial<Gem>) => update(p=>({...p,gems:p.gems.map(g=>g.id===id?{...g,...patch}:g)}));
  const filled = active.gems.filter(g=>g.tags.some(Boolean));
  const totalGems = active.gems.reduce((sum,g)=>sum+safeCount(g.count),0);
  const valid = active.targets.some(t=>t.every(Boolean)) && filled.length>=1 &&
    filled.every(g=>g.tags.length===3 && g.tags.every(t=>TAGS.includes(t)));
  const result = useMemo(() => valid ? optimize(filled,active.targets) : null,
    // Profiles are immutable updates. Recompute only on actual changes.
    [active.gems,active.targets,valid]);
  const before = useMemo(()=>stats(filled,active.targets),[active.gems,active.targets]);
  const saveImport = () => {
    try {
      const parsed = JSON.parse(shareText) as Partial<Profile>;
      if (!Array.isArray(parsed.gems) || !Array.isArray(parsed.targets)) throw new Error();
      const profile: Profile = {
        id: Math.random().toString(36).slice(2), name: String(parsed.name || '가져온 캐릭터').slice(0,30),
        targets: normalizeTargets(parsed.targets),
        gems: parsed.gems.slice(0,120).map(g=>({
          id: Math.random().toString(36).slice(2), name: GEM_NAME, count: safeCount(g.count),
          tags: uniqueTags(g.tags ?? [], 3),
        })),
      };
      setProfiles(p=>[...p,profile].slice(-16)); setActiveId(profile.id); setShareText('');
    } catch { window.alert('유효한 보석 데이터 JSON을 입력해 주세요.'); }
  };
  const chooseTag = (tag: string) => {
    if (!picker) return;
    if (picker.kind === 'target') {
      const rank = picker.rank ?? 0;
      if (tag && active.targets[rank].some((t,i)=>i!==picker.index && t===tag)) return;
      update(p=>({...p,targets:p.targets.map((row,i)=>i===rank?row.map((t,j)=>j===picker.index?tag:t):row)}));
    } else {
      const gem = active.gems.find(g=>g.id===picker.id);
      if (!gem || (tag && gem.tags.some((t,i)=>i!==picker.index && t===tag))) return;
      updateGem(gem.id,{tags:gem.tags.map((t,i)=>i===picker.index?tag:t)});
    }
    setPicker(null);
  };
  const tagButton = (value:string,onClick:()=>void,label:string) =>
    <button type="button" className={styles.tagButton + (value ? ' '+styles.selectedTag : '')}
      onClick={onClick} aria-label={label} aria-haspopup="dialog">
      {value || '＋ 태그'}
    </button>;
  const picked = picker?.kind === 'target' ? active.targets[picker.rank ?? 0] :
    picker?.kind === 'gem' ? active.gems.find(g=>g.id===picker.id)?.tags ?? [] : [];
  const pickerValue = picker ? picked[picker.index] : '';
  const statCards = (s:ReturnType<typeof stats>) =>
    <div className={styles.stats}>
      {s.counts.map((n,i)=><div key={i}><small>{i+1}순위 조합</small><b>{n}개</b></div>)}
    </div>;

  return <main className={styles.wrap}>
    <header className={styles.header}>
      <h1>보석 태그 스왑 시뮬레이터</h1>
      <p>전체 보석의 태그를 교환해 1순위 조합부터 우선하여 완성 개수를 최대화합니다.</p>
    </header>
    <section className={styles.panel}>
      <div className={styles.sectionTitle}><h2>캐릭터</h2><button onClick={()=>{
        if(profiles.length>=16)return;
        const p={...newProfile(),name:'캐릭터 '+(profiles.length+1)};
        setProfiles(all=>[...all,p]);setActiveId(p.id);
      }}>+ 캐릭터 추가</button></div>
      <div className={styles.profileBar}>
        <select aria-label="캐릭터 선택" value={active.id} onChange={e=>{setActiveId(e.target.value);setResultOpen(false);}}>
          {profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input aria-label="캐릭터 이름" value={active.name} maxLength={30} onChange={e=>update(p=>({...p,name:e.target.value}))}/>
        {profiles.length>1&&<button className={styles.dangerBtn} onClick={()=>{
          if(!window.confirm('이 캐릭터를 삭제할까요?'))return;
          const rest=profiles.filter(p=>p.id!==active.id);setProfiles(rest);setActiveId(rest[0].id);
        }}>삭제</button>}
      </div>
    </section>
    <section className={styles.panel}>
      <div className={styles.sectionTitle}><h2>목표 조합</h2><span>1순위부터 우선 적용</span></div>
      <div className={styles.comboList}>
        {active.targets.map((tags,rank)=>rank>1&&!showExtraTargets?null:<div className={styles.comboRow} key={rank}>
          <b>{rank+1}순위 {rank===0?'· 최우선':''}</b>
          <div className={styles.comboTags}>{tags.map((tag,index)=>
            tagButton(tag,()=>setPicker({kind:'target',rank,index}),rank+1+'순위 조합 '+(index+1)+'번째 태그 선택')
          )}</div>
          {rank>1&&<button type="button" className={styles.comboClear} onClick={()=>update(p=>({...p,targets:p.targets.map((t,i)=>i===rank?['','','']:t)}))}>비우기</button>}
        </div>)}
      </div>
      <button type="button" className={styles.extraToggle} onClick={()=>setShowExtraTargets(v=>!v)}>
        {showExtraTargets?'3~5순위 접기 ▲':'＋ 3~5순위 목표 설정'}
      </button>
      <p className={styles.help}>1순위 조합 개수를 최대화하고, 같으면 2순위를 비교합니다. 나머지 순위도 같은 방식이에요.</p>
    </section>
    <section className={styles.panel}>
      <div className={styles.sectionTitle}><h2>보유 보석 <small>{totalGems}개 · {active.gems.length}줄</small></h2>
        <button onClick={()=>update(p=>({...p,gems:[...p.gems,...Array.from({length:4},blank)].slice(0,120)}))}>+ 4개 추가</button></div>
      <div className={styles.gemList}>
        {(showAll?active.gems:active.gems.slice(0,22)).map((gem,i)=><div className={styles.gemRow} key={gem.id}>
          <span className={styles.number}>{i+1}</span>
          <span className={styles.fixedName}>{GEM_NAME}</span>
          <label className={styles.quantity}><span>수량</span><input type="number" min={1} max={999} inputMode="numeric" aria-label={'보석 '+(i+1)+' 수량'} value={gem.count} onChange={e=>updateGem(gem.id,{count:safeCount(e.target.value)})}/></label>
          <div className={styles.tagSet}>{gem.tags.map((tag,j)=><div key={j}>
            {tagButton(tag,()=>setPicker({kind:'gem',id:gem.id,index:j}),'보석 '+(i+1)+' 태그 '+(j+1)+' 선택')}
          </div>)}</div>
          <button className={styles.remove} aria-label={'보석 '+(i+1)+' 삭제'} onClick={()=>update(p=>({...p,gems:p.gems.filter(g=>g.id!==gem.id)}))}>×</button>
        </div>)}
      </div>
      {active.gems.length>22&&<button className={styles.secondary} onClick={()=>setShowAll(s=>!s)}>{showAll?'처음 22개만 보기':'나머지 '+(active.gems.length-22)+'개 보기'}</button>}
      <div className={styles.bottomActions}>
        <button className={styles.secondary} onClick={()=>update(p=>({...p,gems:[...p.gems,blank()]}))}>+ 보석 1개</button>
        <button className={styles.secondary} onClick={()=>{if(window.confirm('현재 캐릭터의 보석을 비울까요?'))update(p=>({...p,gems:Array.from({length:22},blank)}));}}>보석 초기화</button>
      </div>
    </section>
    <section className={styles.panel}>
      <div className={styles.sectionTitle}><h2>균형 최적화</h2><span>모든 보석에 동일하게 적용되는 태그 교환</span></div>
      <div className={styles.before}><span>현재 줄작</span>{statCards(before)}</div>
      {!valid ? <p className={styles.help}>3개 태그로 완성된 목표 조합과 보석을 한 개 이상 입력하면 추천이 계산됩니다. 일부 태그만 입력한 보석이 있으면 먼저 완성해 주세요.</p> :
        <>
          <button className={styles.primary} onClick={()=>setResultOpen(true)}>스왑 추천 결과 보기</button>
          {resultOpen&&result&&<div className={styles.result}>
            <div className={styles.sectionTitle}><h3>추천 결과</h3><span>{result.moves.length}회 교환</span></div>
            {statCards(result.stats)}
            <p className={styles.help}>우선순위별 완성 개수: {before.counts.map((n,i)=>`${i+1}순위 ${n}→${result.stats.counts[i]}`).join(' · ')}</p>
            {result.moves.length===0?<p className={styles.help}>우선순위 조합의 완성 개수를 늘리는 교환을 찾지 못했어요. 현재 조합은 유지하는 편이 좋습니다. 단, 여러 단계를 거치는 더 나은 조합이 있을 가능성은 있어요.</p>:
              <ol className={styles.steps}>{result.moves.map((move:Swap,i)=><li key={i}>
                <b>{i+1}단계</b> · 모든 보유 보석에서 <em>{move.from}</em>
                {' ↔ '}<em>{move.to}</em> 태그를 일괄 교환
              </li>)}</ol>}
            <details><summary>추천 결과 보석별 태그 확인</summary>
              <div className={styles.finalList}>{result.gems.map((g,i)=><div key={g.id}><b>{GEM_NAME} ×{g.count}</b> <span>{g.tags.join(' · ')}</span></div>)}</div>
            </details>
            <button className={styles.secondary} onClick={()=>{if(window.confirm('추천 결과를 현재 보석 태그에 적용할까요?'))update(p=>({...p,gems:p.gems.map(g=>result.gems.find(r=>r.id===g.id)??g)}));}}>추천 배치 적용</button>
          </div>}
        </>}
      <p className={styles.help}>게임의 태그 종류 일괄 교환 규칙을 기준으로 합니다. 현재 버전은 여러 경로를 탐색하는 탐욕적 개선 방식입니다. 전역 최적 조합을 보장하지 않으며, 게임에서 실제 교환하기 전에 단계별 태그를 확인해 주세요.</p>
    </section>
    <section className={styles.panel}>
      <h2>캐릭터 데이터 내보내기 · 가져오기</h2>
      <div className={styles.bottomActions}><button className={styles.secondary} onClick={()=>navigator.clipboard?.writeText(JSON.stringify(active))}>현재 캐릭터 JSON 복사</button></div>
      <textarea className={styles.importBox} value={shareText} onChange={e=>setShareText(e.target.value)} placeholder="다른 기기에서 복사한 캐릭터 JSON을 붙여 넣으세요." rows={3}/>
      <button className={styles.secondary} disabled={!shareText.trim()} onClick={saveImport}>붙여넣은 캐릭터 가져오기</button>
      <p className={styles.help}>데이터는 이 브라우저에 자동 저장됩니다. 다른 기기에서는 JSON으로 옮길 수 있어요.</p>
    </section>
    {picker && <div className={styles.pickerBackdrop} onClick={()=>setPicker(null)}>
      <div className={styles.pickerPanel} role="dialog" aria-modal="true" aria-label="스킬 태그 선택"
        onClick={e=>e.stopPropagation()}>
        <div className={styles.pickerTop}>
          <b>{picker.kind==='target' ? '목표 '+((picker.rank??0)+1)+'순위 · '+(picker.index+1)+'번째 태그' : '보석 태그 '+(picker.index+1)} 선택</b>
          <div>
            <button type="button" onClick={()=>chooseTag('')}>비우기</button>
            <button type="button" onClick={()=>setPicker(null)}>닫기 ×</button>
          </div>
        </div>
        {(['댐증','쿨감'] as const).map(type=><section key={type} className={styles.pickerGroup}>
          <h3>{type==='댐증'?'⚔️ 대미지 증가':'◷ 쿨타임 감소'}</h3>
          <div className={styles.pickerChoices}>
            {TAGS.filter(t=>t.endsWith(type)).map(tag=>{
              const duplicate = tag!==pickerValue && picked.some((t,i)=>i!==picker.index&&t===tag);
              return <button type="button" key={tag} disabled={duplicate}
                className={styles.choice + (tag===pickerValue?' '+styles.choiceSelected:'')}
                onClick={()=>chooseTag(tag)}>
                {tag.replace(' '+type,'')}
                {duplicate&&<small>선택됨</small>}
              </button>;
            })}
          </div>
        </section>)}
        <p className={styles.pickerHint}>현재 보석 또는 목표에 이미 선택된 태그는 중복 선택할 수 없어요.</p>
      </div>
    </div>}
  </main>;
}
