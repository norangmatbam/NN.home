// Excel-based relative damage model; estimates are not an official game DPS formula.
export type CombatClass='화염술사'|'전사'|'기타 강타'|'기타 연타';
export type CombatStats={
 attack:number;skill:number;crit:number;extra:number;strike:number;multi:number;
 skillDamage:number;damageIncrease:number;critChance:number;critDamage:number;extraChance:number;
 strikeDamage:number;multiDamage:number;unprotectedDamage:number;unprotectedShare:number;
 strength:number;dexterity:number;intelligence:number;luck:number;will:number;
};
export const initialStats:CombatStats={
 attack:26500,skill:3000,crit:8000,extra:3000,strike:4000,multi:5000,
 skillDamage:0,damageIncrease:0,critChance:25,critDamage:0,extraChance:0,
 strikeDamage:0,multiDamage:0,unprotectedDamage:0,unprotectedShare:0,
 strength:0,dexterity:0,intelligence:0,luck:0,will:0
};
type StatKey=keyof CombatStats;
export type SoulEffect={label:string;value:number;percent:boolean};
const direct:Record<string,StatKey>={
 '공격력':'attack','스킬위력':'skill','치명타':'crit','추가타':'extra',
 '강타강화':'strike','연타강화':'multi','강타피해':'strikeDamage','연타피해':'multiDamage',
 '무방비피해':'unprotectedDamage','피해증가':'damageIncrease',
 '힘':'strength','솜씨':'dexterity','지력':'intelligence','행운':'luck','의지':'will',
 '모든능력치':'strength'
};
const clean=(value:string)=>value.replace(/\s/g,'');
export function tierEffects(tiers:string[]|undefined,level:number):SoulEffect[]{
 if(!level||!tiers?.length)return [];
 // Conditional bonus lines cannot be assumed to activate; intentionally excluded.
 return (tiers[Math.min(level,tiers.length)-1]||'').split('\n').flatMap(line=>{
  const normalized=clean(line);
  if(/이면|이상이면|이상시|이하이면|때|시,/.test(normalized))return [];
  const match=normalized.match(/^([^+]+)\+([0-9]+(?:\.[0-9]+)?)(%)?/);
  if(!match)return [];
  const label=match[1],value=Number(match[2]);
  return [{label,value,percent:Boolean(match[3])}];
 });
}
export function applyEffects(base:CombatStats,effects:SoulEffect[],combatClass:CombatClass){
 const v={...base};
 for(const {label,value} of effects){
  if(label==='모든능력치'){
   v.strength+=value;v.dexterity+=value;v.intelligence+=value;v.luck+=value;v.will+=value;
  }else{
   const k=direct[label];if(k)v[k]+=value;
  }
 }
 const intelligence=v.intelligence-base.intelligence;
 const luck=v.luck-base.luck;
 const strength=v.strength-base.strength;
 const dex=v.dexterity-base.dexterity;
 // In-game main-stat side effects: 4 main-stat points ~= 1 derived point.
 v.skill+=intelligence/4;
 v.crit+=luck/4;v.extra+=luck/4;
 v.strike+=strength/4;
 v.multi+=dex/4;
 // Weapon coefficients supplied by player, not universally applicable across subclasses.
 if(combatClass==='화염술사')v.attack+=intelligence*3+luck*2.5;
 if(combatClass==='전사')v.attack+=strength*5.5;
 return v;
}
const capped=(x:number,min:number,max:number)=>Math.min(max,Math.max(min,x));
export type DamageUptime={strike:number;multi:number};
export const DEFAULT_UPTIME:DamageUptime={strike:95,multi:100};
export function damageFactor(v:CombatStats,uptime:DamageUptime=DEFAULT_UPTIME){
 const a=Math.max(1,v.attack);
 const p=(1+v.skill/8500)*(1+v.skillDamage/100)+v.damageIncrease/100;
 // D is additive across simultaneous strike and multi procs; uptimes are independent.
 const specialized=1+
   ((1+v.strike/8500)*(1+v.strikeDamage/100)-1)*capped(uptime.strike/100,0,1)+
   ((1+v.multi/8500)*(1+v.multiDamage/100)-1)*capped(uptime.multi/100,0,1);
 const critP=capped(.5-1/(2+Math.max(0,v.crit)/1000)+v.critChance/100,0,1);
 const critM=(1.4+Math.max(0,v.crit)/5000)*(1+v.critDamage/100);
 const crit=1+critP*(critM-1);
 const extra=Math.min(2,Math.max(0,(1+v.extra/13000)*(1+v.extraChance/100)));
 const breakMultiplier=1+(v.unprotectedDamage/100)*capped(v.unprotectedShare/100,0,1);
 return a*Math.max(.01,p)*Math.max(.01,specialized)*Math.max(.01,crit)*extra*breakMultiplier;
}
export function percentGain(base:CombatStats,effects:SoulEffect[],cls:CombatClass,uptime:DamageUptime=DEFAULT_UPTIME){
 const initial=damageFactor(base,uptime);
 const after=damageFactor(applyEffects(base,effects,cls),uptime);
 return initial>0?(after/initial-1)*100:0;
}

// Used by rune-word scoring to distinguish supported and unsupported effects.
export function isSupportedDamageEffect(label:string){
 const n=label.replace(/\s/g,'');
 return n==='모든능력치'||Boolean(direct[n]);
}
