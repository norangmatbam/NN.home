'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './soulstream.module.css';
import bundled from './soulstream-data.json';

type Node = {sheet_id:number;node_number:number;name:string;node_type:string;x:number;y:number;previous_nodes:number[];next_nodes:number[];effect_summary:string;effect_data?:{tiers?:string[]};activating_time_minute:number;red_soul_cost:number;blue_soul_cost:number;yellow_soul_cost:number;recommend_sequence:number|null};
type Data = {meta?:{version?:string;node_count?:number};nodes:Node[];star_effects?:Record<string,unknown>;recommendations?:number[]};
const STATE_KEY='nn-soulstream-progress-v2';
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
 const [data]=useState<Data|null>(()=>parse(JSON.stringify(bundled))),[error,setError]=useState('');
 const [selected,setSelected]=useState<number|null>(null),[query,setQuery]=useState(''),[filter,setFilter]=useState<'all'|'강타'|'연타'>('all');
 const [levels,setLevels]=useState<Record<number,number>>({}),[zoom,setZoom]=useState(1);
 const canvasRef=useRef<HTMLCanvasElement|null>(null);
 const panRef=useRef({x:0,y:0,startX:0,startY:0,downX:0,downY:0,moved:false});
 const gestureRef=useRef<{points:Map<number,{x:number;y:number}>;distance:number;startZoom:number;startPan:{x:number;y:number};startCenter:{x:number;y:number}}>({points:new Map(),distance:0,startZoom:1,startPan:{x:0,y:0},startCenter:{x:0,y:0}});
 const suppressClickRef=useRef(false);
 const [pan,setPan]=useState({x:0,y:0});
 useEffect(()=>{try{const p=localStorage.getItem(STATE_KEY);if(p)setLevels(JSON.parse(p));}catch{}},[]);
 const nodes=useMemo(()=>data?.nodes||[],[data]),byId=useMemo(()=>new Map(nodes.map(n=>[n.sheet_id,n])),[nodes]);
 const picked=selected===null?null:byId.get(selected)||null;
 const active=nodes.filter(n=>(levels[n.sheet_id]||0)>0);
 const totals=active.reduce((s,n)=>{const level=levels[n.sheet_id]||0;return{r:s.r+n.red_soul_cost*level,b:s.b+n.blue_soul_cost*level,y:s.y+n.yellow_soul_cost*level,t:s.t+n.activating_time_minute}}, {r:0,b:0,y:0,t:0});
 const shown=nodes.filter(n=>(!query||(n.name+' '+n.effect_summary+' '+n.node_number).toLowerCase().includes(query.toLowerCase()))&&(filter==='all'||n.effect_summary.includes(filter)));
 const limits=useMemo(()=>{if(!nodes.length)return{x:-33,y:-33,w:66,h:66};const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y);const x=Math.min(...xs),y=Math.min(...ys);return{x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y};},[nodes]);

 const mapPosition=(n:Node,width:number,height:number)=>{
  const padding=12;const scale=Math.min((width-padding*2)/limits.w,(height-padding*2)/limits.h)*zoom;
  return {x:width/2+((n.x-limits.x)-limits.w/2)*scale+pan.x,y:height/2-((n.y-limits.y)-limits.h/2)*scale+pan.y,scale};
 };
 useEffect(()=>{
  const canvas=canvasRef.current;if(!canvas)return;
  const paint=()=>{
   const bounds=canvas.getBoundingClientRect();const width=bounds.width,height=bounds.height;if(!width||!height)return;
   const dpr=Math.min(window.devicePixelRatio||1,2);
   canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
   const ctx=canvas.getContext('2d');if(!ctx)return;
   ctx.setTransform(dpr,0,0,dpr,0,0);
   ctx.clearRect(0,0,width,height); // Transparent canvas: CSS paints the navy gradient.
   for(const n of nodes){const p=mapPosition(n,width,height);
    for(const id of n.next_nodes){const t=byId.get(id);if(!t)continue;const q=mapPosition(t,width,height);
     ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle=levels[n.sheet_id]&&levels[id]?'#eac67c':'#8295b4';ctx.lineWidth=1.25;ctx.globalAlpha=.75;ctx.stroke();
    }
   }
   ctx.globalAlpha=1;
   for(const n of nodes){const p=mapPosition(n,width,height);const major=n.node_type==='Star';const root=n.node_type==='Erinn';
    const radius=root?3.6:major?4.3:2.35;ctx.globalAlpha=filter==='all'||n.effect_summary.includes(filter)?1:.24;
    ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);
    ctx.fillStyle=levels[n.sheet_id]?'#e7bb6c':root?'#8fd4bc':major?'#bd93d9':'#a8c7e9';ctx.fill();
    ctx.strokeStyle=selected===n.sheet_id?'#ffdc73':'#273b58';ctx.lineWidth=selected===n.sheet_id?2.7:1.5;ctx.stroke();
    if(selected===n.sheet_id){ctx.beginPath();ctx.arc(p.x,p.y,radius+2.8,0,Math.PI*2);ctx.strokeStyle='#ffdc73';ctx.lineWidth=1;ctx.stroke();}
   }
   ctx.globalAlpha=1;
  };
  paint();const resize=new ResizeObserver(paint);resize.observe(canvas);return()=>resize.disconnect();
 },[nodes,byId,limits,zoom,pan,levels,filter,selected]);
 function onCanvasClick(e:React.MouseEvent<HTMLCanvasElement>){
  if(panRef.current.moved||suppressClickRef.current){panRef.current.moved=false;suppressClickRef.current=false;return;}
  const el=canvasRef.current;if(!el)return;const rect=el.getBoundingClientRect();
  const x=e.clientX-rect.left,y=e.clientY-rect.top;
  let best:Node|null=null,dist=Infinity;
  for(const n of nodes){const p=mapPosition(n,rect.width,rect.height);const d=Math.hypot(x-p.x,y-p.y);if(d<dist){dist=d;best=n;}}
  if(best&&dist<22)setSelected(best.sheet_id);
 }
 function onPointerDown(e:React.PointerEvent<HTMLCanvasElement>){
  e.currentTarget.setPointerCapture(e.pointerId);
  const g=gestureRef.current;
  g.points.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(g.points.size===1){
   panRef.current={...panRef.current,startX:pan.x,startY:pan.y,downX:e.clientX,downY:e.clientY,moved:false};
  }else if(g.points.size===2){
   const [a,b]=Array.from(g.points.values());
   const rect=e.currentTarget.getBoundingClientRect();
   g.distance=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));
   g.startZoom=zoom;
   g.startPan={...pan};
   g.startCenter={x:(a.x+b.x)/2-rect.left,y:(a.y+b.y)/2-rect.top};
   panRef.current.moved=true;
   suppressClickRef.current=true;
  }
 }
 function onPointerMove(e:React.PointerEvent<HTMLCanvasElement>){
  const g=gestureRef.current;
  if(!g.points.has(e.pointerId))return;
  g.points.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(g.points.size>=2){
   const [a,b]=Array.from(g.points.values());
   const rect=e.currentTarget.getBoundingClientRect();
   const center={x:(a.x+b.x)/2-rect.left,y:(a.y+b.y)/2-rect.top};
   const distance=Math.hypot(a.x-b.x,a.y-b.y);
   const nextZoom=Math.max(.8,Math.min(5,g.startZoom*distance/g.distance));
   const ratio=nextZoom/g.startZoom;
   setZoom(nextZoom);
   setPan({x:center.x-rect.width/2-(g.startCenter.x-rect.width/2-g.startPan.x)*ratio,y:center.y-rect.height/2-(g.startCenter.y-rect.height/2-g.startPan.y)*ratio});
   panRef.current.moved=true;
   suppressClickRef.current=true;
  }else{
   const dx=e.clientX-panRef.current.downX,dy=e.clientY-panRef.current.downY;
   if(Math.abs(dx)+Math.abs(dy)>5)panRef.current.moved=true;
   if(panRef.current.moved){setPan({x:panRef.current.startX+dx,y:panRef.current.startY+dy});suppressClickRef.current=true;}
  }
 }
 function onPointerEnd(e:React.PointerEvent<HTMLCanvasElement>){
  const g=gestureRef.current;
  const wasPinching=g.points.size>=2;
  g.points.delete(e.pointerId);
  if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  if(wasPinching){panRef.current.moved=true;suppressClickRef.current=true;}
  if(g.points.size===1){
   const remaining=Array.from(g.points.values())[0];
   panRef.current={...panRef.current,startX:pan.x,startY:pan.y,downX:remaining.x,downY:remaining.y,moved:wasPinching};
  }
  if(g.points.size===0)g.distance=0;
 }
  function setLevel(n:Node,next:number){
  if(next>0&&n.previous_nodes.some(id=>(levels[id]||0)===0)){setError('이전 노드를 먼저 연결해야 합니다.');return;}
  if(next===0&&n.next_nodes.some(id=>(levels[id]||0)>0)){setError('연결된 다음 노드를 먼저 해제해야 합니다.');return;}
  const update={...levels,[n.sheet_id]:next};setLevels(update);localStorage.setItem(STATE_KEY,JSON.stringify(update));setError('');
 }
 function connectPrerequisites(target:Node){
  // Only activate missing ancestors. Never change the selected star's level.
  const ancestors=new Set<number>();
  const visiting=new Set<number>();
  const collect=(id:number)=>{
   if(ancestors.has(id))return;
   if(visiting.has(id))throw Error('선행 노드 연결에 순환이 있습니다.');
   const node=byId.get(id);
   if(!node)throw Error('선행 노드 정보를 찾을 수 없습니다.');
   visiting.add(id);
   node.previous_nodes.forEach(collect);
   visiting.delete(id);
   if(id!==target.sheet_id)ancestors.add(id);
  };
  try{
   target.previous_nodes.forEach(collect);
   const update={...levels};
   let added=0;
   for(const id of ancestors){
    if((update[id]||0)===0){update[id]=1;added++;}
   }
   // Preserve the target's current level (including Lv.0) and any upgraded ancestors.
   setLevels(update);
   localStorage.setItem(STATE_KEY,JSON.stringify(update));
   setError(added>0?`선행 노드 ${added}개를 Lv.1로 연결했습니다. 기존 노드 레벨은 유지됩니다.`:'모든 선행 노드가 이미 연결되어 있습니다. 기존 레벨을 유지했습니다.');
  }catch(e){setError(e instanceof Error?e.message:'자동 연결 중 오류가 발생했습니다.');}
 }

 type CombatType='강타'|'연타';
 type RecommendationMode='single'|'route';
 const [combatType,setCombatType]=useState<CombatType>('강타');
 const [recommendMode,setRecommendMode]=useState<RecommendationMode>('route');
 const [showRecommendations,setShowRecommendations]=useState(true);
 const recommendations=useMemo(()=>{
  // Heuristic relative scores (not measured DPS). Same weights across both views.
  const attackWeight=1.0,allStatWeight=.88;
  const score=(n:Node,lv:number)=>{
   const t=n.effect_summary;
   const detail=n.effect_data?.tiers?.[Math.max(0,lv-1)]||t;
   const first=detail.split('\n')[0];
   const effect=t+' '+first;
   const isMajor=n.node_type==='Star';
   let score=0;
   if(/공격력\s*\+/.test(effect))score=attackWeight;
   else if(/모든 능력치\s*\+/.test(effect))score=allStatWeight;
   else if(/강타 강화\s*\+/.test(effect))score=combatType==='강타'?.72:.09;
   else if(/연타 강화\s*\+/.test(effect))score=combatType==='연타'?.72:.09;
   else if(/브레이크\s*\+/.test(effect))score=.61;
   else if(/치명타\s*\+/.test(effect))score=.55;
   else if(/스킬 위력\s*\+/.test(effect))score=.53;
   else if(/빠른 스킬\s*\+/.test(effect))score=.45;
   else if(/강타 피해/.test(effect))score=combatType==='강타'?.52:.04;
   else if(/연타 피해/.test(effect))score=combatType==='연타'?.52:.04;
   else if(/무방비 피해/.test(effect))score=.4;
   else if(/추가타\s*\+/.test(effect))score=.38;
   else if(/궁극기/.test(effect))score=.32;
   else if(/힘\s*\+|솜씨\s*\+|지력\s*\+|행운\s*\+|의지\s*\+/.test(effect))score=.29;
   else return 0;
   // Tier progression is diminishing returns; Lv.1 is usually more efficient.
   if(isMajor)score*=lv===1?1:lv===2?.46:.35;
   return score;
  };
  const unitCost=(n:Node)=>n.red_soul_cost+n.blue_soul_cost+n.yellow_soul_cost;
  const collectMissing=(n:Node)=>{
   const seen=new Set<number>(),stack=new Set<number>(),missing:Node[]=[];
   const visit=(id:number)=>{
    if(seen.has(id))return;
    if(stack.has(id))throw Error('선행 경로에 순환이 있습니다.');
    const v=byId.get(id);if(!v)return;
    stack.add(id);v.previous_nodes.forEach(visit);stack.delete(id);seen.add(id);
    if((levels[id]||0)===0)missing.push(v);
   };
   n.previous_nodes.forEach(visit);
   return missing;
  };
  return nodes.flatMap(n=>{
   if(n.node_type==='Erinn')return [];
   const lv=levels[n.sheet_id]||0,next=lv+1,max=n.node_type==='Star'?3:1;
   if(next>max)return [];
   const gain=score(n,next);
   if(gain<=0)return [];
   const cost=unitCost(n);
   if(!cost)return [];
   let missing:Node[]=[];
   try{missing=lv===0?collectMissing(n):[];}catch{return [];}
   const routeCost=cost+missing.reduce((sum,v)=>sum+unitCost(v),0);
   return [{node:n,next,gain,cost,routeCost,additional:missing.length,singleEfficiency:gain/cost,routeEfficiency:gain/routeCost}];
  }).sort((a,b)=>(recommendMode==='single'?b.singleEfficiency-a.singleEfficiency:b.routeEfficiency-a.routeEfficiency)||a.routeCost-b.routeCost).slice(0,12);
 },[nodes,byId,levels,combatType,recommendMode]);

 const fmt=(n:number)=>n.toLocaleString('ko-KR');
 return <main className={styles.wrap}>
 <header className={styles.heading}><h1>소울스트림 지도</h1><p>283개 노드의 실제 좌표와 연결 관계 · 강타/연타 검색 · 소울 및 시간 계산</p></header>

 {error&&<p className={styles.notice} role="alert">{error}</p>}
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
 <button onClick={()=>setZoom(z=>Math.min(3,z*1.25))}>＋</button><button onClick={()=>setZoom(z=>Math.max(.8,z/1.25))}>－</button><button onClick={()=>{setZoom(1);setPan({x:0,y:0});}}>전체 보기</button>
 </section>

 <section className={styles.recommendPanel}>
  <div className={styles.recommendHeading}>
   <div><h2>전투 소울 추천</h2><p>현재 연결 상태 기준 · 직군별 상대 점수 · DPS 실측값이 아닌 참고용 우선순위</p></div>
   <button onClick={()=>setShowRecommendations(v=>!v)}>{showRecommendations?'접기':'추천 보기'}</button>
  </div>
  {showRecommendations&&<>
   <div className={styles.recommendControls}>
    <div><b>직군</b><button className={combatType==='강타'?styles.recommendActive:''} onClick={()=>setCombatType('강타')}>강타 직군</button><button className={combatType==='연타'?styles.recommendActive:''} onClick={()=>setCombatType('연타')}>연타 직군</button></div>
    <div><b>추천 방식</b><button className={recommendMode==='single'?styles.recommendActive:''} onClick={()=>setRecommendMode('single')}>단일 노드 효율</button><button className={recommendMode==='route'?styles.recommendActive:''} onClick={()=>setRecommendMode('route')}>선행 경로 포함 효율</button></div>
   </div>
   <p className={styles.recommendInfo}>{recommendMode==='single'?'대상 노드의 다음 1단계 투자 비용만 반영합니다. 실제 이동 경로 비용은 제외합니다.':'미연결 선행 노드를 모두 Lv.1로 연결하는 비용과 대상 노드의 다음 1단계 비용을 합산합니다.'} 붉은·푸른·노란 소울은 동일한 1개 단위로 합산합니다. 효과별 가중치는 참고용이며 직업별 실제 DPS·속성 차이와 소울 수급 편차는 미반영입니다.</p>
   <div className={styles.recommendList}>
    {recommendations.map((item,index)=><button key={item.node.sheet_id} onClick={()=>setSelected(item.node.sheet_id)} className={styles.recommendItem}>
     <span className={styles.recommendRank}>{index+1}</span>
     <span className={styles.recommendItemMain}><strong>{item.node.name}</strong><small>{item.node.effect_summary.split('\\n')[0]} · Lv.{item.next} {item.additional>0?`· 선행 미연결 ${item.additional}개`:''}</small></span>
     <span className={styles.recommendItemCost}><strong>{recommendMode==='single'?item.cost:item.routeCost} 소울</strong><small>상대점수/소울 {((recommendMode==='single'?item.singleEfficiency:item.routeEfficiency)*100).toFixed(2)}</small></span>
    </button>)}
   </div>
  </>}
 </section>
 <div className={styles.layout}>
 <section className={styles.mapOuter}>
 <canvas ref={canvasRef} onClick={onCanvasClick} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} aria-label="소울스트림 노드 지도" className={styles.liveCanvas}/><p style={{color:'#c8d5ef',textAlign:'center',fontSize:12}}>한 손가락으로 이동 · 두 손가락으로 확대·축소 · 노드를 터치해 선택</p>
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
 <div className={styles.dep}><strong>선행 노드</strong><div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8,marginTop:8}}>{picked.previous_nodes.length>0&&<button type="button" onClick={()=>connectPrerequisites(picked)} style={{background:'#e8f3fa',border:'1px solid #87b6d4',color:'#194b69',fontWeight:700}}>선행 노드 모두 연결</button>}{picked.previous_nodes.map(id=><button key={id} onClick={()=>setSelected(id)}>{byId.get(id)?.name||'에린'}</button>)}</div></div>
 </>:<p>지도에서 별을 선택하세요.</p>}
 <h3 style={{fontSize:14}}>노드 목록 ({shown.length})</h3>
 <div style={{maxHeight:280,overflowY:'auto',display:'grid',gap:5}}>{shown.map(n=><button key={n.sheet_id} onClick={()=>setSelected(n.sheet_id)} style={{textAlign:'left',padding:'7px 9px',background:selected===n.sheet_id?'#e1ebf7':'#f6f8fd',border:'1px solid #dce4f2',borderRadius:8,color:'#223653'}}>{levels[n.sheet_id]?'✓ ':''}{n.name||'에린'} <small>· {n.effect_summary.split('\n')[0]}</small></button>)}</div>
 </aside></div>
 </main>;
}
