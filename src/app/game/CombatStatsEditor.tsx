'use client';
import {type CombatStats,SIMPLE_STAT_FIELDS,screenshotStats,initialStats} from './combat-damage';
import ui from './combat-inputs.module.css';
export default function CombatStatsEditor({stats,onChange}:{stats:CombatStats;onChange:(stats:CombatStats)=>void}){
 return <details className={ui.accordion}>
  <summary className={ui.header}><span>현재 스탯 입력</span><span aria-hidden="true" className={ui.chevron}/></summary>
  <div className={ui.body}>
   <p className={ui.help}>게임 캐릭터 정보 화면에 표시되는 6개 능력치만 입력하세요.</p>
   <div className={ui.fieldGrid}>{SIMPLE_STAT_FIELDS.map(({key,label})=><label className={ui.field} key={key}>
    <span>{label}</span><input className={ui.control} aria-label={label} type="number" inputMode="decimal" min="0" step="any" value={stats[key]} onChange={e=>onChange({...stats,[key]:Math.max(0,Number(e.target.value)||0)})}/>
   </label>)}</div>
   <div className={ui.actions}>
    <button type="button" className={ui.button} onClick={()=>onChange(screenshotStats)}>스탯 예시 불러오기</button>
    <button type="button" className={ui.button} onClick={()=>onChange(initialStats)}>예시값 초기화</button>
   </div>
   <p className={ui.help}>미확인 피해 옵션은 기본 가정으로 처리되어 실제 DPS와 차이가 있을 수 있습니다.</p>
  </div>
 </details>;
}
