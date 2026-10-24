'use client';
import {useEffect,useState} from 'react';
import {RUNE_CATALOG,type EquippedRune,type RuneSlot} from './equipped-runes';
import ui from './combat-inputs.module.css';
const KEY='nn-combat-equipped-runes-v1';
export function useEquippedRunes(){
 const [equipped,setEquipped]=useState<EquippedRune[]>([]);
 useEffect(()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(v))setEquipped(v.filter(x=>RUNE_CATALOG.some(r=>r.name===x.name&&r.slot===x.slot)&&x.tier>=0&&x.tier<=2).map(x=>RUNE_CATALOG.find(r=>r.name===x.name&&r.slot===x.slot)?.rarity==='신화'?{...x,tier:0}:x));}catch{}},[]);
 const update=(v:EquippedRune[])=>{setEquipped(v);localStorage.setItem(KEY,JSON.stringify(v));};
 return {equipped,update};
}
const BONUS_LABELS:Record<string,string>={damageIncrease:'피해 증가',skillDamage:'스킬 피해',strikeDamage:'강타 피해',multiDamage:'연타 피해',critDamage:'치명타 피해',critChance:'치명타 확률',extraChance:'추가타 확률'};
export default function EquippedRunesEditor({equipped,onChange}:{equipped:EquippedRune[];onChange:(v:EquippedRune[])=>void}){
 const slots:RuneSlot[]=['무기','방어구','엠블럼'];
 return <details className={ui.accordion}>
  <summary className={ui.header}><span>현재 장착 룬 ({equipped.length}개)</span><span className={ui.chevron} aria-hidden="true"/></summary>
  <div className={ui.body}>
   <p className={ui.help}>상시 피해 배율만 자동 적용합니다. 조건부 효과와 미확인 수치는 상세 설명에서 확인할 수 있어요.</p>
   {slots.map(slot=><section className={ui.group} key={slot}>
    <div className={ui.groupHeader}><strong>{slot}</strong><span>{equipped.filter(x=>x.slot===slot).length}개 선택</span></div>
    {equipped.filter(x=>x.slot===slot).map((r,i)=>{
     const data=RUNE_CATALOG.find(x=>x.slot===r.slot&&x.name===r.name);
     if(!data)return null;
     return <div className={ui.runeCard} key={slot+r.name+i}>
      <div className={ui.runeControls}>
       <select className={ui.control} aria-label={slot+' 룬 선택'} value={r.name} onChange={e=>onChange(equipped.map(x=>x===r?{...x,name:e.target.value,tier:0}:x))}>
        {RUNE_CATALOG.filter(x=>x.slot===slot).sort((a,b)=>a.name.localeCompare(b.name,'ko')).map(x=><option key={x.name} value={x.name}>{x.name}</option>)}
       </select>
       {data.rarity==='신화'?<span className={ui.pill} style={{alignSelf:'center',textAlign:'center'}}>신화 · 초월 불가</span>:<select className={ui.control} aria-label={r.name+' 초월 단계'} value={r.tier} onChange={e=>onChange(equipped.map(x=>x===r?{...x,tier:Number(e.target.value)}:x))}>
        {[0,1,2].map(t=><option key={t} value={t}>{t}초월</option>)}
       </select>}
      </div>
      <div className={ui.runeMeta}>
       <span className={ui.pill}>{data.tiers[r.tier]==null?'자동 환산 보류':BONUS_LABELS[data.bonus]+' +'+data.tiers[r.tier]+'%'}</span>
       <button type="button" className={ui.button+' '+ui.danger} onClick={()=>onChange(equipped.filter(x=>x!==r))}>삭제</button>
      </div>
      {(data.description||data.note)&&<details className={ui.detail}><summary>룬 효과 자세히 보기</summary><p>{data.description||data.note}</p></details>}
     </div>;
    })}
    <button type="button" className={ui.button} style={{justifySelf:'start'}} onClick={()=>{
     const free=RUNE_CATALOG.find(x=>x.slot===slot&&!equipped.some(y=>y.slot===slot&&y.name===x.name));
     if(free)onChange([...equipped,{slot,name:free.name,tier:0}]);
    }}>+ {slot} 룬 추가</button>
   </section>)}
   <p className={ui.help}>현재 시즌2 무기·방어구·엠블럼 89종 지원. 장신구 및 일부 조건부 효과는 자동 환산에 포함되지 않습니다.</p>
  </div>
 </details>;
}
