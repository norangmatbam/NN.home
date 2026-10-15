'use client';

import { usePathname, useRouter } from 'next/navigation';

const ITEMS = [
  { label: '계산기', href: '/game' },
  { label: '시뮬레이터', href: '/game/simulator' },
  { label: '드래케인', href: '/game/drakein' },
];

export default function GameSectionNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="group-sibling-shell">
      <nav className="board-switch-nav group-sibling-nav" aria-label="게임 도구 메뉴">
        {ITEMS.map(item => (
          <button
            key={item.href}
            type="button"
            className={pathname === item.href ? 'on' : ''}
            onClick={() => router.push(item.href)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
