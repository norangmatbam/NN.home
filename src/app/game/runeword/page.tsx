import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import RuneWordClient, { type RuneWord } from './RuneWordClient';

export const dynamic = 'force-static';

function load(season: 1 | 2): RuneWord[] {
  const file = readFileSync(join(process.cwd(), 'src', 'app', 'game', 'runeword', 'season' + season + '.txt'), 'utf8');
  return file.trim().split(/\r?\n/).map(line => {
    const [name, effectSource, runeSource] = line.split('|');
    return {
      name,
      effects: effectSource.split(',').map(stat => {
        const divider = stat.lastIndexOf(':');
        return { name: stat.slice(0, divider), value: Number(stat.slice(divider + 1)) };
      }),
      runes: runeSource.split(','),
    };
  });
}

export default function RuneWordPage() {
  return <RuneWordClient words={{ 1: load(1), 2: load(2) }} />;
}
