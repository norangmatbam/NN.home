'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { boardEntries, buildMenu, useMenuSettings } from '@/lib/menuStore';
import { useBoards } from '@/lib/boardStore';
import { sectionMenuEntries, useSections } from '@/lib/sectionStore';
import { linkEntries, useCustomLinks } from '@/lib/linkStore';
import { useAuth } from '@/lib/auth';

/**
 * 현재 페이지가 속한 상위 메뉴 그룹의 형제 메뉴를 모두 보여 준다.
 * 게시판(/board)만이 아니라 갤러리 섹션(/gallery?s=...), 커스텀 링크 등
 * 메뉴 관리에서 같은 그룹에 배치된 항목이면 종류와 무관하게 함께 노출한다.
 */
export function GroupSiblingNav() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [menuSet, , menuLoaded] = useMenuSettings();
  const { boards, loaded: boardsLoaded } = useBoards();
  const { map: secMap } = useSections();
  const { links } = useCustomLinks();

  const currentHref = useMemo(() => {
    const qs = sp.toString();
    return pathname + (qs ? `?${qs}` : '');
  }, [pathname, sp]);

  const siblings = useMemo(() => {
    if (!menuLoaded || !boardsLoaded) return [] as { label: string; href: string }[];
    const menu = buildMenu(
      menuSet,
      [...boardEntries(boards), ...sectionMenuEntries(secMap), ...linkEntries(links)],
      { loggedIn: !!user, isAdmin, id: user?.id },
    );

    // 정확한 목록 주소가 같은 그룹을 찾는다. 항목 종류는 제한하지 않는다.
    const group = menu.find(m => m.children?.some(c => c.href === currentHref));
    if (!group?.children || group.children.length <= 1) return [];
    return group.children;
  }, [menuLoaded, boardsLoaded, menuSet, boards, secMap, links, user, isAdmin, currentHref]);

  if (siblings.length === 0) return null;

  return (
    <div className="group-sibling-shell">
      <nav className="board-switch-nav group-sibling-nav" aria-label="같은 카테고리 메뉴">
        {siblings.map(item => (
          <button
            key={item.href}
            className={item.href === currentHref ? 'on' : ''}
            onClick={() => {
              if (/^https?:\/\//.test(item.href)) window.open(item.href, '_blank');
              else router.push(item.href);
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
