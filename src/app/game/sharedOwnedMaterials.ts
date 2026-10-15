'use client';

import { useCallback, useEffect, useState } from 'react';

export const SHARED_MATERIAL_NAMES = [
  '백금강괴',
  '특급 목재',
  '특급 가죽',
  '특급 옷감',
  '특급 실크',
  '허상의 마력석',
  '포식의 마력석',
  '심해의 마력석',
  '야생의 영혼석',
  '삼림의 영혼석',
  '공명의 영혼석',
  '파동의 영혼석',
  '망령의 영혼석',
  '원념의 영혼석',
] as const;

export type SharedMaterialName = typeof SHARED_MATERIAL_NAMES[number];
export type SharedOwnedMaterials = Record<SharedMaterialName, number>;

const STORAGE_KEY = 'nn-game-owned-materials-v1';
const EVENT_NAME = 'nn-game-owned-materials-change';

export function emptySharedOwned(): SharedOwnedMaterials {
  return Object.fromEntries(
    SHARED_MATERIAL_NAMES.map(name => [name, 0])
  ) as SharedOwnedMaterials;
}

function sanitize(value: unknown) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function readOwned(): SharedOwnedMaterials {
  const base = emptySharedOwned();
  if (typeof window === 'undefined') return base;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Record<SharedMaterialName, unknown>>;
    for (const name of SHARED_MATERIAL_NAMES) {
      if (parsed[name] != null) base[name] = sanitize(parsed[name]);
    }
  } catch {}

  return base;
}

function writeOwned(next: SharedOwnedMaterials) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
}

export function useSharedOwnedMaterials() {
  const [owned, setOwned] = useState<SharedOwnedMaterials>(() => emptySharedOwned());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setOwned(readOwned());
    setLoaded(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setOwned(readOwned());
    };
    const onLocal = (event: Event) => {
      const custom = event as CustomEvent<SharedOwnedMaterials>;
      if (custom.detail) setOwned(custom.detail);
      else setOwned(readOwned());
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(EVENT_NAME, onLocal);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(EVENT_NAME, onLocal);
    };
  }, []);

  const setMaterial = useCallback((name: SharedMaterialName, value: number) => {
    setOwned(current => {
      const next = { ...current, [name]: sanitize(value) };
      try { writeOwned(next); } catch {}
      return next;
    });
  }, []);

  const replaceOwned = useCallback((nextOwned: SharedOwnedMaterials) => {
    const next = emptySharedOwned();
    for (const name of SHARED_MATERIAL_NAMES) next[name] = sanitize(nextOwned[name]);
    setOwned(next);
    try { writeOwned(next); } catch {}
  }, []);

  return { owned, setMaterial, replaceOwned, loaded };
}
