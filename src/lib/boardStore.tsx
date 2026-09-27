'use client';
// 게시판 설정 (5.2 게시판 관리) — 말머리(카테고리) 목록 관리 + 뱃지(공지/비밀/접힘·말머리별) 색
import { useCallback, useEffect, useState } from 'react';
import { newId } from './postStore';
import { MAIN_SEC } from './sectionStore';

export interface BoardBadge { id: string; label: string; bg: string; border: string; fg: string }

export const DEFAULT_BOARD_SYSTEM: BoardBadge[] = [
  { id: 'notice', label: '공지', bg: '#1d2025', border: '#1d2025', fg: '#ffffff' },
  { id: 'secret', label: '비밀', bg: '#a63a45', border: '#8c2f39', fg: '#ffffff' },
  { id: 'fold', label: '접힘', bg: '#f2e6e7', border: '#d9b8bc', fg: '#a63a45' },
];

export const DEFAULT_BOARD_CATS: BoardBadge[] = ['잡담', '설정', '합작', '기타'].map(c => ({
  id: `cat-${c}`, label: c, bg: '#eef0f2', border: '#d7dae0', fg: '#5d636d',
}));

export const DEFAULT_GALLERY_BADGES: BoardBadge[] = [
  { id: 'log', label: '로그', bg: '#1d2025', border: '#1d2025', fg: '#ffffff' },
  { id: 'single', label: '단일', bg: '#eef0f2', border: '#d7dae0', fg: '#5d636d' },
  { id: 'vlist', label: '단일(세로)', bg: '#eef0f2', border: '#d7dae0', fg: '#5d636d' },
];

export const DEFAULT_GALLERY_CATS: BoardBadge[] = ['합작', '낙서', '커미션', '설정화'].map(c => ({
  id: `gcat-${c}`, label: c, bg: '#eef0f2', border: '#d7dae0', fg: '#5d636d',
}));

export interface BoardSettings {
  system: BoardBadge[]; cats: BoardBadge[]; gallery: BoardBadge[]; galleryCats: BoardBadge[];
  secGalleryCats?: Record<string, BoardBadge[]>;
}
const DEFAULTS: BoardSettings = {
  system: DEFAULT_BOARD_SYSTEM, cats: DEFAULT_BOARD_CATS,
  gallery: DEFAULT_GALLERY_BADGES, galleryCats: DEFAULT_GALLERY_CATS,
};
const KEY = 'ohome.boardset.v1';

export const galleryCatsOf = (s: BoardSettings, secId: string): BoardBadge[] =>
  (secId === MAIN_SEC ? s.galleryCats : s.secGalleryCats?.[secId] ?? s.galleryCats);

const galleryCatsPatch = (s: BoardSettings, secId: string, cats: BoardBadge[]): Partial<BoardSettings> =>
  (secId === MAIN_SEC ? { galleryCats: cats } : { secGalleryCats: { ...s.secGalleryCats, [secId]: cats } });

export function useBoardSettings() {
  const [st, setSt] = useState<BoardSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = getRawSetting(KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<BoardSettings>;
        setSt({
          ...DEFAULTS,
          ...p,
          system: DEFAULT_BOARD_SYSTEM.map(d => p.system?.find(s => s.id === d.id) ?? d),
          cats: p.cats ?? DEFAULT_BOARD_CATS,
          gallery: DEFAULT_GALLERY_BADGES.map(d => p.gallery?.find(g => g.id === d.id) ?? d),
          galleryCats: p.galleryCats ?? DEFAULT_GALLERY_CATS,
        });
      }
    } catch { /* 기본값 */ }
    setLoaded(true);
  }, []);
  const apply = useCallback((fn: (s: BoardSettings) => BoardSettings) => {
    setSt(s => {
      const n = fn(s);
      try { setSetting(KEY, n); } catch { /* 무시 */ }
      return n;
    });
  }, []);
  const patchSystem = useCallback((id: string, p: Partial<BoardBadge>) =>
    apply(s => ({ ...s, system: s.system.map(b => (b.id === id ? { ...b, ...p } : b)) })), [apply]);
  const patchCat = useCallback((id: string, p: Partial<BoardBadge>) =>
    apply(s => ({ ...s, cats: s.cats.map(b => (b.id === id ? { ...b, ...p } : b)) })), [apply]);
  const addCat = useCallback(() =>
    apply(s => ({ ...s, cats: [...s.cats, { id: newId(), label: '새 말머리', bg: '#eef0f2', border: '#d7dae0', fg: '#5d636d' }] })), [apply]);
  const removeCat = useCallback((id: string) =>
    apply(s => ({ ...s, cats: s.cats.filter(b => b.id !== id) })), [apply]);
  const setCats = useCallback((cats: BoardBadge[]) => apply(s => ({ ...s, cats })), [apply]);
  const patchGallery = useCallback((id: string, p: Partial<BoardBadge>) =>
    apply(s => ({ ...s, gallery: s.gallery.map(b => (b.id === id ? { ...b, ...p } : b)) })), [apply]);
  const mutGalleryCats = useCallback((secId: string, fn: (cats: BoardBadge[]) => BoardBadge[]) =>
    apply(s => ({ ...s, ...galleryCatsPatch(s, secId, fn(galleryCatsOf(s, secId))) })), [apply]);
  const patchGalleryCat = useCallback((secId: string, id: string, p: Partial<BoardBadge>) =>
    mutGalleryCats(secId, cs => cs.map(b => (b.id === id ? { ...b, ...p } : b))), [mutGalleryCats]);
  const addGalleryCat = useCallback((secId: string) =>
    mutGalleryCats(secId, cs => [...cs, { id: newId(), label: '새 말머리', bg: '#eef0f2', border: '#d7dae0', fg: '#5d636d' }]), [mutGalleryCats]);
  const removeGalleryCat = useCallback((secId: string, id: string) =>
    mutGalleryCats(secId, cs => cs.filter(b => b.id !== id)), [mutGalleryCats]);
  const setGalleryCats = useCallback((secId: string, cats: BoardBadge[]) =>
    mutGalleryCats(secId, () => cats), [mutGalleryCats]);
  return {
    st, loaded, patchSystem, patchCat, addCat, removeCat, setCats, patchGallery,
    patchGalleryCat, addGalleryCat, removeGalleryCat, setGalleryCats,
  };
}

