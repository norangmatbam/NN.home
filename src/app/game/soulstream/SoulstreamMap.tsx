'use client';
import { useEffect, useMemo, useState } from 'react';
import styles from './soulstream.module.css';
import bundled from './soulstream-data.json';

type Node = {sheet_id:number;node_number:number;name:string;node_type:string;x:number;y:number;previous_nodes:number[];next_nodes:number[];effect_summary:string;effect_data?:{tiers?:string[]};activating_time_minute:number;red_soul_cost:number;blue_soul_cost:number;yellow_soul_cost:number;recommend_sequence:number|null};
type Data = {meta?:{version?:string;node_count?:number};nodes:Node[];star_effects?:Record<string,unknown>;recommendations?:number[]};
const DATA_KEY='nn-soulstream-full-json-v1', STATE_KEY='nn-soulstream-progress-v2';
function parse(raw:string):Data{
 const d=JSON.parse(raw) as Data;
 if(!Array.isArray(d.nodes)||d.nodes.length!==283)throw Error('283개 노드의 원본 JSON이 필요합니다.');
 const ids=new Set(d.nodes.map(n=>n.sheet_id));
 if(ids.size!==283||!d.nodes.every(n=>typeof n.x==='number'&&typeof n.y==='number'&&typeof n.name==='string'&&typeof n.effect_summary==='string'&&typeof n.node_number==='number'&&typeof n.activating_time_minute==='number'&&typeof n.red_soul_cost==='number'&&typeof n.blue_soul_cost==='number'&&typeof n.yellow_soul_cost==='number'&&Array.isArray(n.previous_nodes)&&Array.isArray(n.next_nodes)))
 throw Error('원본 JSON에 좌표·효과·비용 등의 필수 정보가 빠져 있습니다. 요약본은 사용할 수 없습니다.');
 if(!d.nodes.every(n=>[...n.previous_nodes,...n.next_nodes].every(id=>ids.has(id))))throw Error('연결 노드 ID가 원본에 없습니다.');
 return d;
}
export default function SoulstreamMap(){
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const [selected,setSelected]=useState<number|null>(null),[query,setQuery]=useState(''),[filter,setFilter]=useState<'all'|'강타'|'연타'>('all');
 const [levels,setLevels]=useState<Record<number,number>>({}),[zoom,setZoom]=useState(1);
 useEffect(()=>{try{const p=localStorage.getItem(STATE_KEY);if(p)setLevels(JSON.parse(p));}catch{}; void refresh();},[]);
 async function refresh(){
  setLoading(true);setError('');
  try{
   let raw='';
   raw=JSON.stringify(bundled);
   if(!raw)raw=localStorage.getItem(DATA_KEY)||'';
   if(!raw)throw Error('자체 저장소의 전체 원본 JSON이 아직 등록되지 않았습니다. 아래 입력란에 원본을 붙여넣어 저장할 수 있습니다.');
   setData(parse(raw));
  }catch(e){setData(null);setError(e instanceof Error?e.message:'데이터 로드 실패');}
  finally{setLoading(false);}
 }
 function saveOriginal(raw:string){
  try{const parsed=parse(raw);localStorage.setItem(DATA_KEY,raw);setData(parsed);setError('');setSourceText('');}
  catch(e){setError(e instanceof Error?e.message:'원본 JSON 확인 실패');}
 }
 const [sourceText,setSourceText]=useState('');

 const nodes=useMemo(()=>data?.nodes||[],[data]),byId=useMemo(()=>new Map(nodes.map(n=>[n.sheet_id,n])),[nodes]);
 const picked=selected===null?null:byId.get(selected)||null;
 const active=nodes.filter(n=>(levels[n.sheet_id]||0)>0);
 const totals=active.reduce((s,n)=>{const level=levels[n.sheet_id]||0;return{r:s.r+n.red_soul_cost*level,b:s.b+n.blue_soul_cost*level,y:s.y+n.yellow_soul_cost*level,t:s.t+n.activating_time_minute}}, {r:0,b:0,y:0,t:0});
 const shown=nodes.filter(n=>(!query||(n.name+' '+n.effect_summary+' '+n.node_number).toLowerCase().includes(query.toLowerCase()))&&(filter==='all'||n.effect_summary.includes(filter)));
 const limits=useMemo(()=>{if(!nodes.length)return{x:-33,y:-33,w:66,h:66};const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y);const x=Math.min(...xs)-3,y=Math.min(...ys)-3;return{x,y,w:Math.max(...xs)-x+3,h:Math.max(...ys)-y+3};},[nodes]);
 const w=limits.w/zoom,h=limits.h/zoom,box=[limits.x+(limits.w-w)/2,-limits.y-limits.h+(limits.h-h)/2,w,h].join(' ');
 function setLevel(n:Node,next:number){
  if(next>0&&n.previous_nodes.some(id=>(levels[id]||0)===0)){setError('이전 노드를 먼저 연결해야 합니다.');return;}
  if(next===0&&n.next_nodes.some(id=>(levels[id]||0)>0)){setError('연결된 다음 노드를 먼저 해제해야 합니다.');return;}
  const update={...levels,[n.sheet_id]:next};setLevels(update);localStorage.setItem(STATE_KEY,JSON.stringify(update));setError('');
 }
 const fmt=(n:number)=>n.toLocaleString('ko-KR');
 return <main className={styles.wrap}>
 <header className={styles.heading}><h1>소울스트림 지도</h1><p>283개 노드의 실제 좌표와 연결 관계 · 강타/연타 검색 · 소울 및 시간 계산</p></header>
 <section className={styles.toolbar}><button onClick={()=>void refresh()} disabled={loading}>{loading?'자체 데이터 불러오는 중':'자체 데이터 새로고침'}</button></section>
 {error&&<p className={styles.notice} role="alert">{error}</p>}
 {!data?<section className={styles.notice}><strong>{loading?'자체 원본 데이터를 불러오는 중입니다.':'자체 원본 JSON이 아직 없습니다.'}</strong><p>외부 사이트에 데이터를 요청하지 않습니다. 사이트에 JSON이 등록되면 자동으로 지도가 표시됩니다.</p><textarea aria-label="소울스트림 원본 JSON 붙여넣기" value={sourceText} onChange={e=>setSourceText(e.target.value)} placeholder="전체 JSON을 여기에 붙여넣으세요" style={{width:'100%',minHeight:120,marginTop:12}}/><button onClick={()=>saveOriginal(sourceText)} disabled={!sourceText.trim()}>이 기기에 원본 저장</button></section>:<>
 <section className={styles.stats}>
 <div><small>전체 / 연결</small><strong>{nodes.length} / {active.length}</strong></div>
 <div><small><i className={styles.red}/>붉은 소울</small><strong>{fmt(totals.r)}</strong></div>
 <div><small><i className={styles.blue}/>푸른 소울</small><strong>{fmt(totals.b)}</strong></div>
 <div><small><i className={styles.yellow}/>노란 소울</small><strong>{fmt(totals.y)}</strong></div>
 <div><small>연결 시간 합계</small><strong>{fmt(totals.t)}분</strong></div>
 </section>
 <section className={styles.toolbar}>
 <input aria-label="노드 검색" placeholder="별 이름·효과 검색" value={query} onChange={e=>setQuery(e.target.value)}/>
 <button className={filter==='all'?styles.on:''} onClick={()=>setFilter('all')}>전체</button>
 <button className={filter==='강타'?styles.on:''} onClick={()=>setFilter('강타')}>강타</button>
 <button className={filter==='연타'?styles.on:''} onClick={()=>setFilter('연타')}>연타</button>
 <button onClick={()=>setZoom(z=>Math.min(3,z*1.25))}>＋</button><button onClick={()=>setZoom(z=>Math.max(.8,z/1.25))}>－</button><button onClick={()=>setZoom(1)}>전체 보기</button>
 </section>
 <div className={styles.layout}>
 <section className={styles.mapOuter}>
 <svg viewBox={box} style={{width:'100%',height:'min(75vh,720px)',minHeight:420,background:'radial-gradient(ellipse,#24385a,#061020)'}} aria-label="실제 좌표 기반 소울스트림 지도">
 {nodes.flatMap(n=>n.next_nodes.map(id=>{const t=byId.get(id);return t?<line key={n.sheet_id+'-'+id} x1={n.x} y1={-n.y} x2={t.x} y2={-t.y} stroke={levels[n.sheet_id]&&levels[id]?'#e7c27b':'#8494b1'} strokeWidth=".09" opacity=".8"/>:null;}))}
 {nodes.map(n=><g key={n.sheet_id} role="button" tabIndex={0} onClick={()=>setSelected(n.sheet_id)} onKeyDown={e=>{if(e.key==='Enter')setSelected(n.sheet_id)}} aria-label={n.name}>
 <path d={`M ${n.x-(n.node_type==='Star'?.46:.3)} ${-n.y} a ${n.node_type==='Star'?.46:.3} ${n.node_type==='Star'?.46:.3} 0 1 0 ${(n.node_type==='Star'?.46:.3)*2} 0 a ${n.node_type==='Star'?.46:.3} ${n.node_type==='Star'?.46:.3} 0 1 0 -${(n.node_type==='Star'?.46:.3)*2} 0`} stroke={selected===n.sheet_id?'#fff':'#28384e'} strokeWidth=".13" fill={levels[n.sheet_id]?'#e7bb6c':n.node_type==='Star'?'#bd93d9':'#a8c7e9'} opacity={filter==='all'||n.effect_summary.includes(filter)?1:.2}/>
 </g>)}
 </svg><p style={{color:'#c8d5ef',textAlign:'center',fontSize:12}}>노드를 터치해 선택하세요 · 전체 좌표는 원본 JSON 기준</p>
 </section>
 <aside className={styles.inspector}>
 {picked?<><div className={styles.inspectorTop}><span className={styles.kind}>{picked.node_type==='Star'?'항성':'왜성'}</span><span>#{picked.node_number}</span></div>
 <h2 style={{fontSize:19,margin:0}}>{picked.name||'에린'}</h2>
 <p style={{whiteSpace:'pre-line',fontSize:13,lineHeight:1.7}}>{picked.effect_summary||'시작 지점'}</p>
 {picked.effect_data?.tiers?.map((tier,i)=><div key={i} className={styles.detail}><b>{i+1}단계</b> · {tier}</div>)}
 <div className={styles.costGrid}><div>🔴 {picked.red_soul_cost}</div><div>🔵 {picked.blue_soul_cost}</div><div>🟡 {picked.yellow_soul_cost}</div></div>
 <p>활성화 시간: {picked.activating_time_minute}분</p>
 <div className={styles.levelTitle}><b>연결 상태</b><span>현재 Lv.{levels[picked.sheet_id]||0}</span></div>
 <div className={styles.levelButtons}>{Array.from({length:picked.node_type==='Star'?4:2},(_,i)=><button key={i} className={(levels[picked.sheet_id]||0)===i?styles.current:''} onClick={()=>setLevel(picked,i)}>{i===0?'미연결': 'Lv.'+i}</button>)}</div>
 <div className={styles.dep}><strong>선행 노드</strong>{picked.previous_nodes.map(id=><button key={id} onClick={()=>setSelected(id)}>{byId.get(id)?.name||'에린'}</button>)}</div>
 </>:<p>지도에서 별을 선택하세요.</p>}
 <h3 style={{fontSize:14}}>노드 목록 ({shown.length})</h3>
 <div style={{maxHeight:280,overflowY:'auto',display:'grid',gap:5}}>{shown.map(n=><button key={n.sheet_id} onClick={()=>setSelected(n.sheet_id)} style={{textAlign:'left',padding:'7px 9px',background:selected===n.sheet_id?'#e1ebf7':'#f6f8fd',border:'1px solid #dce4f2',borderRadius:8,color:'#223653'}}>{levels[n.sheet_id]?'✓ ':''}{n.name||'에린'} <small>· {n.effect_summary.split('\n')[0]}</small></button>)}</div>
 </aside></div></>}
 </main>;
}
