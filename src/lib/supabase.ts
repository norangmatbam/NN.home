'use client';
// (호환 창구) 예전 코드가 쓰던 이름들 — 실제 동작은 백엔드 어댑터가 한다.
// 새 코드는 '@/lib/backend'를 직접 쓸 것.
import { initBackend, backend, isServerMode as backendIsServerMode } from './backend';
import { loadServerConfig } from './serverConfig';

/** 앱 시작 시 1회 — 런타임 설정을 읽어 백엔드를 확정 */
export async function initSupabase() {
  return initBackend(await loadServerConfig());
}

export const isServerMode = () => backendIsServerMode();
export const hasBackend = () => backend() !== null;

/**
 * 회원 관리자 권한 변경 — 환경설정 > 회원/보안의 회원 상세에서 사용.
 *
 * service_role 키는 쓰지 않는다. 현재 로그인 세션의 anon 클라이언트로 profiles.role만 UPDATE하고,
 * Supabase RLS(public.is_admin())가 "관리자만 다른 회원 역할 변경"을 최종 검증한다.
 * 본인 강등 금지는 UI뿐 아니라 여기서도 한 번 더 막아 실수로 관리자 권한을 잃지 않게 한다.
 */
export async function setMemberAdminRole(
  memberId: string,
  role: 'admin' | 'member',
): Promise<{ ok: boolean; error?: string }> {
  const cfg = await loadServerConfig();
  if (!cfg || cfg.kind !== 'supabase') {
    return { ok: false, error: '이 권한 변경 기능은 현재 Supabase 연결에서 사용할 수 있습니다.' };
  }

  try {
    const { createBrowserClient } = await import('@supabase/ssr');
    const sb = createBrowserClient(cfg.url.replace(/\/$/, ''), cfg.anonKey);
    const { data: auth } = await sb.auth.getUser();
    const me = auth.user;
    if (!me) return { ok: false, error: '로그인이 필요합니다.' };
    if (me.id === memberId && role !== 'admin') {
      return { ok: false, error: '본인의 관리자 권한은 해제할 수 없습니다.' };
    }

    const { error } = await sb.from('profiles').update({ role }).eq('id', memberId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
