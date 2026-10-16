export const TAGS = ['강타댐','강타쿨','연타댐','연타쿨','원소댐','원소쿨','방해댐','방해쿨','보조댐','보조쿨','기교댐','기교쿨','생존댐','생존쿨','약화댐','약화쿨'] as const;
export type Gem = { id: string; name: string; grade: string; tags: string[] };
export type Swap = { a: number; ai: number; b: number; bi: number; from: string; to: string };
export type Stats = { one: number; two: number; three: number; score: number };
export type Result = { gems: Gem[]; moves: Swap[]; stats: Stats };

export function stats(gems: Gem[], targets: string[]): Stats {
  let one = 0, two = 0, three = 0;
  for (const gem of gems) {
    const values = new Set(gem.tags);
    if (targets[0] && values.has(targets[0])) one++;
    if (targets[0] && targets[1] && values.has(targets[0]) && values.has(targets[1])) two++;
    if (targets[0] && targets[1] && targets[2] && targets.slice(0,3).every(tag => values.has(tag))) three++;
  }
  // Balanced priorities: improvements to any completed tier count,
  // with additional credit for higher tiers. Every move conserves tag totals.
  return { one, two, three, score: one * 100 + two * 190 + three * 340 };
}
const clone = (gems: Gem[]) => gems.map(g => ({ ...g, tags: [...g.tags] }));
function swap(gems: Gem[], a: number, ai: number, b: number, bi: number) {
  const t = gems[a].tags[ai]; gems[a].tags[ai] = gems[b].tags[bi]; gems[b].tags[bi] = t;
}
function key(gems: Gem[]) { return gems.map(g => g.tags.join(',')).join('|'); }

// Reproducible coordinate ascent with several starts. Not an exhaustive
// global optimum: offers verified, executable exchanges with monotone scores.
export function optimize(gems: Gem[], targets: string[], maxMoves = 24): Result {
  const initial = clone(gems);
  const base = stats(initial, targets);
  let best: Result = { gems: initial, moves: [], stats: base };
  if (gems.length < 2 || !targets[0]) return best;
  for (let seed = 0; seed < 5; seed++) {
    const work = clone(gems), moves: Swap[] = [];
    const seen = new Set([key(work)]);
    for (let step = 0; step < maxMoves; step++) {
      const before = stats(work, targets);
      let chosen: { a:number; ai:number; b:number; bi:number; gain:number; score:number; tie:number } | null = null;
      for (let a = 0; a < work.length; a++) for (let b = a+1; b < work.length; b++) {
        for (let ai = 0; ai < work[a].tags.length; ai++) for (let bi = 0; bi < work[b].tags.length; bi++) {
          if (!work[a].tags[ai] || !work[b].tags[bi] || work[a].tags[ai] === work[b].tags[bi]) continue;
          swap(work,a,ai,b,bi);
          const nextKey = key(work), after = stats(work, targets);
          const gain = after.score - before.score;
          // Rotate equal-score candidates to explore distinct feasible plans.
          const tie = (a*19 + b*11 + ai*7 + bi*3 + seed*13) % 97;
          if (!seen.has(nextKey) && gain > 0 && (!chosen || gain > chosen.gain || (gain === chosen.gain && tie > chosen.tie)))
            chosen = {a,ai,b,bi,gain,score:after.score,tie};
          swap(work,a,ai,b,bi);
        }
      }
      if (!chosen) break;
      const {a,ai,b,bi} = chosen;
      const from = work[a].tags[ai], to = work[b].tags[bi];
      swap(work,a,ai,b,bi);
      moves.push({a,ai,b,bi,from,to});
      seen.add(key(work));
    }
    const current = stats(work,targets);
    if (current.score > best.stats.score || (current.score === best.stats.score && moves.length < best.moves.length))
      best = { gems: clone(work), moves: [...moves], stats: current };
  }
  return best;
}
