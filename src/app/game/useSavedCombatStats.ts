'use client';
import {useEffect,useState} from 'react';
import {initialStats,type CombatStats} from './combat-damage';

const KEY='nn-game-combat-stats-v1';
const keys:(keyof CombatStats)[]=[
 'attack','skill','crit','extra','strike','multi','skillDamage','damageIncrease',
 'critChance','critDamage','extraChance','strikeDamage','multiDamage',
 'unprotectedDamage','unprotectedShare','strength','dexterity','intelligence','luck','will'
];
function readStats():CombatStats{
 try{
  const raw=localStorage.getItem(KEY);
  if(!raw)return initialStats;
  const parsed:unknown=JSON.parse(raw);
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return initialStats;
  const data=parsed as Record<string,unknown>;
  const stats={...initialStats};
  for(const key of keys){
   if(typeof data[key]==='number'&&Number.isFinite(data[key])&&data[key]>=0)stats[key]=data[key];
  }
  // The old editor silently seeded +25% crit chance; it was never user-editable.
  if(data.critChance===25)stats.critChance=0;
  return stats;
 }catch{return initialStats;}
}
export function useSavedCombatStats(){
 const [stats,setStats]=useState<CombatStats>(initialStats);
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{setStats(readStats());setLoaded(true);},[]);
 useEffect(()=>{if(!loaded)return;try{localStorage.setItem(KEY,JSON.stringify(stats));}catch{}},[stats,loaded]);
 return [stats,setStats] as const;
}
