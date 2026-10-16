'use client';

import { useEffect, useMemo, useState } from 'react';
import { Gem, Swap, TAGS, optimize, stats } from './optimizer';
import styles from './gemSwap.module.css';

type Profile = { id: string; name: string; targets: string[]; gems: Gem[] };
const KEY = 'nn-game-gem-swap-v1';
const blank = (): Gem => ({ id: Math.random().toString(36).slice(2), name: '', grade: '7성', tags: ['', '', ''] });
const newProfile = (): Profile => ({ id: Math.random().toString(36).slice(2), name: '캐릭터 1', targets: ['', '', '', '', ''], gems: Array.from({ length: 22 }, blank) });
const same = (a: string[], b: string[]) => a.every((v,i)=>v===b[i]);
const defaults = () => [newProfile()];

export default function GemSwapSimulator() {
  const [profiles, setProfiles] = useState<Profile[]>(defaults);
  const [activeId, setActiveId] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [shareText, setShareText] = useState('');
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { profiles?: Profile[]; activeId?: string };
        if (Array.isArray(saved.profiles) && saved.profiles.length) {
          const valid = saved.profiles.slice(0, 16).map(p => ({
            id: String(p.id), name: String(p.name || '캐릭터'),
            targets: Array.from({length:5},(_,i)=>String(p.targets?.[i] || '')),
            gems: Array.isArray(p.gems) ? p.gems.slice(0,120).map(g => ({
              id: String(g.id), name: String(g.name || ''), grade: String(g.grade || '7성'),
              tags: Array.from({length:3},(_,i)=>String(g.tags?.[i] || '')),
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
  const valid = active.targets[0] && active.targets[1] && active.targets[2] &&
    new Set(active.targets.slice(0,3)).size===3 &&
    filled.length>=2 && filled.every(g=>g.tags.length===3 && g.tags.every(t=>TAGS.some(tag=>tag===t)));
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
        targets: Array.from({length:5},(_,i)=>TAGS.includes(parsed.targets?.[i] as typeof TAGS[number]) ? String(parsed.targets?.[i]) : ''),
        gems: parsed.gems.slice(0,120).map(g=>({
          id: Math.random().toString(36).slice(2), name: String(g.name||'').slice(0,60),
          grade: String(g.grade||'7성'),
          tags: Array.from({length:3},(_,i)=>TAGS.includes(g.tags?.[i] as typeof TAGS[number]) ? String(g.tags?.[i]) : ''),
        })),
      };
      setProfiles(p=>[...p,profile].slice(-16)); setActiveId(profile.id); setShareText('');
    } catch { window.alert('유효한 보석 데이터 JSON을 입력해 주세요.'); }
  };
  const tagSelect = (value:string,onChange:(v:string)=>void,placeholder='선택') =>
    <select value={value} onChange={e=>onChange(e.target.value)} aria-label={placeholder}>
      <option value="">태그 선택</option>
      {TAGS.map(t=><option key={t} value={t}>{t}</option>)}
    </select>;
  const statCards = (s:ReturnType<typeof stats>) =>
    <div className={styles.stats}>
      <div><small>1줄작</small><b>{s.one}</b></div><div><small>2줄작</small><b>{s.two}</b></div><div><small>3줄작</small><b>{s.three}</b></div>
    </div>;

  return <main className={styles.wrap}>
    <header className={styles.header}>
      <h1>보석 태그 스왑 시뮬레이터</h1>
      <p>전체 보석에 적용되는 태그 종류 맞교환으로 1·2·3줄작을 균형 있게 개선하는 경로를 추천합니다.</p>
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
      <div className={styles.sectionTitle}><h2>목표 태그 우선순위</h2><span>1~3순위 필수 · 4~5순위 선택</span></div>
      <div className={styles.targetGrid}>
        {active.targets.map((tag,i)=><label key={i}><span>{i+1}순위</span>
          {tagSelect(tag,value=>update(p=>({...p,targets:p.targets.map((t,j)=>i===j?value:t)})),'목표 '+(i+1)+'순위')}
        </label>)}
      </div>
      <p className={styles.help}>1줄작 = 1순위 포함, 2줄작 = 1·2순위 포함, 3줄작 = 1·2·3순위 포함. 현재 균형 점수는 1·2·3순위를 기준으로 합니다.</p>
    </section>
    <section className={styles.panel}>
      <div className={styles.sectionTitle}><h2>보유 보석 <small>{active.gems.length}개</small></h2>
        <button onClick={()=>update(p=>({...p,gems:[...p.gems,...Array.from({length:4},blank)].slice(0,120)}))}>+ 4개 추가</button></div>
      <div className={styles.gemList}>
        {(showAll?active.gems:active.gems.slice(0,22)).map((gem,i)=><div className={styles.gemRow} key={gem.id}>
          <span className={styles.number}>{i+1}</span>
          <input className={styles.gemName} aria-label={'보석 '+(i+1)+' 이름'} placeholder="보석 이름 (선택)" value={gem.name} onChange={e=>updateGem(gem.id,{name:e.target.value})}/>
          <select className={styles.grade} aria-label={'보석 '+(i+1)+' 등급'} value={gem.grade} onChange={e=>updateGem(gem.id,{grade:e.target.value})}>
            {['5성','6성','7성','8성','9성'].map(g=><option key={g}>{g}</option>)}
          </select>
          <div className={styles.tagSet}>{gem.tags.map((tag,j)=><div key={j}>
            {tagSelect(tag,v=>updateGem(gem.id,{tags:gem.tags.map((t,k)=>k===j?v:t)}),'보석 '+(i+1)+' 태그 '+(j+1))}
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
      {!valid ? <p className={styles.help}>서로 다른 1~3순위 태그를 선택하고, 태그 3개가 모두 입력된 보석을 2개 이상 등록하면 추천이 계산됩니다. 일부 태그만 입력한 보석이 있으면 먼저 완성해 주세요.</p> :
        <>
          <button className={styles.primary} onClick={()=>setResultOpen(true)}>스왑 추천 결과 보기</button>
          {resultOpen&&result&&<div className={styles.result}>
            <div className={styles.sectionTitle}><h3>추천 결과</h3><span>{result.moves.length}회 교환</span></div>
            {statCards(result.stats)}
            <p className={styles.help}>현재 → 추천: 1줄작 {before.one} → {result.stats.one}, 2줄작 {before.two} → {result.stats.two}, 3줄작 {before.three} → {result.stats.three}</p>
            {result.moves.length===0?<p className={styles.help}>점수를 개선하는 단일 맞교환을 찾지 못했어요. 현재 배치가 이미 좋은 상태이거나 여러 단계를 거치는 교환이 필요할 수 있어요.</p>:
              <ol className={styles.steps}>{result.moves.map((move:Swap,i)=><li key={i}>
                <b>{i+1}단계</b> · 모든 보유 보석에서 <em>{move.from}</em>
                {' ↔ '}<em>{move.to}</em> 태그를 일괄 교환
              </li>)}</ol>}
            <details><summary>추천 결과 보석별 태그 확인</summary>
              <div className={styles.finalList}>{result.gems.map((g,i)=><div key={g.id}><b>{g.name||'보석 '+(i+1)}</b> <span>{g.tags.join(' · ')}</span></div>)}</div>
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
  </main>;
}
