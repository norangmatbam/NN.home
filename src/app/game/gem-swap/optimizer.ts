export const TAGS = ['강타','연타','이동','방해','보조','생존','원소','소환'].flatMap(kind => [`${kind} 댐증`, `${kind} 쿨감`]);
export type Gem = { id: string; name: string; count: number; tags: string[] };
export type Swap = { from: string; to: string };
export type Stats = { counts: number[]; two: number; one: number };
export type Result = { gems: Gem[]; moves: Swap[]; stats: Stats };
export const DEFAULT_TARGETS = [
  ['원소 댐증','강타 댐증','방해 댐증'],
  ['원소 댐증','강타 댐증','연타 댐증'],
  ['', '', ''], ['', '', ''], ['', '', ''],
];
export function stats(gems: Gem[], targets: string[][]): Stats {
  const configured = targets.map(t => t.length === 3 && t.every(Boolean) && new Set(t).size === 3 ? t : null);
  const counts = configured.map(t => t ? gems.reduce((sum,g) => t.every(tag => g.tags.includes(tag)) ? sum+g.count : sum, 0) : 0);
  const reference = configured.find(t=>t!==null);
  const two = reference ? gems.reduce((sum,g)=>reference.slice(0,2).every(t=>g.tags.includes(t)) ? sum+g.count : sum,0) : 0;
  const one = reference ? gems.reduce((sum,g)=>g.tags.includes(reference[0])?sum+g.count:sum,0) : 0;
  return {counts,two,one};
}
export function compareStats(a:Stats,b:Stats) {
  // Only completed ranked 3-tag combinations determine whether a swap is useful.
  // Partial 1/2-tag matches must never trigger an otherwise pointless exchange.
  const av=a.counts,bv=b.counts;
  for(let i=0;i<av.length;i++) if(av[i]!==bv[i])return av[i]>bv[i]?1:-1;
  return 0;
}
const clone=(gems:Gem[])=>gems.map(g=>({...g,tags:[...g.tags]}));
const transpose=(gems:Gem[],a:string,b:string)=>{
  for(const gem of gems)gem.tags=gem.tags.map(t=>t===a?b:t===b?a:t);
};
const fingerprint=(gems:Gem[])=>gems.map(g=>g.tags.join(',')).join('|');
/** Global tag-type exchanges. Lexicographic priority: first-ranked combo
 * dominates every number of lower-ranked combinations. Greedy search, not a
 * global optimality guarantee. */
export function optimize(gems:Gem[],targets:string[][],maxMoves=16):Result {
  const base=clone(gems);
  let winner:Result={gems:base,moves:[],stats:stats(base,targets)};
  if(!targets.some(t=>t.every(Boolean))||gems.length<1)return winner;
  const present=Array.from(new Set(gems.flatMap(g=>g.tags).concat(targets.flat().filter(Boolean)))).filter(Boolean);
  for(let seed=0;seed<5;seed++){
    const working=clone(gems),moves:Swap[]=[];
    const visited=new Set([fingerprint(working)]);
    for(let n=0;n<maxMoves;n++){
      const before=stats(working,targets);
      let pick:{a:string;b:string;result:Stats;tie:number}|null=null;
      for(let i=0;i<present.length;i++)for(let j=i+1;j<present.length;j++){
        const a=present[i],b=present[j];
        if(a.endsWith('댐증')!==b.endsWith('댐증'))continue;
        transpose(working,a,b);
        const after=stats(working,targets);
        const tie=(i*29+j*17+seed*23)%113;
        if(compareStats(after,before)>0&&!visited.has(fingerprint(working))&&(!pick||compareStats(after,pick.result)>0||(compareStats(after,pick.result)===0&&tie>pick.tie)))
          pick={a,b,result:after,tie};
        transpose(working,a,b);
      }
      if(!pick)break;
      transpose(working,pick.a,pick.b);
      moves.push({from:pick.a,to:pick.b});
      visited.add(fingerprint(working));
    }
    const score=stats(working,targets);
    if(compareStats(score,winner.stats)>0||(compareStats(score,winner.stats)===0&&moves.length<winner.moves.length))
      winner={gems:clone(working),moves:[...moves],stats:score};
  }
  return winner;
}
