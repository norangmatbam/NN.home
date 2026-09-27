'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { boardEntries, buildMenu, useMenuSettings } from '@/lib/menuStore';
import { useBoards } from '@/lib/boardStore';
import { sectionMenuEntries, useSections } from '@/lib/sectionStore';
import { linkEntries, useCustomLinks } from '@/lib/linkStore';
import { useAuth } from '@/lib/auth';

const isBoardHref = (href: string) => href === '/board' || href.startsWith('/board?b=');

/** 모바일 TopBar 2행.
 * PC의 드롭다운 GNB가 모바일에서는 숨겨지므로, 메뉴 트리에 배치된 게시판들을
 * 실제 배치 순서대로 한 줄에 펼쳐 직접 이동할 수 있게 한다. */
export function MobileQuickNav() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [menuSet, , menuLoaded] = useMenuSettings();
  const { boards, loaded: boardsLoaded } = useBoards();
  const { map: secMap } = useSections();
  const { links } = useCustomLinks();

  const boardsInMenu = useMemo(() => {
    if (!menuLoaded || !boardsLoaded) return [] as { label: string; href: string }[];
    const menu = buildMenu(
      menuSet,
      [...boardEntries(boards), ...sectionMenuEntries(secMap), ...linkEntries(links)],
      { loggedIn: !!user, isAdmin, id: user?.id },
    );
    const out: { label: string; href: string }[] = [];
    const seen = new Set<string>();
    for (const item of menu) {
      const candidates = item.children ?? (item.href ? [{ label: item.label, href: item.href }] : []);
      for (const child of candidates) {
        if (!isBoardHref(child.href) || seen.has(child.href)) continue;
        seen.add(child.href);
        out.push({ label: child.label, href: child.href });
      }
    }
    return out;
  }, [menuLoaded, boardsLoaded, menuSet, boards, secMap, links, user, isAdmin]);

  if (boardsInMenu.length === 0) return null;
  return (
    <nav className="mobile-quick-nav" aria-label="모바일 게시판 메뉴">
      {boardsInMenu.map(item => (
        <button key={item.href} onClick={() => router.push(item.href)}>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
