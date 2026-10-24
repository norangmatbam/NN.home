'use client';
import {useEffect,useState} from 'react';
import {RUNE_CATALOG,type EquippedRune,type RuneSlot} from './equipped-runes';
const KEY='nn-combat-equipped-runes-v1';
export function useEquippedRunes(){
 const [equipped,setEquipped]=useState<EquippedRune[]>([]);
 useEffect(()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(v))setEquipped(v.filter(x=>RUNE_CATALOG.some(r=>r.name===x.name&&r.slot===x.slot)&&x.tier>=0&&x.tier<=2));}catch{}},[]);
 const update=(v:EquippedRune[])=>{setEquipped(v);localStorage.setItem(KEY,JSON.stringify(v));};
 return {equipped,update};
}
export default function EquippedRunesEditor({equipped,onChange}:{equipped:EquippedRune[];onChange:(v:EquippedRune[])=>void}){
 const slots:RuneSlot[]=['무기','방어구','엠블럼'];
 return <details>
 <summary>현재 장착 룬 ({equipped.length}개)</summary>
 <p>시즌2 종합 시트의 무기·방어구·엠블럼 룬 89종을 선택할 수 있습니다. 상시 피해 배율만 자동 적용하고, 조건부·초월 수치가 불분명한 룬은 효과 설명만 표시합니다. 장신구 룬은 해당 자료에 없어 별도 등록이 필요합니다.</p>
 {slots.map(slot=><section key={slot}>
 <strong>{slot}</strong>
 {equipped.filter(r=>r.slot===slot).map((r,i)=>{
 const data=RUNE_CATALOG.find(x=>x.slot===r.slot&&x.name===r.name)!;
 return <div key={slot+i}>
 <select aria-label={slot+' 룬'} value={r.name} onChange={e=>onChange(equipped.map(x=>x===r?{...x,name:e.target.value,tier:0}:x))}>{RUNE_CATALOG.filter(x=>x.slot===slot).map(x=><option key={x.name} value={x.name}>{x.name}</option>)}</select>
 <select aria-label="초월 단계" value={r.tier} onChange={e=>onChange(equipped.map(x=>x===r?{...x,tier:Number(e.target.value)}:x))}>{[0,1,2].map(t=><option key={t} value={t}>{t}초월 {data.tiers[t]==null?'(수치 미확인)':''}</option>)}</select>
 <small>{data.tiers[r.tier]==null?'자동 환산 보류':data.tiers[r.tier]+'% 적용'} · {({damageIncrease:'피해 증가',skillDamage:'스킬 피해',strikeDamage:'강타 피해',multiDamage:'연타 피해',critDamage:'치명타 피해',critChance:'치명타 확률',extraChance:'추가타 확률'} as Record<string,string>)[data.bonus]}</small>{data.description&&<small style={{display:'block',width:'100%',opacity:.75}}>{data.description}</small>}
 <button type="button" onClick={()=>onChange(equipped.filter(x=>x!==r))}>삭제</button>
 </div>})}
 <button type="button" onClick={()=>{const r=RUNE_CATALOG.find(x=>x.slot===slot&&!equipped.some(y=>y.name===x.name&&y.slot===slot));if(r)onChange([...equipped,{slot,name:r.name,tier:0}]);}}>+ {slot} 룬 추가</button>
 </section>)}
 </details>;
}
