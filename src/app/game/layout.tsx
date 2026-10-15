import type { ReactNode } from 'react';
import GameSectionNav from './GameSectionNav';

export default function GameLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <GameSectionNav />
      {children}
    </>
  );
}
