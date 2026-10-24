// Community benchmark (발컨빌런, 2026-03-12) — NOT an official damage formula.
// Based on 26,500 unbuffed attack, 70 critical rating ~0.50%,
// 70 strike/multi/extra/skill rating ~0.45%. Fast skill / combo omitted by author.
import type {CombatClass} from '../combat-damage';
import type {RuneWord} from './RuneWordClient';
const primary:Record<string,[string,string?]>={
 '전사':['힘'],'대검전사':['힘','행운'],'검술사':['힘','의지'],'기사':['힘','의지'],
 '궁수':['솜씨'],'석궁사수':['솜씨','행운'],'장궁병':['솜씨','의지'],
 '마법사':['지력'],'화염술사':['지력','행운'],'빙결술사':['지력','의지'],'전격술사':['지력','행운'],
 '힐러':['지력'],'사제':['지력','의지'],'수도사':['지력','의지'],'암흑술사':['지력','행운'],
 '음유시인':['솜씨'],'댄서':['솜씨','행운'],'악사':['솜씨','의지'],
 '도적':['솜씨'],'격투가':['솜씨','의지'],'듀얼블레이드':['솜씨','행운']
};
const statOf:Record<string,string[]>={힘:['강타 강화'],솜씨:['연타 강화'],지력:['스킬 위력'],의지:[],행운:['치명타','추가타']};
const secondary=new Set(['강타 강화','연타 강화','추가타','스킬 위력']);
const ignored=new Set(['빠른 스킬','빠른 공격','콤보 강화','궁극기 강화','광역 강화','브레이크 피해','생명력','회복력','방어력','받는 피해 감소','급소 회피']);
export function communityEfficiency(word:RuneWord,combatClass:CombatClass,rawAttack:number){
 const effects=new Map<string,number>();
 for(const e of word.effects)effects.set(e.name,(effects.get(e.name)||0)+e.value);
 const [main,sub]=primary[combatClass]||['지력'];
 for(const stat of ['힘','솜씨','지력','행운','의지']){
  const delta=effects.get(stat)||0;if(!delta)continue;
  for(const derived of statOf[stat])effects.set(derived,(effects.get(derived)||0)+delta/4);
 }
 let attack=effects.get('공격력')||0;
 if(main)attack+=(effects.get(main)||0)*(sub?3:5.5);
 if(sub)attack+=(effects.get(sub)||0)*2.5;
 // Attack is A before the attack-increase multiplier B.
 let factor=rawAttack>0&&rawAttack+attack>0?(rawAttack+attack)/rawAttack:1;
 for(const [name,value] of effects){
  if(name==='치명타')factor*=1+value/70*.005;
  if(secondary.has(name))factor*=1+value/70*.0045;
 }
 const omitted=word.effects.filter(e=>ignored.has(e.name)).map(e=>e.name);
 return {percent:(factor-1)*100,omitted,coverage:word.effects.length?(word.effects.length-omitted.length)/word.effects.length:1};
}
