import {getRuneBonuses,type EquippedRune} from './equipped-runes';
// Excel-based relative damage model; estimates are not an official game DPS formula.
import { JOB_GROUPS } from './simulator/marketData';

export type CombatClass=(typeof JOB_GROUPS)[number]['jobs'][number];
type PrimaryStat='strength'|'dexterity'|'intelligence'|'luck'|'will';
const CLASS_PRIMARY:Record<CombatClass,readonly [PrimaryStat,PrimaryStat?]>={
 '전사':['strength'],'대검전사':['strength','luck'],'검술사':['strength','will'],'기사':['strength','will'],
 '궁수':['dexterity'],'석궁사수':['dexterity','luck'],'장궁병':['dexterity','will'],
 '마법사':['intelligence'],'화염술사':['intelligence','luck'],'빙결술사':['intelligence','will'],'전격술사':['intelligence','luck'],
 '힐러':['intelligence'],'사제':['intelligence','will'],'수도사':['intelligence','will'],'암흑술사':['intelligence','luck'],
 '음유시인':['dexterity'],'댄서':['dexterity','luck'],'악사':['dexterity','will'],
 '도적':['dexterity'],'격투가':['dexterity','will'],'듀얼블레이드':['dexterity','luck']
};
export const JOB_OPTIONS=JOB_GROUPS;
export function weaponStatLabel(job:CombatClass){
 const [primary,secondary]=CLASS_PRIMARY[job];
 const label:Record<PrimaryStat,string>={strength:'힘',dexterity:'솜씨',intelligence:'지력',luck:'행운',will:'의지'};
 return secondary?`${label[primary]}×3 · ${label[secondary]}×2.5`:`${label[primary]}×5.5`;
}
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
 // Requested unified weapon stat coefficients for every class.
 const [primary,secondary]=CLASS_PRIMARY[combatClass];
 const changes:Record<PrimaryStat,number>={strength,dexterity:dex,intelligence,luck,will:v.will-base.will};
 v.attack+=secondary?changes[primary]*3+changes[secondary]*2.5:changes[primary]*5.5;
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
export function percentGain(base:CombatStats,effects:SoulEffect[],cls:CombatClass,uptime:DamageUptime=DEFAULT_UPTIME,equipped:EquippedRune[]=[]){
 // Character sheet attack and derived stats already include worn runes.
 // Only off-sheet additive damage modifiers enter the baseline comparison.
 const runeBonuses=getRuneBonuses(equipped);
 const withRuneEffects={...base};
 for(const [key,value] of Object.entries(runeBonuses) as [keyof CombatStats,number][]){
  if(value!==undefined)withRuneEffects[key]+=value;
 }
 const initial=damageFactor(withRuneEffects,uptime);
 const after=damageFactor(applyEffects(withRuneEffects,effects,cls),uptime);
 return initial>0?(after/initial-1)*100:0;
}

// Used by rune-word scoring to distinguish supported and unsupported effects.
export function isSupportedDamageEffect(label:string){
 const n=label.replace(/\s/g,'');
 return n==='모든능력치'||Boolean(direct[n]);
}

export const screenshotStats:CombatStats={...initialStats,
 attack:60065,skill:5399,crit:10969,extra:2498,strike:5030,multi:2149,
 strength:7117,dexterity:7218,intelligence:7972,will:6608,luck:7528
};
export const SIMPLE_STAT_FIELDS:{key:keyof CombatStats;label:string}[]=[
 {key:'attack',label:'공격력'},{key:'strike',label:'강타 강화'},{key:'multi',label:'연타 강화'},
 {key:'skill',label:'스킬 위력'},{key:'crit',label:'치명타'},{key:'extra',label:'추가타'}
];
export const EXTRA_STAT_FIELDS:{key:keyof CombatStats;label:string}[]=[
 {key:'strength',label:'힘'},{key:'dexterity',label:'솜씨'},{key:'intelligence',label:'지력'},
 {key:'will',label:'의지'},{key:'luck',label:'행운'},
 {key:'skillDamage',label:'스킬 피해 (%)'},{key:'damageIncrease',label:'피해 증가 (%)'},
 {key:'critChance',label:'추가 치확 (%)'},{key:'critDamage',label:'치피 증가 (%)'},
 {key:'extraChance',label:'추가타 확률 (%)'},{key:'strikeDamage',label:'강타 피해 (%)'},
 {key:'multiDamage',label:'연타 피해 (%)'},{key:'unprotectedDamage',label:'무방비 피해 (%)'},
 {key:'unprotectedShare',label:'무방비 적용 비중 (%)'}
];

/** 밤의 흔적 레벨에 의한 '깊어지는 어둠' 추정 배율.
 * 공유된 화염술사 스킬 시트는 Lv.66→6.6%, 최대 Lv.150만 명시하며
 * Lv.65 활성화 조건은 사용자가 제안한 설정이므로 가정으로 표시한다.
 */
export function darkeningFinalDamage(level:number){
 const lv=Math.min(150,Math.max(0,Math.floor(level)||0));
 return lv>=65?lv*.1:0;
}
