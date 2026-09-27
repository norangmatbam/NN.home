'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { boardEntries, buildMenu, useMenuSettings } from '@/lib/menuStore';
import { useBoards } from '@/lib/boardStore';
import { sectionMenuEntries, useSections } from '@/lib/sectionStore';
import { linkEntries, useCustomLinks } from '@/lib/linkStore';
import { useAuth } from '@/lib/auth';

const MOBILE_GROUPS = new Set(['background', 'foreground']);

/** 모바일 TopBar 2행.
 * PC에서 드롭다운으로 보이는 상위 카테고리 중 BACKGROUND / FOREGROUND만 2행에 표시한다.
 * 각 카테고리를 누르면 그 그룹의 첫 게시판으로 들어가고, 실제 게시판 간 이동은
 * 게시판 페이지 안의 board-switch-nav에서 처리한다. */
export function MobileQuickNav() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [menuSet, , menuLoaded] = useMenuSettings();
  const { boards, loaded: boardsLoaded } = useBoards();
  const { map: secMap } = useSections();
  const { links } = useCustomLinks();

  const groups = useMemo(() => {
    if (!menuLoaded || !boardsLoaded) return [] as { label: string; href: string }[];
    const menu = buildMenu(
      menuSet,
      [...boardEntries(boards), ...sectionMenuEntries(secMap), ...linkEntries(links)],
      { loggedIn: !!user, isAdmin, id: user?.id },
    );

    return menu.flatMap(item => {
      if (!MOBILE_GROUPS.has(item.label.trim().toLowerCase())) return [];
      const href = item.children?.[0]?.href ?? item.href;
      return href ? [{ label: item.label, href }] : [];
    });
  }, [menuLoaded, boardsLoaded, menuSet, boards, secMap, links, user, isAdmin]);

  if (groups.length === 0) return null;
  return (
    <nav className="mobile-quick-nav" aria-label="모바일 상위 카테고리">
      {groups.map(item => (
        <button key={`${item.label}:${item.href}`} onClick={() => router.push(item.href)}>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
