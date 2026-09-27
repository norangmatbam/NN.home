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
  const [draftId, setDraftId] = useState(selectedId);

  useEffect(() => {
    const h = (e: Event) => {
      if ((e as CustomEvent).detail?.id !== conf.id) return;
      setDraftId(selectedId);
      setOpen(true);
    };
    window.addEventListener('ohome-widget-edit', h);
    return () => window.removeEventListener('ohome-widget-edit', h);
  }, [conf.id, selectedId]);

  const close = () => {
    setDraftId(selectedId);
    setOpen(false);
  };

  const apply = () => {
    if (!draftId) return;
    updateWidget(conf.id, {
      settings: { ...conf.settings, kind: 'character', characterId: draftId },
    }, { persist: true });
    setOpen(false);
  };

  const canView = !!selected && (
    isAdmin || selected.visibility === 'public' || (selected.visibility === 'member' && !!user)
  );

  const go = () => {
    if (!selected || editOn) return;
    router.push(charPath(selected));
  };

  return (
    <>
      <div className="character-widget-card" onClick={go}>
        {canView && selected ? (
          <>
            <div className="character-widget-image">
              <CroppedBlobImg
                fileRef={selected.arts?.[0] ?? selected.thumbId}
                crop={selected.thumbCrop}
                ph={selected.thumbClass}
                label=""
              />
            </div>
            <div className="character-widget-shade" />
            <div className="character-widget-copy">
              <b className="character-widget-name">{selected.name}</b>
              {selected.sub && <span className="character-widget-sub">{selected.sub}</span>}
            </div>
          </>
        ) : (
          <div className="character-widget-empty">
            {isAdmin ? '캐릭터를 선택해 주세요\n편집모드에서 우클릭 → 설정' : '표시할 수 없는 캐릭터입니다'}
          </div>
        )}
      </div>

      <style>{`
        .character-widget-card{
          position:relative;width:100%;height:100%;min-height:120px;
          overflow:hidden;border-radius:var(--radius);background:var(--panel);
          cursor:${selected && !editOn ? 'var(--cur-pointer,pointer)' : 'default'};
        }
        .character-widget-image{position:absolute;inset:0}
        .character-widget-image img{width:100%;height:100%;object-fit:cover}
        .character-widget-shade{
          position:absolute;inset:0;
          background:linear-gradient(to top,rgba(8,10,14,.76) 0%,rgba(8,10,14,.2) 52%,rgba(8,10,14,0) 76%);
        }
        .character-widget-copy{
          position:absolute;left:18px;right:18px;bottom:16px;
          color:#fff;text-shadow:0 1px 8px rgba(0,0,0,.35);
        }
        .character-widget-name{display:block;font-size:22px;line-height:1.18;letter-spacing:.01em}
        .character-widget-sub{display:block;margin-top:5px;font-size:11.5px;line-height:1.45;opacity:.84}
        .character-widget-empty{
          position:absolute;inset:0;display:grid;place-items:center;
          color:var(--faint);font-size:11px;text-align:center;padding:16px;white-space:pre-line;
        }
        @media (max-width:620px){
          .wgt:has(.character-widget-card){height:170px!important;min-height:170px!important}
          .character-widget-card{height:170px!important;min-height:170px!important;border-radius:12px}
          .character-widget-copy{left:14px;right:14px;bottom:13px}
          .character-widget-name{font-size:18px;line-height:1.2}
          .character-widget-sub{
            margin-top:4px;font-size:10.5px;line-height:1.35;
            display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;
            overflow:hidden;
          }
          .character-widget-shade{
            background:linear-gradient(to top,rgba(8,10,14,.8) 0%,rgba(8,10,14,.22) 58%,rgba(8,10,14,0) 82%);
          }
        }
      `}</style>

      <div onClick={e => e.stopPropagation()}>
        <Modal
          open={open}
          onClose={close}
          small
          title={selectedId ? '캐릭터 카드 설정' : '캐릭터 카드 추가'}
          desc="표시할 캐릭터를 고른 뒤 ADD를 눌러야 카드에 적용됩니다"
          actions={<>
            <button className="btn btn-ghost" onClick={close}>CLOSE</button>
            <button className="btn btn-dark" disabled={!draftId} onClick={apply}>
              {selectedId ? 'SAVE' : 'ADD'}
            </button>
          </>}>
          <div style={{ display: 'grid', gap: 10 }}>
            <span className="cp-lb">표시할 캐릭터</span>
            <KSelect
              value={draftId}
              placeholder="캐릭터 선택"
              maxWidth={320}
              options={ownChars.map(c => ({ value: c.id, label: c.name }))}
              onChange={setDraftId}
            />
            {ownChars.length === 0 && <p className="hint" style={{ margin: 0 }}>등록된 캐릭터가 없습니다.</p>}
          </div>
        </Modal>
      </div>
    </>
  );
}
