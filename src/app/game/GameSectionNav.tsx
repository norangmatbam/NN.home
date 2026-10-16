'use client';

import { usePathname, useRouter } from 'next/navigation';

const ITEMS = [
  { label: '계산기', href: '/game' },
  { label: '시뮬레이터 M', href: '/game/simulator' },
  { label: '시뮬레이터 D', href: '/game/simulator-d' },
  { label: '드래케인', href: '/game/drakein' },
  { label: '데카', href: '/game/deca' },
  { label: '보석 스왑', href: '/game/gem-swap' },
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
