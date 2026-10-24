export type RuneSlot='무기'|'방어구'|'엠블럼';
export type RuneBonusKey='damageIncrease'|'skillDamage'|'strikeDamage'|'multiDamage'|'critDamage'|'critChance'|'extraChance';
export type RuneRecord={slot:RuneSlot;name:string;tiers:(number|null)[];bonus:RuneBonusKey;note?:string};
// Source: 마비노기 모바일 종합 시트 V2.3, 시즌2.
// Null denotes a source value shown as '?' — never interpolate that tier.
export const RUNE_CATALOG:RuneRecord[]=[
{slot:'무기',name:'오랜 광기',tiers:[20,22,null],bonus:'damageIncrease'},
{slot:'무기',name:'광채+',tiers:[20,22,null],bonus:'damageIncrease',note:'지속 피해 조건의 치명타 피해 증가는 제외'},
{slot:'무기',name:'거대한 분노',tiers:[21,23,null],bonus:'damageIncrease',note:'강타 중첩 스킬 피해 증가 제외'},
{slot:'무기',name:'암운+',tiers:[15,17,null],bonus:'strikeDamage',note:'조건부 스킬 피해 증가 제외'},
{slot:'무기',name:'추적자',tiers:[35,37,null],bonus:'strikeDamage',note:'조건부 강타 피해 감소 제외'},
{slot:'방어구',name:'계승자',tiers:[13,15,17],bonus:'damageIncrease',note:'스킬 사용 시 중첩 피해 효과 제외'},
{slot:'방어구',name:'잠든 땅',tiers:[13,14,15],bonus:'multiDamage',note:'동일 수치의 강타 피해도 자동 합산'},
{slot:'방어구',name:'열의+',tiers:[7,9,11],bonus:'damageIncrease'},
{slot:'방어구',name:'빛살+',tiers:[5.5,7.5,9.5],bonus:'damageIncrease'},
{slot:'방어구',name:'등대지기',tiers:[24,26,27],bonus:'damageIncrease',note:'조건부 방어구 파괴 효과 제외'},
{slot:'방어구',name:'녹슨 방패',tiers:[22,24,26],bonus:'damageIncrease'},
{slot:'방어구',name:'정복자+',tiers:[9,9,9],bonus:'damageIncrease',note:'조건부 공격력 상승은 제외'},
{slot:'엠블럼',name:'침묵',tiers:[33,35,null],bonus:'damageIncrease'},
{slot:'엠블럼',name:'해방',tiers:[25,27,29],bonus:'multiDamage',note:'밤의 축복 추가 40% 제외'},
{slot:'엠블럼',name:'위대함',tiers:[25,27,29],bonus:'strikeDamage',note:'밤의 축복 추가 40% 제외'},
{slot:'엠블럼',name:'태초',tiers:[20,22,null],bonus:'skillDamage'},
{slot:'엠블럼',name:'빛바랜 별',tiers:[31,33,null],bonus:'damageIncrease',note:'무방비 피해 증가 별도 미적용'}
];
export type EquippedRune={slot:RuneSlot;name:string;tier:number};
export function getRuneBonuses(selected:EquippedRune[]):Partial<Record<RuneBonusKey,number>>{
 const totals:Partial<Record<RuneBonusKey,number>>={};
 for(const item of selected){
  const rune=RUNE_CATALOG.find(r=>r.slot===item.slot&&r.name===item.name);
  const value=rune?.tiers[item.tier];
  if(value==null||!rune)continue;
  totals[rune.bonus]=(totals[rune.bonus]||0)+value;
  if(rune.name==='잠든 땅')totals.strikeDamage=(totals.strikeDamage||0)+value;
 }
 return totals;
}
