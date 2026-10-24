'use client';
import {type CombatStats,SIMPLE_STAT_FIELDS,screenshotStats,initialStats} from './combat-damage';

export default function CombatStatsEditor({stats,onChange}:{stats:CombatStats;onChange:(stats:CombatStats)=>void}){
 const render=(fields:typeof SIMPLE_STAT_FIELDS)=>fields.map(({key,label})=><label key={key} style={{display:'grid',gap:4,fontSize:12,minWidth:0}}>
  <span>{label}</span>
  <input aria-label={label} type="number" inputMode="decimal" min="0" step="any" value={stats[key]}
   onChange={e=>onChange({...stats,[key]:Math.max(0,Number(e.target.value)||0)})}
   style={{width:'100%',minWidth:0,boxSizing:'border-box',border:'1px solid #b9c7d8',borderRadius:8,padding:'9px 7px',background:'#fff',color:'#263649'}}/>
 </label>);
 return <div style={{display:'grid',gap:9}}>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(105px,1fr))',gap:8}}>{render(SIMPLE_STAT_FIELDS)}</div>
  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
   <button type="button" onClick={()=>onChange(screenshotStats)}>보내준 스탯 화면 값 넣기</button>
   <button type="button" onClick={()=>onChange(initialStats)}>예시값 초기화</button>
  </div>
  <small style={{opacity:.8}}>게임의 캐릭터 정보에서 확인되는 6개 전투 능력치만 입력해도 됩니다. 확인할 수 없는 상세 피해 옵션 입력은 요구하지 않습니다. 이미지 값 버튼은 현재 제공한 스크린샷의 수치를 입력합니다. 미확인 옵션은 기본 가정으로 계산되므로 실제 DPS와 차이가 날 수 있습니다.</small>
 </div>;
}
