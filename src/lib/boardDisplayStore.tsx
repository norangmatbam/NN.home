'use client';

import { useCallback, useEffect, useState } from 'react';
import { getRawSetting, setSetting } from './settingStore';

export interface BoardDisplayOptions {
  /** 목록 필터의 「공지」 항목을 표시할지 */
  showNotice: boolean;
  /** 게시글 작성자명을 목록·상세에 표시할지 */
  showAuthor: boolean;
}

type BoardDisplayMap = Record<string, Partial<BoardDisplayOptions>>;

const KEY = 'ohome.boarddisplay.v1';
const DEFAULTS: BoardDisplayOptions = {
  showNotice: true,
  // 기존 사이트에서 목록 작성자를 숨기고 있었으므로 그 동작을 기본값으로 유지한다.
  showAuthor: false,
};

function readMap(): BoardDisplayMap {
  try {
    const raw = getRawSetting(KEY);
    return raw ? JSON.parse(raw) as BoardDisplayMap : {};
  } catch {
    return {};
  }
}

export function boardDisplayOf(boardId: string): BoardDisplayOptions {
  const saved = readMap()[boardId] ?? {};
  return { ...DEFAULTS, ...saved };
}

/** 게시판별 표시 옵션. 설정 저장소를 쓰므로 다른 기기/방문자에게도 동일하게 적용된다. */
export function useBoardDisplay(boardId: string): [BoardDisplayOptions, (patch: Partial<BoardDisplayOptions>) => void] {
  const [value, setValue] = useState<BoardDisplayOptions>(() => boardDisplayOf(boardId));

  useEffect(() => {
    const sync = () => setValue(boardDisplayOf(boardId));
    sync();
    window.addEventListener('ohome-settings', sync);
    return () => window.removeEventListener('ohome-settings', sync);
  }, [boardId]);

  const patch = useCallback((next: Partial<BoardDisplayOptions>) => {
    const map = readMap();
    const merged = { ...DEFAULTS, ...(map[boardId] ?? {}), ...next };
    const saved = { ...map, [boardId]: merged };
    setValue(merged);
    try { setSetting(KEY, saved); } catch { /* 무시 */ }
  }, [boardId]);

  return [value, patch];
}
