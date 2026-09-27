'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { boardEntries, buildMenu, useMenuSettings } from '@/lib/menuStore';
import { useBoards } from '@/lib/boardStore';
import { sectionMenuEntries, useSections } from '@/lib/sectionStore';
import { linkEntries, useCustomLinks } from '@/lib/linkStore';
import { useAuth } from '@/lib/auth';

const MOBILE_LABELS = new Set(['background', 'foreground']);

/** 모바일 상단에 꼭 남겨 둘 두 메뉴.
 * PC GNB는 기존 그대로 두고, 모바일에서 숨겨진 GNB 대신 BACKGROUND / FOREGROUND만 노출한다. */
export function MobileQuickNav() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [menuSet, , menuLoaded] = useMenuSettings();
  const { boards, loaded: boardsLoaded } = useBoards();
  const { map: secMap } = useSections();
  const { links } = useCustomLinks();

  const quick = useMemo(() => {
    if (!menuLoaded || !boardsLoaded) return [] as { label: string; href: string }[];
    const menu = buildMenu(
      menuSet,
      [...boardEntries(boards), ...sectionMenuEntries(secMap), ...linkEntries(links)],
      { loggedIn: !!user, isAdmin, id: user?.id },
    );
    const out: { label: string; href: string }[] = [];
    for (const item of menu) {
      const key = item.label.trim().toLowerCase();
      if (MOBILE_LABELS.has(key)) {
        const href = item.children?.[0]?.href ?? item.href;
        if (href) out.push({ label: item.label, href });
        continue;
      }
      const child = item.children?.find(c => MOBILE_LABELS.has(c.label.trim().toLowerCase()));
      if (child?.href) out.push({ label: child.label, href: child.href });
    }
    return out;
  }, [menuLoaded, boardsLoaded, menuSet, boards, secMap, links, user, isAdmin]);

  if (quick.length === 0) return null;
  return (
    <nav className="mobile-quick-nav" aria-label="모바일 빠른 메뉴">
      {quick.map(item => (
        <button key={`${item.label}:${item.href}`} onClick={() => router.push(item.href)}>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
