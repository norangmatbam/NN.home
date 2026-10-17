'use client';

import { useEffect, useState } from 'react';
import styles from './chores.module.css';

type Category = '주간' | '주말';
type Task = { id: string; name: string; category: Category; target?: number };
type Character = { id: string; name: string; job: string; power: string; role: string; soulGroup: string };
type Data = { characters: Character[]; tasks: Task[]; checks: Record<string, boolean>; counts: Record<string, number>; notes: Record<string,string>; week: string };

const KEY = 'nn-game-chores-v1';
const ZOOM_KEY = 'nn-game-chores-table-zoom-v1';
const ZOOM_LEVELS = [40, 50, 60, 70, 80, 90, 100] as const;
const SHARED_SOUL_TASK = 'weekly8';
const VANGUARD_TASK = 'weekly4';
const DEFAULT_VANGUARD_TARGET = 3;
const SOUL_GROUPS = ['A','B','C'];
const isSharedSoul = (task: Task) => task.id === SHARED_SOUL_TASK;
const groupKey = (group: string) => SHARED_SOUL_TASK + ':group:' + group;
const currentGroup = (c: Character) => c.soulGroup || '';
const uid = () => Math.random().toString(36).slice(2, 11);
const characters: Character[] = ['노랑맛밤','오천원','노랑맛군밤','노랑고구마','노랑꿀밤','던노맛','우제강'].map((name,i)=>({
  id: 'char'+i, name, job: '', power: '', role: '', soulGroup: i<5?'A':'',
}));
const initialTasks: Task[] = [
  ...['어비스','카브락','에이렐','서큐버스','뱅가드','필보','심층해어','혼돈탑','골드로 소울 사기'].map((name,i)=>({id:'weekly'+i,name,category:'주간' as const,target:i===4?DEFAULT_VANGUARD_TARGET:undefined})),
  ...['어비스 3회','레이드 1회','종말파괴기','콕데타'].map((name,i)=>({id:'weekend'+i,name,category:'주말' as const})),
];
function weekKey(date = new Date()) {
  // Monday based ISO week date, calculated using local calendar dates.
  const day = (date.getDay()+6)%7;
  const monday = new Date(date.getFullYear(),date.getMonth(),date.getDate()-day);
  return [monday.getFullYear(),String(monday.getMonth()+1).padStart(2,'0'),String(monday.getDate()).padStart(2,'0')].join('-');
}
function defaults(): Data { return { characters, tasks: initialTasks, checks: {}, counts: {}, notes: {}, week: weekKey() }; }
function load(): Data {
  const base=defaults();
  try {
    const raw=localStorage.getItem(KEY);if(!raw)return base;
    const data=JSON.parse(raw) as Partial<Data>;
    if(!Array.isArray(data.characters)||!Array.isArray(data.tasks))return base;
    return {
      characters:data.characters.slice(0,30).map(c=>({id:String(c.id),name:String(c.name||''),job:String(c.job||''),power:String(c.power||''),role:String(c.role||''),soulGroup: SOUL_GROUPS.includes(String(c.soulGroup))?String(c.soulGroup):['char0','char1','char2','char3','char4'].includes(String(c.id))?'A':''})),
      tasks:data.tasks.slice(0,80).filter(t=>t.category==='주간'||t.category==='주말').map(t=>({id:String(t.id),name:String(t.name||''),category:t.category,target:t.id===VANGUARD_TASK?Math.max(1,Math.min(99,Math.floor(Number(t.target)||DEFAULT_VANGUARD_TARGET))):undefined})),
      checks:(()=>{
        const checks=data.week===weekKey() && data.checks && typeof data.checks==='object'?{...data.checks}:{};
        if(!(groupKey('A') in checks) && (checks[SHARED_SOUL_TASK+':shared'] || ['char0','char1','char2','char3','char4'].some(id=>checks[SHARED_SOUL_TASK+':'+id])))
          checks[groupKey('A')]=true;
        delete checks[SHARED_SOUL_TASK+':shared'];
        for(const id of ['char0','char1','char2','char3','char4'])delete checks[SHARED_SOUL_TASK+':'+id];
        return checks;
      })(),
      counts:(()=>{
        const result:Record<string,number>={};
        if(data.week!==weekKey())return result;
        for(const [key,value] of Object.entries(data.counts||{}))result[key]=Math.max(0,Math.floor(Number(value)||0));
        for(const c of data.characters||[]){
          const key=VANGUARD_TASK+':'+c.id;
          if(!(key in result)&&data.checks?.[key])result[key]=0;
        }
        return result;
      })(),
      notes:data.notes && typeof data.notes==='object'?data.notes:{},
      week:weekKey(),
    };
  }catch{return base;}
}
export default function ChoreTracker(){
  const [data,setData]=useState<Data>(defaults);
  const [ready,setReady]=useState(false);
  const [editing,setEditing]=useState(false);
  const [category,setCategory]=useState<Category>('주간');
  const [taskName,setTaskName]=useState('');
  const [charName,setCharName]=useState('');
  const [zoom,setZoom]=useState(100);
  useEffect(()=>{
    setData(load());
    try {
      const saved=Number(localStorage.getItem(ZOOM_KEY));
      if(ZOOM_LEVELS.some(n=>n===saved))setZoom(saved);
    }catch{}
    setReady(true);
  },[]);
  const changeZoom=(value:number)=>{
    const next=Math.max(40,Math.min(100,value));
    setZoom(next);
    try{localStorage.setItem(ZOOM_KEY,String(next));}catch{}
  };
  useEffect(()=>{if(!ready)return;try{localStorage.setItem(KEY,JSON.stringify(data));}catch{}},[data,ready]);
  useEffect(()=>{
    const check=()=>setData(prev=>prev.week===weekKey()?prev:{...prev,week:weekKey(),checks:{},counts:{}});
    document.addEventListener('visibilitychange',check);
    return ()=>document.removeEventListener('visibilitychange',check);
  },[]);
  const update=(change:(data:Data)=>Data)=>setData(prev=>change(prev));
  const vanguardTask=data.tasks.find(t=>t.id===VANGUARD_TASK);
  const vanguardTarget=vanguardTask?.target||DEFAULT_VANGUARD_TARGET;
  const vanguardCount=(c:string)=>Math.max(0,data.counts[VANGUARD_TASK+':'+c] ?? vanguardTarget);
  const setVanguardCount=(c:string,count:number)=>update(d=>({...d,counts:{...d.counts,[VANGUARD_TASK+':'+c]:Math.max(0,Math.min(99,Math.floor(count)||0))}}));
  const checked=(t:string,c:string)=>{
    if(t===VANGUARD_TASK)return vanguardCount(c)===0;
    const character=data.characters.find(v=>v.id===c);
    const group=character?.soulGroup || (c.startsWith('group:')?c.slice(6):'');
    return t===SHARED_SOUL_TASK && group
      ? !!data.checks[groupKey(group)]
      : !!data.checks[t+':'+c];
  };
  const toggle=(t:string,c:string)=>update(d=>{
    const group=t===SHARED_SOUL_TASK?d.characters.find(v=>v.id===c)?.soulGroup:'';
    const key=group?groupKey(group):t+':'+c;
    return {...d,checks:{...d.checks,[key]:!d.checks[key]}};
  });
  const soulUnits=()=>{
    const groups=new Set(data.characters.map(c=>currentGroup(c)).filter(Boolean));
    return groups.size+data.characters.filter(c=>!c.soulGroup).length;
  };
  const total=data.tasks.reduce((count,t)=>count+(isSharedSoul(t)?soulUnits():data.characters.length),0);
  const done=data.tasks.reduce((count,t)=>count+(isSharedSoul(t)
    ? SOUL_GROUPS.filter(group=>data.characters.some(c=>c.soulGroup===group)&&checked(t.id,'group:'+group)).length
      +data.characters.filter(c=>!c.soulGroup&&checked(t.id,c.id)).length
    : data.characters.filter(c=>checked(t.id,c.id)).length),0);
  const progress=total?Math.round(done/total*100):0;
  // Place grouped characters together where their earliest registered member appears.
  // Ungrouped characters retain their own registration positions.
  const orderedCharacters: Character[] = [];
  const seenGroups=new Set<string>();
  for(const c of data.characters){
    if(!c.soulGroup){orderedCharacters.push(c);continue;}
    if(seenGroups.has(c.soulGroup))continue;
    seenGroups.add(c.soulGroup);
    orderedCharacters.push(...data.characters.filter(other=>other.soulGroup===c.soulGroup));
  }
  const soulCell=(task: Task, c: Character, index: number)=>{
    const group=c.soulGroup;
    if(group && index>0 && orderedCharacters[index-1].soulGroup===group)return null;
    const members=group?orderedCharacters.filter(other=>other.soulGroup===group):[c];
    return <td key={c.id} colSpan={members.length} className={styles.sharedCell}>
      <label className={styles.checkWrap}>
        <input type="checkbox" aria-label={group?'소울 구매 그룹 '+group+' ('+members.map(m=>m.name).join(', ')+')':c.name+' '+task.name}
          checked={checked(task.id,c.id)} onChange={()=>toggle(task.id,c.id)}/>
        <span aria-hidden="true">✓</span>
      </label>

    </td>;
  };
  const addTask=()=>{const name=taskName.trim();if(!name)return;update(d=>({...d,tasks:[...d.tasks,{id:uid(),name,category}]}));setTaskName('');};
  const addChar=()=>{const name=charName.trim();if(!name)return;update(d=>({...d,characters:[...d.characters,{id:uid(),name,job:'',power:'',role:'',soulGroup:''}]}));setCharName('');};
  const rename=(id:string,name:string)=>update(d=>({...d,characters:d.characters.map(c=>c.id===id?{...c,name}:c)}));
  return <main className={styles.wrap}>
    <header className={styles.heading}><div><h1>캐릭터 숙제 체크</h1><p>캐릭터별 주간·주말 숙제를 체크하고 한눈에 진행 상황을 확인해요.</p></div>
      <button aria-expanded={editing} onClick={()=>setEditing(v=>!v)}>{editing?'편집 접기 ▲':'캐릭터·숙제 편집 ▼'}</button></header>
    {editing&&<section className={styles.editor}>
      <div className={styles.editorHeading}><b>캐릭터·숙제 편집</b><button type="button" onClick={()=>setEditing(false)}>접기 ▲</button></div>
      <h2>캐릭터 추가</h2><div className={styles.controls}><input placeholder="캐릭터 이름" value={charName} onChange={e=>setCharName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addChar()}/><button onClick={addChar}>추가</button></div>
      <p className={styles.sharedHelp}>같은 그룹은 소울 구매를 한 번만 체크해요. 개별은 캐릭터별로 체크합니다.</p>
      <div className={styles.editList}>{data.characters.map(c=><div key={c.id}>
        <input value={c.name} aria-label="캐릭터 이름" onChange={e=>rename(c.id,e.target.value)}/>
        <select aria-label={c.name+' 소울 구매 그룹'} value={c.soulGroup} onChange={e=>update(d=>({...d,characters:d.characters.map(v=>v.id===c.id?{...v,soulGroup:e.target.value}:v)}))}>
          <option value="">개별</option>{SOUL_GROUPS.map(g=><option key={g} value={g}>그룹 {g}</option>)}
        </select>
        <button onClick={()=>{if(window.confirm(c.name+' 캐릭터를 삭제할까요?'))update(d=>({...d,characters:d.characters.filter(v=>v.id!==c.id)}))}}>삭제</button></div>)}</div>
      <h2>숙제 추가</h2><div className={styles.controls}><select value={category} onChange={e=>setCategory(e.target.value as Category)}><option>주간</option><option>주말</option></select><input placeholder="숙제 이름" value={taskName} onChange={e=>setTaskName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTask()}/><button onClick={addTask}>추가</button></div>
      <div className={styles.editList}>{data.tasks.map(t=><div key={t.id}><select value={t.category} onChange={e=>update(d=>({...d,tasks:d.tasks.map(v=>v.id===t.id?{...v,category:e.target.value as Category}:v)}))}><option>주간</option><option>주말</option></select><input aria-label="숙제 이름" value={t.name} onChange={e=>update(d=>({...d,tasks:d.tasks.map(v=>v.id===t.id?{...v,name:e.target.value}:v)}))}/>
        {t.id===VANGUARD_TASK&&<label className={styles.targetSetting}>목표 <input type="number" min={1} max={99} inputMode="numeric" aria-label="뱅가드 목표 횟수" value={t.target||DEFAULT_VANGUARD_TARGET} onChange={e=>update(d=>({...d,tasks:d.tasks.map(v=>v.id===t.id?{...v,target:Math.max(1,Math.min(99,Number(e.target.value)||1))}:v)}))}/></label>}
        <button onClick={()=>{if(window.confirm(t.name+' 숙제를 삭제할까요?'))update(d=>({...d,tasks:d.tasks.filter(v=>v.id!==t.id)}))}}>삭제</button></div>)}</div>
    </section>}
    <section className={styles.summary}>
      <div><b>{done} / {total}</b><span>이번 주 완료</span></div><div><b>{progress}%</b><span>진행률</span></div>
      <div className={styles.progress}><i style={{width:progress+'%'}} /></div>
      <small>주간 체크는 월요일 00시(기기 현지 시간)에 초기화됩니다. 데이터는 현재 브라우저에만 저장됩니다.</small>
    </section>
    <section className={styles.panel}>
      <div className={styles.tableIntro}><b>이번 주 숙제표</b><span>가로 스크롤 또는 배율 조절</span></div>
      <div className={styles.zoomBar}>
        <span>표 크기</span>
        <button type="button" aria-label="숙제표 축소" disabled={zoom<=40} onClick={()=>changeZoom(zoom-10)}>−</button>
        <strong>{zoom}%</strong>
        <button type="button" aria-label="숙제표 확대" disabled={zoom>=100} onClick={()=>changeZoom(zoom+10)}>＋</button>
        <button type="button" onClick={()=>changeZoom(100)}>원래 크기</button>
        <button type="button" onClick={()=>changeZoom(40)}>전체 보기</button>
      </div>
      <div className={styles.tableScroll}><table className={styles.table} style={{zoom: zoom / 100}}>
        <thead><tr><th className={styles.taskHead}>구분 · 숙제</th>{orderedCharacters.map(c=><th key={c.id} className={styles.charHead}><span>{c.name}</span></th>)}</tr></thead>
        <tbody>{(['주간','주말'] as Category[]).map(cat=><>
          <tr className={styles.groupRow} key={cat+'title'}><th>{cat}</th>{orderedCharacters.length > 0 && <td colSpan={orderedCharacters.length} />}</tr>
          {data.tasks.filter(t=>t.category===cat).map(t=><tr key={t.id}>
            <th className={styles.taskName}>{t.name}</th>
            {isSharedSoul(t)
              ? orderedCharacters.map((c,index)=>soulCell(t,c,index))
              : t.id===VANGUARD_TASK
                ? orderedCharacters.map(c=><td key={c.id}>
                    <select className={styles.countSelect} aria-label={c.name+' 뱅가드 남은 횟수'} value={Math.min(99,vanguardCount(c.id))} onChange={e=>setVanguardCount(c.id,Number(e.target.value))}>
                      {Array.from({length:Math.max(vanguardTarget,Math.min(99,vanguardCount(c.id)))+1},(_,n)=><option key={n} value={n}>{n}</option>)}
                    </select>
                  </td>)
                : orderedCharacters.map(c=><td key={c.id}>
                  <label className={styles.checkWrap}><input type="checkbox" aria-label={c.name+' '+t.name}
                    checked={checked(t.id,c.id)} onChange={()=>toggle(t.id,c.id)}/><span aria-hidden="true">✓</span></label>
                </td>)}
          </tr>)}
        </>)}</tbody>
        <tfoot><tr><th>완료</th>{orderedCharacters.map(c=><td key={c.id}>{data.tasks.filter(t=>(!isSharedSoul(t)||!c.soulGroup||data.characters.find(x=>x.soulGroup===c.soulGroup)?.id===c.id)&&checked(t.id,c.id)).length}/{data.tasks.filter(t=>!isSharedSoul(t)||!c.soulGroup||data.characters.find(x=>x.soulGroup===c.soulGroup)?.id===c.id).length}</td>)}</tr></tfoot>
      </table></div>
    </section>
    <section className={styles.panel}><div className={styles.footerRow}><b>이번 주 체크 초기화</b><button onClick={()=>{if(window.confirm('이번 주 모든 캐릭터의 체크를 초기화할까요?'))update(d=>({...d,checks:{},counts:{}}));}}>전체 체크 해제</button></div></section>
  </main>;
}
