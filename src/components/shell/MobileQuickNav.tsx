'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { boardEntries, buildMenu, useMenuSettings } from '@/lib/menuStore';
import { useBoards } from '@/lib/boardStore';
import { sectionMenuEntries, useSections } from '@/lib/sectionStore';
import { linkEntries, useCustomLinks } from '@/lib/linkStore';
import { useAuth } from '@/lib/auth';

const MOBILE_GROUPS = new Set(['background', 'foreground']);

type MobileGroup = {
  label: string;
  children: { label: string; href: string }[];
};

/** 모바일 TopBar 2행.
 * BACKGROUND / FOREGROUND 같은 상위 그룹을 누르면 프로필 메뉴처럼
 * 하위 게시판·섹션 목록을 드롭다운으로 보여 준다. */
export function MobileQuickNav() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [menuSet, , menuLoaded] = useMenuSettings();
  const { boards, loaded: boardsLoaded } = useBoards();
  const { map: secMap } = useSections();
  const { links } = useCustomLinks();
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => {
    if (!menuLoaded || !boardsLoaded) return [] as MobileGroup[];
    const menu = buildMenu(
      menuSet,
      [...boardEntries(boards), ...sectionMenuEntries(secMap), ...linkEntries(links)],
      { loggedIn: !!user, isAdmin, id: user?.id },
    );

    return menu.flatMap(item => {
      if (!MOBILE_GROUPS.has(item.label.trim().toLowerCase())) return [];
      const children = item.children?.map(c => ({ label: c.label, href: c.href }))
        ?? (item.href ? [{ label: item.label, href: item.href }] : []);
      return children.length ? [{ label: item.label, children }] : [];
    });
  }, [menuLoaded, boardsLoaded, menuSet, boards, secMap, links, user, isAdmin]);

  useEffect(() => {
    if (!openLabel) return;
    const close = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpenLabel(null);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [openLabel]);

  useEffect(() => {
    if (openLabel && !groups.some(g => g.label === openLabel)) setOpenLabel(null);
  }, [groups, openLabel]);

  const openGroup = groups.find(g => g.label === openLabel);
  const nav = (href: string) => {
    setOpenLabel(null);
    if (/^https?:\/\//.test(href)) window.open(href, '_blank');
    else router.push(href);
  };

  return (
    <div className="mobile-quick-wrap" ref={wrapRef}>
      <nav className="mobile-quick-nav" aria-label="모바일 상위 카테고리">
        {groups.map(item => {
          const opened = openLabel === item.label;
          return (
            <button
              key={item.label}
              className={opened ? 'open' : ''}
              aria-expanded={opened}
              aria-haspopup="menu"
              onClick={() => setOpenLabel(v => v === item.label ? null : item.label)}
            >
              {item.label}<span className="mobile-menu-arrow">▾</span>
            </button>
          );
        })}
      </nav>

      {openGroup && (
        <div className="mobile-group-menu" role="menu" aria-label={`${openGroup.label} 하위 메뉴`}>
          {openGroup.children.map(item => (
            <button key={item.href} role="menuitem" onClick={() => nav(item.href)}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