export function badgeFor(st: BoardSettings, p: { notice?: boolean; secret?: boolean; category: string }, cats?: BoardBadge[]): BoardBadge {
  if (p.notice) return st.system[0];
  if (p.secret) return st.system[1];
  return (cats ?? st.cats).find(c => c.label === p.category)
    ?? { id: 'etc', label: p.category, bg: '#eef0f2', border: '#d7dae0', fg: '#5d636d' };
}

/* ---------- 게시판 다중 생성 (5.2 v1.9) ---------- */
export type BoardSkin = 'list' | 'ticket' | 'chat';
export type BoardPerm = 'guest' | 'member' | 'admin';

export interface Board {
  id: string;
  name: string;
  desc: string;
  skin: BoardSkin;         // 기본형 / 티켓형 / 대화형
  permWrite: BoardPerm;
  permComment: BoardPerm;
  cats: BoardBadge[];
  fg?: string;
}

const BOARDS_KEY = 'ohome.boards.v1';
export const MAIN_BOARD_ID = 'main';

export const DEFAULT_BOARDS: Board[] = [{
  id: MAIN_BOARD_ID, name: '리스트',
  desc: 'MD / HTML 작성 지원 · 스크립트 실행 불허 · 말머리 · 비밀글 · 접기',
  skin: 'list', permWrite: 'member', permComment: 'member', cats: DEFAULT_BOARD_CATS,
}];

export function useBoards(): {
  boards: Board[]; setBoards: (next: Board[]) => void; loaded: boolean;
  patchBoard: (id: string, p: Partial<Board>) => void;
} {
  const [boards, setSt] = useState<Board[]>(DEFAULT_BOARDS);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = getRawSetting(BOARDS_KEY);
      if (raw) setSt(JSON.parse(raw));
      else {
        const old = getRawSetting(KEY);
        if (old) {
          const cats = (JSON.parse(old) as Partial<BoardSettings>).cats;
          if (cats?.length) setSt([{ ...DEFAULT_BOARDS[0], cats }]);
        }
      }
    } catch { /* 기본값 */ }
    setLoaded(true);
    const sync = () => {
      try {
        const raw = getRawSetting(BOARDS_KEY);
        if (raw) setSt(JSON.parse(raw));
      } catch { /* 무시 */ }
    };
    window.addEventListener('ohome-boards', sync);
    return () => window.removeEventListener('ohome-boards', sync);
  }, []);
  const setBoards = useCallback((next: Board[]) => {
    setSt(next);
    try { setSetting(BOARDS_KEY, next); } catch { /* 무시 */ }
    setTimeout(() => window.dispatchEvent(new Event('ohome-boards')), 0);
  }, []);
  const patchBoard = useCallback((id: string, p: Partial<Board>) => {
    setSt(s => {
      const n = s.map(b => (b.id === id ? { ...b, ...p } : b));
      try { setSetting(BOARDS_KEY, n); } catch { /* 무시 */ }
      setTimeout(() => window.dispatchEvent(new Event('ohome-boards')), 0);
      return n;
    });
  }, []);
  return { boards, setBoards, loaded, patchBoard };
}

export const boardHref = (id: string) => (id === MAIN_BOARD_ID ? '/board' : `/board?b=${id}`);

export function boardBadgeStyle(b?: BoardBadge): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '3px 11px 2px', borderRadius: 999, lineHeight: 'calc(11px*var(--fs,1))',
    background: b?.bg ?? '#eef0f2', border: `1px solid ${b?.border ?? '#d7dae0'}`, color: b?.fg ?? '#5d636d',
    fontSize: 'calc(10.5px*var(--fs,1))', fontWeight: 700, letterSpacing: '.05em',
    fontFamily: 'var(--sans)', whiteSpace: 'nowrap',
  };
}
import type React from 'react';
import { getRawSetting, setSetting } from './settingStore';
