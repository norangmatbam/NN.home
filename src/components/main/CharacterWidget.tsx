'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { WidgetConf, useMainStore } from '@/lib/mainStore';
import { useLocalList } from '@/lib/postStore';
import { Character, CHAR_SEED } from '@/lib/charStore';
import { useAuth } from '@/lib/auth';
import { CroppedBlobImg } from '@/components/ui/CropEditor';
import { Modal } from '@/components/ui/Modal';
import { KSelect } from '@/components/ui/Kit';

export function CharacterWidget({ conf }: { conf: WidgetConf }) {
  const { user, isAdmin } = useAuth();
  const { updateWidget } = useMainStore();
  const [chars] = useLocalList<Character>('ohome.chars.v1', CHAR_SEED);
  const [open, setOpen] = useState(false);

  const ownChars = useMemo(() => chars.filter(c => c.own), [chars]);
  const savedIds = useMemo(() => {
    const pair = conf.settings.characterIds as string[] | undefined;
    if (Array.isArray(pair) && pair.length) return pair.filter(Boolean).slice(0, 2);
    const legacy = conf.settings.characterId as string | undefined;
    return legacy ? [legacy] : [];
  }, [conf.settings]);

  const selected = savedIds
    .map(id => ownChars.find(c => c.id === id))
    .filter((c): c is Character => !!c);

  const [draftIds, setDraftIds] = useState<[string, string]>([
    savedIds[0] ?? '',
    savedIds[1] ?? '',
  ]);

  useEffect(() => {
    const h = (e: Event) => {
      if ((e as CustomEvent).detail?.id !== conf.id) return;
      setDraftIds([savedIds[0] ?? '', savedIds[1] ?? '']);
      setOpen(true);
    };
    window.addEventListener('ohome-widget-edit', h);
    return () => window.removeEventListener('ohome-widget-edit', h);
  }, [conf.id, savedIds]);

  const close = () => {
    setDraftIds([savedIds[0] ?? '', savedIds[1] ?? '']);
    setOpen(false);
  };

  const apply = () => {
    if (!draftIds[0]) return;
    const ids = draftIds.filter((id, i, arr) => !!id && arr.indexOf(id) === i).slice(0, 2);
    const { characterId: _legacy, ...rest } = conf.settings;
    updateWidget(conf.id, {
      settings: { ...rest, kind: 'character', characterIds: ids },
    }, { persist: true });
    setOpen(false);
  };

  const canView = (c: Character) => (
    isAdmin || c.visibility === 'public' || (c.visibility === 'member' && !!user)
  );

  const renderCard = (c: Character) => {
    const visible = canView(c);
    return (
      <div key={c.id} className="character-widget-card">
        {visible ? (
          <>
            <div className="character-widget-image">
              <CroppedBlobImg
                fileRef={c.arts?.[0] ?? c.thumbId}
                crop={c.thumbCrop}
                ph={c.thumbClass}
                label=""
              />
            </div>
            <div className="character-widget-shade" />
            <div className="character-widget-copy">
              <b className="character-widget-name">{c.name}</b>
              {c.sub && <span className="character-widget-sub">{c.sub}</span>}
            </div>
          </>
        ) : (
          <div className="character-widget-empty">표시할 수 없는 캐릭터입니다</div>
        )}
      </div>
    );
  };

  return (
    <>
      {selected.length > 0 ? (
        <div className={`character-widget-pair ${selected.length === 1 ? 'single' : 'double'}`}>
          {selected.map(renderCard)}
        </div>
      ) : (
        <div className="character-widget-pair single">
          <div className="character-widget-card">
            <div className="character-widget-empty">
              {isAdmin ? '캐릭터를 선택해 주세요\n편집모드에서 우클릭 → 설정' : '표시할 캐릭터가 없습니다'}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .character-widget-pair{
          display:grid;grid-template-columns:1fr;gap:10px;
          width:100%;height:100%;min-height:150px;
        }
        .character-widget-pair.double{grid-template-columns:repeat(2,minmax(0,1fr))}
        .character-widget-card{
          position:relative;width:100%;height:100%;min-height:150px;
          overflow:hidden;border-radius:var(--radius);background:var(--panel);
        }
        .character-widget-image{position:absolute;inset:0}
        .character-widget-image img{width:100%;height:100%;object-fit:cover}
        .character-widget-shade{
          position:absolute;inset:0;
          background:linear-gradient(
            to top,
            rgba(8,10,14,.78) 0%,
            rgba(8,10,14,.32) 24%,
            rgba(8,10,14,.12) 40%,
            rgba(8,10,14,0) 50%
          );
        }
        .character-widget-copy{
          position:absolute;left:16px;right:16px;bottom:14px;
          color:#fff;text-shadow:0 1px 8px rgba(0,0,0,.38);
        }
        .character-widget-name{display:block;font-size:20px;line-height:1.18;letter-spacing:.01em}
        .character-widget-sub{
          display:-webkit-box;margin-top:5px;font-size:11px;line-height:1.4;opacity:.86;
          -webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;
        }
        .character-widget-empty{
          position:absolute;inset:0;display:grid;place-items:center;
          color:var(--faint);font-size:11px;text-align:center;padding:16px;white-space:pre-line;
        }
        @media (max-width:620px){
          .wgt:has(.character-widget-pair){height:auto!important;min-height:0!important}
          .character-widget-pair{
            height:auto!important;min-height:0!important;gap:8px;
          }
          .character-widget-pair.double{grid-template-columns:repeat(2,minmax(0,1fr))}
          .character-widget-pair.single{grid-template-columns:minmax(0,1fr)}
          .character-widget-card{
            height:auto!important;min-height:0!important;aspect-ratio:3/4;border-radius:12px;
          }
          .character-widget-pair.single .character-widget-card{aspect-ratio:16/10}
          .character-widget-copy{left:12px;right:12px;bottom:11px}
          .character-widget-name{font-size:17px;line-height:1.2}
          .character-widget-sub{margin-top:4px;font-size:10px;line-height:1.35;-webkit-line-clamp:2}
          .character-widget-shade{
            background:linear-gradient(
              to top,
              rgba(8,10,14,.84) 0%,
              rgba(8,10,14,.34) 24%,
              rgba(8,10,14,.14) 40%,
              rgba(8,10,14,0) 50%
            );
          }
        }
      `}</style>

      <div onClick={e => e.stopPropagation()}>
        <Modal
          open={open}
          onClose={close}
          small
          title={savedIds.length ? '캐릭터 위젯 설정' : '캐릭터 위젯 추가'}
          desc="한 위젯에 최대 두 캐릭터를 선택할 수 있습니다"
          actions={<>
            <button className="btn btn-ghost" onClick={close}>CLOSE</button>
            <button className="btn btn-dark" disabled={!draftIds[0]} onClick={apply}>
              {savedIds.length ? 'SAVE' : 'ADD'}
            </button>
          </>}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gap: 7 }}>
              <span className="cp-lb">캐릭터 1</span>
              <KSelect
                value={draftIds[0]}
                placeholder="첫 번째 캐릭터 선택"
                maxWidth={320}
                options={ownChars.map(c => ({ value: c.id, label: c.name }))}
                onChange={v => setDraftIds(([_, b]) => [v, b === v ? '' : b])}
              />
            </div>
            <div style={{ display: 'grid', gap: 7 }}>
              <span className="cp-lb">캐릭터 2 <small style={{ color: 'var(--faint)', fontWeight: 400 }}>(선택)</small></span>
              <KSelect
                value={draftIds[1]}
                placeholder="두 번째 캐릭터 선택 안 함"
                maxWidth={320}
                options={[
                  { value: '', label: '선택 안 함' },
                  ...ownChars.filter(c => c.id !== draftIds[0]).map(c => ({ value: c.id, label: c.name })),
                ]}
                onChange={v => setDraftIds(([a]) => [a, v])}
              />
            </div>
            {ownChars.length === 0 && <p className="hint" style={{ margin: 0 }}>등록된 캐릭터가 없습니다.</p>}
          </div>
        </Modal>
      </div>
    </>
  );
}
