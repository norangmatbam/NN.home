'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

/** 관리자 전용 CONVERT 진입 메뉴.
 * 기존 TopBar/MobileQuickNav 구조를 건드리지 않고 실제 메뉴 DOM에 버튼을 포털로 붙인다. */
export function AdminConvertMenu() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [desktopTarget, setDesktopTarget] = useState<HTMLElement | null>(null);
  const [mobileTarget, setMobileTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const find = () => {
      setDesktopTarget(document.querySelector('.topbar .gnb:not(.gnb-measure)') as HTMLElement | null);
      setMobileTarget(document.querySelector('.mobile-quick-nav') as HTMLElement | null);
    };
    find();
    const obs = new MutationObserver(find);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  if (!isAdmin) return null;

  const button = (kind: 'desktop' | 'mobile') => (
    <button
      type="button"
      className={`admin-convert-nav admin-convert-${kind}`}
      onClick={() => router.push('/convert/kakao')}
    >
      CONVERT
    </button>
  );

  return <>
    {desktopTarget && createPortal(button('desktop'), desktopTarget)}
    {mobileTarget && createPortal(button('mobile'), mobileTarget)}
  </>;
}
