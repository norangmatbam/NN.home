export const TAGS = ['강타','연타','이동','방해','보조','생존','원소','소환'].flatMap(kind => [`${kind} 댐증`, `${kind} 쿨감`]);
export type Gem = { id: string; name: string; count: number; tags: string[] };
export type Swap = { from: string; to: string };
export type Stats = { one: number; two: number; three: number; score: number };
export type Result = { gems: Gem[]; moves: Swap[]; stats: Stats };
export function stats(gems: Gem[], targets: string[]): Stats {
  let one=0,two=0,three=0;
  for(const gem of gems){
    const set=new Set(gem.tags);
    if(targets[0]&&set.has(targets[0]))one+=gem.count;
    if(targets[0]&&targets[1]&&set.has(targets[0])&&set.has(targets[1]))two+=gem.count;
    if(targets.slice(0,3).every(t=>t&&set.has(t)))three+=gem.count;
  }
  return {one,two,three,score:one*100+two*190+three*340};
}
const clone=(gems:Gem[])=>gems.map(g=>({...g,tags:[...g.tags]}));
const transpose=(gems:Gem[],a:string,b:string)=>{
  for(const gem of gems)gem.tags=gem.tags.map(t=>t===a?b:t===b?a:t);
};
const fingerprint=(gems:Gem[])=>gems.map(g=>g.tags.join(',')).join('|');

/**
 * All held gems are transformed when two tag types are exchanged.
 * Each move is an actual reversible global transposition, never a swap of
 * two individual gem slots. Greedy multi-start hill climbing improves
 * the balanced score without claiming global optimality.
 */
export function optimize(gems:Gem[],targets:string[],maxMoves=16):Result {
  const base=clone(gems);
  let winner:Result={gems:base,moves:[],stats:stats(base,targets)};
  if(!targets[0]||gems.length<1)return winner;
  const present=Array.from(new Set(gems.flatMap(g=>g.tags).concat(targets.filter(Boolean)))).filter(Boolean);
  for(let seed=0;seed<5;seed++){
    const working=clone(gems),moves:Swap[]=[];
    const visited=new Set([fingerprint(working)]);
    for(let n=0;n<maxMoves;n++){
      const before=stats(working,targets).score;
      let pick:{a:string;b:string;delta:number;tie:number}|null=null;
      for(let i=0;i<present.length;i++)for(let j=i+1;j<present.length;j++){
        const a=present[i],b=present[j];
        // Damage and cooldown tag categories cannot be interchanged.
        if(a.endsWith('댐증')!==b.endsWith('댐증'))continue;
        transpose(working,a,b);
        const after=stats(working,targets).score;
        const delta=after-before;
        const tie=(i*29+j*17+seed*23)%113;
        if(delta>0&&!visited.has(fingerprint(working))&&(!pick||delta>pick.delta||(delta===pick.delta&&tie>pick.tie)))
          pick={a,b,delta,tie};
        transpose(working,a,b);
      }
      if(!pick)break;
      transpose(working,pick.a,pick.b);
      moves.push({from:pick.a,to:pick.b});
      visited.add(fingerprint(working));
    }
    const score=stats(working,targets);
    if(score.score>winner.stats.score||(score.score===winner.stats.score&&moves.length<winner.moves.length))
      winner={gems:clone(working),moves:[...moves],stats:score};
  }
  return winner;
}
