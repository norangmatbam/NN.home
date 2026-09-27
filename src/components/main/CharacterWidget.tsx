'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WidgetConf, useMainStore } from '@/lib/mainStore';
import { useLocalList } from '@/lib/postStore';
import { Character, CHAR_SEED, charPath } from '@/lib/charStore';
import { useAuth } from '@/lib/auth';
import { CroppedBlobImg } from '@/components/ui/CropEditor';
import { Modal } from '@/components/ui/Modal';
import { KSelect } from '@/components/ui/Kit';

export function CharacterWidget({ conf }: { conf: WidgetConf }) {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { editOn, updateWidget } = useMainStore();
  const [chars] = useLocalList<Character>('ohome.chars.v1', CHAR_SEED);
  const [open, setOpen] = useState(false);

  const ownChars = useMemo(() => chars.filter(c => c.own), [chars]);
  const selectedId = (conf.settings.characterId as string | undefined) ?? '';
  const selected = ownChars.find(c => c.id === selectedId);

  useEffect(() => {
    const h = (e: Event) => {
      if ((e as CustomEvent).detail?.id === conf.id) setOpen(true);
    };
    window.addEventListener('ohome-widget-edit', h);
    return () => window.removeEventListener('ohome-widget-edit', h);
  }, [conf.id]);

  useEffect(() => {
    if (selectedId || ownChars.length === 0) return;
    updateWidget(conf.id, {
      settings: { ...conf.settings, kind: 'character', characterId: ownChars[0].id },
    }, { persist: true });
  }, [selectedId, ownChars, conf.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const canView = !!selected && (
    isAdmin || selected.visibility === 'public' || (selected.visibility === 'member' && !!user)
  );

  const go = () => {
    if (!selected || editOn) return;
    router.push(charPath(selected));
  };

  return (
    <>
      <div
        className="character-widget-card"
        onClick={go}
        style={{
          position: 'relative', width: '100%', height: '100%', minHeight: 120,
          overflow: 'hidden', borderRadius: 'var(--radius)',
          cursor: selected && !editOn ? 'var(--cur-pointer,pointer)' : undefined,
          background: 'var(--panel)',
        }}>
        {canView && selected ? (
          <>
            <div style={{ position: 'absolute', inset: 0 }}>
              <CroppedBlobImg
                fileRef={selected.arts?.[0] ?? selected.thumbId}
                crop={selected.thumbCrop}
                ph={selected.thumbClass}
                label=""
              />
            </div>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(8,10,14,.74) 0%, rgba(8,10,14,.18) 52%, rgba(8,10,14,0) 76%)',
            }} />
            <div style={{
              position: 'absolute', left: 18, right: 18, bottom: 16,
              color: '#fff', textShadow: '0 1px 8px rgba(0,0,0,.35)',
            }}>
              <b style={{ display: 'block', fontSize: 22, lineHeight: 1.18, letterSpacing: '.01em' }}>{selected.name}</b>
              {selected.sub && (
                <span style={{ display: 'block', marginTop: 5, fontSize: 11.5, lineHeight: 1.45, opacity: .84 }}>
                  {selected.sub}
                </span>
              )}
            </div>
          </>
        ) : (
          <div style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
            color: 'var(--faint)', fontSize: 11, textAlign: 'center', padding: 16,
          }}>
            {isAdmin ? '캐릭터를 선택해 주세요\n편집모드에서 우클릭 → 설정' : '표시할 수 없는 캐릭터입니다'}
          </div>
        )}
      </div>

      <div onClick={e => e.stopPropagation()}>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          small
          title="캐릭터 카드"
          desc="대표 썸네일을 배경으로 이름과 한 줄 소개를 표시합니다">
          <div style={{ display: 'grid', gap: 10 }}>
            <span className="cp-lb">표시할 캐릭터</span>
            <KSelect
              value={selectedId}
              placeholder="캐릭터 선택"
              maxWidth={320}
              options={ownChars.map(c => ({ value: c.id, label: c.name }))}
              onChange={id => updateWidget(conf.id, {
                settings: { ...conf.settings, kind: 'character', characterId: id },
              }, { persist: true })}
            />
            {ownChars.length === 0 && <p className="hint" style={{ margin: 0 }}>등록된 캐릭터가 없습니다.</p>}
          </div>
        </Modal>
      </div>
    </>
  );
}
