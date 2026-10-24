'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './soulstream.module.css';

type ColorCost = { red: number; blue: number; yellow: number };
type NodeKind = 'dwarf' | 'star';
type NodeData = { id: string; x: number; y: number; title: string; kind: NodeKind; cost: ColorCost | null; maxLevel: number; parents: string[]; category: '공통' | '강타' | '연타' | '생산'; confirmed?: boolean };
type Progress = Record<string, number>;
type Edits = Record<string, { title: string; cost: ColorCost | null; category: NodeData['category'] }>;
const KEY = 'nn-soulstream-map-v1';
const EMPTY: ColorCost = { red: 0, blue: 0, yellow: 0 };
const colors: (keyof ColorCost)[] = ['red', 'blue', 'yellow'];
const labels = { red: '빨강', blue: '파랑', yellow: '노랑' };
const add = (a: ColorCost, b: ColorCost): ColorCost => ({ red: a.red + b.red, blue: a.blue + b.blue, yellow: a.yellow + b.yellow });

// 원본 지도와 유사한 방사형 형태의 편집 가능한 초안.
// 확증되지 않은 노드의 수치/경로는 미확인으로 두어 실제 게임 데이터와 혼동되지 않도록 함.
function buildMap(): NodeData[] {
  const result: NodeData[] = [];
  const cx = 600, cy = 520;
  const dirs = [-90, -48, -16, 24, 65, 116, 156, 205];
  const hints: {title: string; category: NodeData['category']}[][] = [
    [{title:'힘 +12',category:'공통'},{title:'솜씨 +12',category:'공통'},{title:'지력 +12',category:'공통'},{title:'행운 +12',category:'공통'},{title:'노랑 소울 1개 생산시간',category:'생산'}],
    [{title:'공격력 +41',category:'공통'},{title:'공격력 항성',category:'공통'},{title:'모든 능력 항성',category:'공통'},{title:'강타 +15',category:'강타'},{title:'강타 항성',category:'강타'}],
    [{title:'공격력 +41',category:'공통'},{title:'강타 +15',category:'강타'},{title:'강타 항성',category:'강타'},{title:'스위 +15',category:'공통'},{title:'브레이크 항성',category:'공통'}],
    [{title:'공격력 +41',category:'공통'},{title:'연타 +15',category:'연타'},{title:'연타 항성',category:'연타'},{title:'추가타 +15',category:'공통'},{title:'빠른 시전 항성',category:'공통'}],
    [{title:'공격력 +41',category:'공통'},{title:'공격력 항성',category:'공통'},{title:'치명타 +15',category:'공통'},{title:'추가타 +15',category:'공통'},{title:'빠른 시전 항성',category:'공통'}],
    [{title:'공격력 +41',category:'공통'},{title:'공격력 항성',category:'공통'},{title:'모든 능력 항성',category:'공통'},{title:'연타 +15',category:'연타'},{title:'연타 항성',category:'연타'}],
    [{title:'공격력 +41',category:'공통'},{title:'브레이크 항성',category:'공통'},{title:'치명타 +15',category:'공통'},{title:'무방비 항성',category:'공통'},{title:'강타 피해 항성',category:'강타'}],
    [{title:'공격력 +41',category:'공통'},{title:'브레이크 항성',category:'공통'},{title:'치명타 +15',category:'공통'},{title:'연타 +15',category:'연타'},{title:'연타 피해 항성',category:'연타'}],
  ];
  dirs.forEach((deg, branch) => {
    const rad = deg * Math.PI / 180;
    const dx = Math.cos(rad), dy = Math.sin(rad);
    hints[branch].forEach((hint, step) => {
      const r = 88 + step * 90;
      const tangent = (step % 2 === 0 ? 1 : -1) * (branch % 2 === 0 ? 16 : 23);
      const id = 'n' + branch + '-' + step;
      const isStar = /항성|생산시간/.test(hint.title);
      result.push({
        id,
        x: Math.round(cx + dx * r - dy * tangent),
        y: Math.round(cy + dy * r + dx * tangent),
        title: hint.title,
        kind: isStar ? 'star' : 'dwarf',
        cost: branch === 0 && step === 4 ? {red:10,blue:10,yellow:10} : null,
        maxLevel: isStar ? 3 : 1,
        parents: branch === 0 && step === 4
          ? ['n0-0','n0-1','n0-2','n0-3']
          : step === 0 ? [] : ['n' + branch + '-' + (step - 1)],
        category: hint.category,
        confirmed: branch === 0 && step === 4,
      });
    });
  });
  return result;
}
const baseNodes = buildMap();
const normalize = (value: unknown) => Math.max(0, Math.min(99999, Math.floor(Number(value) || 0)));
function stored(): { progress: Progress; edits: Edits; mode: '강타' | '연타' } {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { progress:{}, edits:{}, mode:'강타' };
    const v = JSON.parse(raw);
    return { progress: v.progress && typeof v.progress === 'object' ? v.progress : {}, edits: v.edits && typeof v.edits === 'object' ? v.edits : {}, mode: v.mode === '연타' ? '연타' : '강타' };
  } catch { return {progress:{},edits:{},mode:'강타'}; }
}
export default function SoulstreamMap() {
  const [progress, setProgress] = useState<Progress>({});
  const [edits, setEdits] = useState<Edits>({});
  const [mode, setMode] = useState<'강타' | '연타'>('강타');
  const [selected, setSelected] = useState('n0-4');
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(70);
  const [showLabels, setShowLabels] = useState(true);
  useEffect(() => { const v=stored();setProgress(v.progress);setEdits(v.edits);setMode(v.mode);setReady(true); },[]);
  useEffect(() => { if(ready)try{localStorage.setItem(KEY,JSON.stringify({progress,edits,mode}));}catch{} },[progress,edits,mode,ready]);
  const nodes = useMemo(()=>baseNodes.map(n=>({...n,...(edits[n.id] || {})})),[edits]);
  const index = useMemo(()=>new Map(nodes.map(n=>[n.id,n])),[nodes]);
  const node = index.get(selected) || nodes[0];
  const level = (id: string) => Math.max(0,Math.min(3,normalize(progress[id])));
  const missing = node.parents.filter(id=>level(id)===0);
  const amount = { red:0,blue:0,yellow:0 };
  let unknown = 0;
  let connected = 0;
  nodes.forEach(n=>{
    const lv = level(n.id);
    if(lv){connected++;if(n.cost){const sum=add(amount,{red:n.cost.red*lv,blue:n.cost.blue*lv,yellow:n.cost.yellow*lv});Object.assign(amount,sum)}else unknown++;}
  });
  function changeLevel(next: number) {
    const safe = Math.max(0,Math.min(node.maxLevel,next));
    if(safe>0 && missing.length){window.alert('선행 노드를 먼저 연결해야 해요: '+missing.map(id=>index.get(id)?.title).join(', '));return;}
    if(safe===0 && nodes.some(n=>level(n.id)>0 && n.parents.includes(node.id))){window.alert('이 노드를 필요로 하는 연결된 후속 노드를 먼저 해제해 주세요.');return;}
    setProgress(p=>({...p,[node.id]:safe}));
  }
  function editTitle(v:string){setEdits(e=>({...e,[node.id]:{title:v,cost:node.cost,category:node.category}}));}
  function editCategory(v:NodeData['category']){setEdits(e=>({...e,[node.id]:{title:node.title,cost:node.cost,category:v}}));}
  function editCost(k:keyof ColorCost,v:string){setEdits(e=>({...e,[node.id]:{title:node.title,category:node.category,cost:{...(node.cost||EMPTY),[k]:normalize(v)}}}));}
  const relevance=(n:NodeData)=>n.category===mode?'important':n.category==='공통'||n.category==='생산'?'normal':'muted';
  return <main className={styles.wrap}>
    <header className={styles.heading}>
      <div><h1>소울스트림 지도</h1><p>노드를 선택해 연결·강화 상태를 기록하고, 강타/연타 관심 노드를 구분할 수 있어요.</p></div>
    </header>
    <div className={styles.notice}><strong>지도 데이터 입력 단계</strong> · 원본의 방사형 위치를 참고한 편집형 초안입니다. 실제 노드 좌표·연결선·비용은 미검증이며, 확인된 항성 외에는 비용을 직접 입력해야 정확한 합산이 가능합니다.</div>
    <section className={styles.toolbar}>
      <div className={styles.mode}><b>전투 유형</b><button type="button" aria-pressed={mode==='강타'} className={mode==='강타'?styles.on:''} onClick={()=>setMode('강타')}>강타</button><button type="button" aria-pressed={mode==='연타'} className={mode==='연타'?styles.on:''} onClick={()=>setMode('연타')}>연타</button></div>
      <div className={styles.zoom}><b>지도 크기</b><button onClick={()=>setScale(s=>Math.max(45,s-10))}>−</button><span>{scale}%</span><button onClick={()=>setScale(s=>Math.min(150,s+10))}>+</button></div>
      <label className={styles.labelToggle}><input type="checkbox" checked={showLabels} onChange={e=>setShowLabels(e.target.checked)}/> 이름 표시</label>
    </section>
    <section className={styles.stats}>
      <div><small>연결한 노드</small><strong>{connected} / {nodes.length}</strong></div>
      {colors.map(k=><div key={k}><small><i className={styles[k]}/> {labels[k]} 사용량</small><strong>{amount[k].toLocaleString()}개</strong></div>)}
    </section>
    {unknown>0 && <p className={styles.warn}>연결한 노드 중 {unknown}개의 소울 비용이 미입력 상태예요. 위 합계에는 해당 비용이 제외돼 있어요.</p>}
    <div className={styles.layout}>
      <section className={styles.mapOuter} aria-label="소울스트림 노드 지도">
        <div className={styles.mapScroller}>
          <div className={styles.mapCanvas} style={{width:1200*scale/100,height:1040*scale/100}}>
            <div className={styles.mapInner} style={{width:1200,height:1040,transform:`scale(${scale/100})`}}>
              <svg className={styles.lines} width="1200" height="1040" viewBox="0 0 1200 1040" aria-hidden="true">
                {nodes.map(n=>n.parents.map(pid=>{const p=index.get(pid);return p?<line key={pid+'-'+n.id} x1={p.x} y1={p.y} x2={n.x} y2={n.y} stroke={level(pid)>0 && level(n.id)>0?'#68dfbd':'#607392'} strokeWidth={level(pid)>0&&level(n.id)>0?2.6:1.15}/>:null}))}
                {nodes.filter(n=>n.parents.length===0).map(n=><line key={'root-'+n.id} x1={600} y1={520} x2={n.x} y2={n.y} stroke="#607392" strokeWidth="1.15"/>)}
              </svg>
              <div className={styles.root} style={{left:600,top:520}}>✦</div>
              {nodes.map(n=><button type="button" key={n.id} title={n.title} className={[styles.mapNode,n.kind==='star'?styles.star:styles.dwarf,selected===n.id?styles.selected:'',level(n.id)?styles.active:'',relevance(n)==='important'?styles.important:relevance(n)==='muted'?styles.dim:''].join(' ')} style={{left:n.x,top:n.y}} onClick={()=>setSelected(n.id)} aria-label={n.title+' '+(level(n.id)?'레벨 '+level(n.id):'미연결')}>
                <span className={styles.dot}>{n.kind==='star'?'✧':''}</span>
                {showLabels&&<span className={styles.nodeName}>{n.title}{level(n.id)>0&&n.kind==='star'?' Lv.'+level(n.id):''}</span>}
              </button>)}
            </div>
          </div>
        </div>
      </section>
      <aside className={styles.inspector}>
        <div className={styles.inspectorTop}><span className={styles.kind}>{node.kind==='star'?'항성':'왜성'}</span><span>{node.confirmed?'소울 비용 확인됨':'지도 위치·비용 검증 필요'}</span></div>
        <label className={styles.field}>노드 이름<input value={node.title} onChange={e=>editTitle(e.target.value)}/></label>
        <label className={styles.field}>분류<select value={node.category} onChange={e=>editCategory(e.target.value as NodeData['category'])}>{['공통','강타','연타','생산'].map(x=><option key={x}>{x}</option>)}</select></label>
        <div className={styles.costTitle}><b>단계당 소울 비용</b><small>{node.cost?'항성은 레벨마다 동일 비용':'미입력 (합산 제외)'}</small></div>
        <div className={styles.costGrid}>{colors.map(k=><label key={k}><span><i className={styles[k]}/>{labels[k]}</span><input inputMode="numeric" type="number" min="0" placeholder="미확인" value={node.cost?.[k]??''} onChange={e=>editCost(k,e.target.value)}/></label>)}</div>
        <div className={styles.levelTitle}><b>연결·강화</b><span>Lv.{level(node.id)} / {node.maxLevel}</span></div>
        <div className={styles.levelButtons}>{Array.from({length:node.maxLevel+1},(_,i)=><button key={i} className={level(node.id)===i?styles.current:''} onClick={()=>changeLevel(i)}>{i===0?'미연결':'Lv.'+i}</button>)}</div>
        <div className={styles.dep}><strong>선행 노드</strong>{node.parents.length?node.parents.map(id=><button key={id} onClick={()=>setSelected(id)} className={level(id)?styles.done:''}>{level(id)?'✓ ':'○ '}{index.get(id)?.title}</button>):<p>시작 지점에서 연결되는 첫 노드</p>}</div>
        {node.cost&&<p className={styles.detail}>현재 이 노드에 투자한 소울: 빨강 {node.cost.red*level(node.id)} · 파랑 {node.cost.blue*level(node.id)} · 노랑 {node.cost.yellow*level(node.id)}</p>}
        <button className={styles.reset} onClick={()=>{if(window.confirm('소울스트림 연결 상태를 모두 초기화할까요? 노드 이름/비용 편집은 유지됩니다.'))setProgress({});}}>연결 상태 초기화</button>
      </aside>
    </div>
    <p className={styles.footerNote}>추천 기준 안내: 강타/연타 선택은 관련 노드 강조에만 적용됩니다. 직업별 DPS 효율 및 실제 최단 소울 경로는 검증된 전체 지도 데이터가 입력된 뒤 계산할 수 있습니다.</p>
  </main>;
}
