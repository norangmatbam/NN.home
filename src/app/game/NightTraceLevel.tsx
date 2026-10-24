'use client';
import {useEffect,useState} from 'react';
import {darkeningFinalDamage} from './combat-damage';
const KEY='nn-game-night-trace-level-v1';
export default function NightTraceLevel(){
 const [level,setLevel]=useState(0);
 useEffect(()=>{try{const v=Number(localStorage.getItem(KEY));if(Number.isFinite(v)&&v>=0&&v<=150)setLevel(Math.floor(v));}catch{}},[]);
 const change=(value:number)=>{const next=Math.min(150,Math.max(0,Math.floor(value)||0));setLevel(next);try{localStorage.setItem(KEY,String(next));}catch{}};
 const bonus=darkeningFinalDamage(level);
 return <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',margin:'10px 0'}}>
  <label style={{display:'flex',gap:7,alignItems:'center'}}>밤의 흔적 레벨
   <input aria-label="밤의 흔적 레벨" type="number" inputMode="numeric" min="0" max="150" value={level} onChange={e=>change(Number(e.target.value))} style={{width:70,padding:7,border:'1px solid #9eb1c8',borderRadius:8}}/>
  </label>
  <span style={{fontWeight:700}}>깊어지는 어둠: 최종 대미지 +{bonus.toFixed(1)}%</span>
  <small style={{flexBasis:'100%',opacity:.76}}>65레벨부터 적용(가정), 최대 150레벨. Lv.66에서 +6.6%인 자료에 따른 추정입니다. 이 효과는 전후 대미지에 동일하게 곱해져 상대 DPS 효율 순위에는 영향을 주지 않습니다.</small>
 </div>;
}
