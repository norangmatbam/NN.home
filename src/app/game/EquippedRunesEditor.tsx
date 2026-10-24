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
 <p>시즌2 자료에서 확인된 룬의 상시 피해 배율만 계산합니다. 초월 수치가 불명확한 단계는 제외합니다.</p>
 {slots.map(slot=><section key={slot}>
 <strong>{slot}</strong>
 {equipped.filter(r=>r.slot===slot).map((r,i)=>{
 const data=RUNE_CATALOG.find(x=>x.slot===r.slot&&x.name===r.name)!;
 return <div key={slot+i}>
 <select aria-label={slot+' 룬'} value={r.name} onChange={e=>onChange(equipped.map(x=>x===r?{...x,name:e.target.value,tier:0}:x))}>{RUNE_CATALOG.filter(x=>x.slot===slot).map(x=><option key={x.name} value={x.name}>{x.name}</option>)}</select>
 <select aria-label="초월 단계" value={r.tier} onChange={e=>onChange(equipped.map(x=>x===r?{...x,tier:Number(e.target.value)}:x))}>{[0,1,2].map(t=><option key={t} value={t}>{t}초월 {data.tiers[t]==null?'(수치 미확인)':''}</option>)}</select>
 <small>{data.tiers[r.tier]==null?'미반영':data.tiers[r.tier]+'%'} / {data.bonus}</small>
 <button type="button" onClick={()=>onChange(equipped.filter(x=>x!==r))}>삭제</button>
 </div>})}
 <button type="button" onClick={()=>{const r=RUNE_CATALOG.find(x=>x.slot===slot&&!equipped.some(y=>y.name===x.name&&y.slot===slot));if(r)onChange([...equipped,{slot,name:r.name,tier:0}]);}}>+ {slot} 룬 추가</button>
 </section>)}
 </details>;
}
