'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './chores.module.css';

type Category = '주간' | '주말';
type Task = { id: string; name: string; category: Category };
type Character = { id: string; name: string; job: string; power: string; role: string };
type Data = { characters: Character[]; tasks: Task[]; checks: Record<string, boolean>; notes: Record<string,string>; week: string };

const KEY = 'nn-game-chores-v1';
const SHARED_SOUL_TASK = 'weekly8';
const SOUL_GROUP = new Set(['char0','char1','char2','char3','char4']);
const SHARED_SOUL_CHECK = SHARED_SOUL_TASK + ':shared';
const isSharedSoul = (task: Task) => task.id === SHARED_SOUL_TASK;
const isEligibleSoul = (character: Character) => SOUL_GROUP.has(character.id);
const uid = () => Math.random().toString(36).slice(2, 11);
const characters: Character[] = ['노랑맛밤','오천원','노랑맛군밤','노랑고구마','노랑꿀밤','던노맛','우제강'].map((name,i)=>({
  id: 'char'+i, name, job: '', power: '', role: '',
}));
const initialTasks: Task[] = [
  ...['어비스','카브락','에이렐','서큐버스','뱅가드','필보','심층해어','혼돈탑','골드로 소울 사기'].map((name,i)=>({id:'weekly'+i,name,category:'주간' as const})),
  ...['어비스 3회','레이드 1회','종말파괴기','콕데타'].map((name,i)=>({id:'weekend'+i,name,category:'주말' as const})),
];
function weekKey(date = new Date()) {
  // Monday based ISO week date, calculated using local calendar dates.
  const day = (date.getDay()+6)%7;
  const monday = new Date(date.getFullYear(),date.getMonth(),date.getDate()-day);
  return [monday.getFullYear(),String(monday.getMonth()+1).padStart(2,'0'),String(monday.getDate()).padStart(2,'0')].join('-');
}
function defaults(): Data { return { characters, tasks: initialTasks, checks: {}, notes: {}, week: weekKey() }; }
function load(): Data {
  const base=defaults();
  try {
    const raw=localStorage.getItem(KEY);if(!raw)return base;
    const data=JSON.parse(raw) as Partial<Data>;
    if(!Array.isArray(data.characters)||!Array.isArray(data.tasks))return base;
    return {
      characters:data.characters.slice(0,30).map(c=>({id:String(c.id),name:String(c.name||''),job:String(c.job||''),power:String(c.power||''),role:String(c.role||'')})),
      tasks:data.tasks.slice(0,80).filter(t=>t.category==='주간'||t.category==='주말').map(t=>({id:String(t.id),name:String(t.name||''),category:t.category})),
      checks:data.week===weekKey() && data.checks && typeof data.checks==='object'?data.checks:{},
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
  useEffect(()=>{setData(load());setReady(true);},[]);
  useEffect(()=>{if(!ready)return;try{localStorage.setItem(KEY,JSON.stringify(data));}catch{}},[data,ready]);
  useEffect(()=>{
    const check=()=>setData(prev=>prev.week===weekKey()?prev:{...prev,week:weekKey(),checks:{}});
    document.addEventListener('visibilitychange',check);
    return ()=>document.removeEventListener('visibilitychange',check);
  },[]);
  const update=(change:(data:Data)=>Data)=>setData(prev=>change(prev));
  const checked=(t:string,c:string)=> t===SHARED_SOUL_TASK
    ? !!data.checks[SHARED_SOUL_CHECK] || [...SOUL_GROUP].some(id=>!!data.checks[t+':'+id])
    : !!data.checks[t+':'+c];
  const toggle=(t:string,c:string)=>update(d=>{
    if(t===SHARED_SOUL_TASK){
      const current=!!d.checks[SHARED_SOUL_CHECK] || [...SOUL_GROUP].some(id=>!!d.checks[t+':'+id]);
      const checks={...d.checks,[SHARED_SOUL_CHECK]:!current};
      for(const id of SOUL_GROUP)delete checks[t+':'+id];
      return {...d,checks};
    }
    return {...d,checks:{...d.checks,[t+':'+c]:!d.checks[t+':'+c]}};
  });
  const sharedActive=data.characters.some(c=>isEligibleSoul(c))&&data.tasks.some(isSharedSoul);
  const total=data.tasks.reduce((count,t)=>count+(isSharedSoul(t)?(sharedActive?1:0):data.characters.length),0);
  const done=data.tasks.reduce((count,t)=>count+(isSharedSoul(t)
    ? (sharedActive&&checked(t.id,'shared')?1:0)
    : data.characters.filter(c=>checked(t.id,c.id)).length),0);
  const progress=total?Math.round(done/total*100):0;
  const addTask=()=>{const name=taskName.trim();if(!name)return;update(d=>({...d,tasks:[...d.tasks,{id:uid(),name,category}]}));setTaskName('');};
  const addChar=()=>{const name=charName.trim();if(!name)return;update(d=>({...d,characters:[...d.characters,{id:uid(),name,job:'',power:'',role:''}]}));setCharName('');};
  const rename=(id:string,name:string)=>update(d=>({...d,characters:d.characters.map(c=>c.id===id?{...c,name}:c)}));
  return <main className={styles.wrap}>
    <header className={styles.heading}><div><h1>캐릭터 숙제 체크</h1><p>캐릭터별 주간·주말 숙제를 체크하고 한눈에 진행 상황을 확인해요.</p></div>
      <button onClick={()=>setEditing(v=>!v)}>{editing?'편집 완료':'캐릭터·숙제 편집'}</button></header>
    <section className={styles.summary}>
      <div><b>{done} / {total}</b><span>이번 주 완료</span></div><div><b>{progress}%</b><span>진행률</span></div>
      <div className={styles.progress}><i style={{width:progress+'%'}} /></div>
      <small>주간 체크는 월요일 00시(기기 현지 시간)에 초기화됩니다. 데이터는 현재 브라우저에만 저장됩니다.</small>
    </section>
    {editing&&<section className={styles.editor}>
      <h2>캐릭터 추가</h2><div className={styles.controls}><input placeholder="캐릭터 이름" value={charName} onChange={e=>setCharName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addChar()}/><button onClick={addChar}>추가</button></div>
      <div className={styles.editList}>{data.characters.map(c=><div key={c.id}><input value={c.name} aria-label="캐릭터 이름" onChange={e=>rename(c.id,e.target.value)}/><button onClick={()=>{if(window.confirm(c.name+' 캐릭터를 삭제할까요?'))update(d=>({...d,characters:d.characters.filter(v=>v.id!==c.id)}))}}>삭제</button></div>)}</div>
      <h2>숙제 추가</h2><div className={styles.controls}><select value={category} onChange={e=>setCategory(e.target.value as Category)}><option>주간</option><option>주말</option></select><input placeholder="숙제 이름" value={taskName} onChange={e=>setTaskName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTask()}/><button onClick={addTask}>추가</button></div>
      <div className={styles.editList}>{data.tasks.map(t=><div key={t.id}><select value={t.category} onChange={e=>update(d=>({...d,tasks:d.tasks.map(v=>v.id===t.id?{...v,category:e.target.value as Category}:v)}))}><option>주간</option><option>주말</option></select><input aria-label="숙제 이름" value={t.name} onChange={e=>update(d=>({...d,tasks:d.tasks.map(v=>v.id===t.id?{...v,name:e.target.value}:v)}))}/><button onClick={()=>{if(window.confirm(t.name+' 숙제를 삭제할까요?'))update(d=>({...d,tasks:d.tasks.filter(v=>v.id!==t.id)}))}}>삭제</button></div>)}</div>
    </section>}
    <section className={styles.panel}>
      <div className={styles.tableIntro}><b>이번 주 숙제표</b><span>가로로 스크롤해 캐릭터를 확인할 수 있어요 →</span></div>
      <div className={styles.tableScroll}><table className={styles.table}>
        <thead><tr><th className={styles.taskHead}>구분 · 숙제</th>{data.characters.map(c=><th key={c.id} className={styles.charHead}><span>{c.name}</span></th>)}</tr></thead>
        <tbody>{(['주간','주말'] as Category[]).map(cat=><>
          <tr className={styles.groupRow} key={cat+'title'}><th>{cat}</th>{data.characters.map(c=><td key={c.id} />)}</tr>
          {data.tasks.filter(t=>t.category===cat).map(t=><tr key={t.id}><th className={styles.taskName}>{t.name}{isSharedSoul(t)&&<small className={styles.sharedNote}>5캐릭터 공용 · 1회</small>}</th>{data.characters.map(c=><td key={c.id} className={isSharedSoul(t)?styles.sharedCell:undefined}>
            {isSharedSoul(t)
              ? isEligibleSoul(c) && data.characters.find(x=>isEligibleSoul(x))?.id===c.id
                ? <label className={styles.checkWrap}><input type="checkbox" aria-label="골드로 소울 사기 5캐릭터 공용" checked={checked(t.id,c.id)} onChange={()=>toggle(t.id,c.id)}/><span aria-hidden="true">✓</span></label>
                : <span className={styles.sharedDash} aria-label={isEligibleSoul(c)?'공용 체크에 포함':'해당 없음'}>{isEligibleSoul(c)?'공용':'—'}</span>
              : <label className={styles.checkWrap}><input type="checkbox" aria-label={c.name+' '+t.name} checked={checked(t.id,c.id)} onChange={()=>toggle(t.id,c.id)}/><span aria-hidden="true">✓</span></label>}
          </td>)}</tr>)}
        </>)}</tbody>
        <tfoot><tr><th>완료</th>{data.characters.map(c=><td key={c.id}>{data.tasks.filter(t=>!isSharedSoul(t)&&checked(t.id,c.id)).length}/{data.tasks.filter(t=>!isSharedSoul(t)).length}</td>)}</tr></tfoot>
      </table></div>
    </section>
    <section className={styles.panel}><div className={styles.footerRow}><b>이번 주 체크 초기화</b><button onClick={()=>{if(window.confirm('이번 주 모든 캐릭터의 체크를 초기화할까요?'))update(d=>({...d,checks:{}}));}}>전체 체크 해제</button></div></section>
  </main>;
}
