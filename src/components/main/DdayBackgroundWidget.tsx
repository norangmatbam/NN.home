'use client';

import React, { useEffect, useState } from 'react';
import { WidgetConf, useMainStore } from '@/lib/mainStore';
import { useAuth } from '@/lib/auth';
import { useFonts } from '@/lib/fontStore';
import { putBlob, BlobImg } from '@/lib/blobStore';
import { Modal } from '@/components/ui/Modal';
import { KStep } from '@/components/ui/Kit';
import { ColorField } from '@/components/ui/ColorField';
import { DdayEditor } from '@/components/main/widgetEditors';
import { useToast } from '@/components/ui/Toast';

interface DdayItem { title: string; date: string; plusOne?: boolean }

function ddayLabel(date: string, plusOne?: boolean): { label: string; passed: boolean; near: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date + 'T00:00:00');
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (plusOne && diff <= 0) return { label: `D+${-diff + 1}`, passed: true, near: false };
  if (diff === 0) return { label: 'D-DAY', passed: false, near: true };
  return diff > 0
    ? { label: `D-${diff}`, passed: false, near: diff <= 7 }
    : { label: `D+${-diff}`, passed: true, near: false };
}

export function DdayBackgroundWidget({ conf }: { conf: WidgetConf }) {
  const { isAdmin } = useAuth();
  const { editOn, updateWidget } = useMainStore();
  const { familyOf } = useFonts();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  const items = (conf.settings.items as DdayItem[]) ?? [];
  const dFontId = (conf.settings.fontId as string | undefined) ?? 'serif';
  const dColor = conf.settings.color as string | undefined;
  const bgImage = conf.settings.bgImage as string | undefined;
  const overlayColor = (conf.settings.overlayColor as string | undefined) ?? '#000000';
  const overlayOpacity = Math.max(0, Math.min(100, (conf.settings.overlayOpacity as number | undefined) ?? 0));
  const inputId = `dday-bg-${conf.id}`;

  useEffect(() => {
    const h = (e: Event) => {
      if ((e as CustomEvent).detail?.id === conf.id) setOpen(true);
    };
    window.addEventListener('ohome-widget-edit', h);
    return () => window.removeEventListener('ohome-widget-edit', h);
  }, [conf.id]);

  const setMeta = (patch: Record<string, unknown>) =>
    updateWidget(conf.id, { settings: { ...conf.settings, ...patch } }, { persist: true });

  return (
    <div className="panel widget" style={{ cursor: isAdmin ? 'pointer' : undefined, position: 'relative', overflow: 'hidden' }}
      onClick={e => {
        if ((e.target as HTMLElement).closest('.modal-ov')) return;
        if (isAdmin && !editOn) setOpen(true);
      }}>
      {bgImage && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <BlobImg fileRef={bgImage} ph="" />
          {overlayOpacity > 0 && (
            <div style={{ position: 'absolute', inset: 0, background: overlayColor, opacity: overlayOpacity / 100 }} />
          )}
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        <h4>D-DAY {isAdmin && <span className="more">관리 ›</span>}</h4>
        {items.map(it => {
          const d = ddayLabel(it.date, it.plusOne);
          return (
            <div className="dday-row" key={`${it.title}|${it.date}`}>
              <span>{it.title}</span>
              <b className={d.near && !dColor ? 'd-red' : ''}
                style={{ fontFamily: familyOf(dFontId), color: dColor }}>{d.label}</b>
            </div>
          );
        })}
        {items.length === 0 && <p className="hint">등록된 D-day가 없습니다</p>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="D-day 관리"
        desc="D-day 내용과 배경 이미지 · 오버레이를 함께 설정할 수 있습니다"
        actions={<button className="btn btn-dark" onClick={() => setOpen(false)}>CLOSE</button>}>
        {open && (
          <div style={{ display: 'grid', gap: 16 }}>
            <DdayEditor conf={conf} />

            <div style={{ paddingTop: 12, borderTop: '1px dashed var(--line)', display: 'grid', gap: 10 }}>
              <span className="cp-lb">배경 이미지</span>
              <input id={inputId} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={async e => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  try {
                    const ref = await putBlob(f);
                    setMeta({ bgImage: ref });
                    toast('D-DAY 배경 이미지가 저장되었습니다');
                  } catch {
                    toast('배경 이미지 업로드에 실패했습니다');
                  }
                }} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={() => document.getElementById(inputId)?.click()}>
                  {bgImage ? '이미지 교체' : '이미지 업로드'}
                </button>
                {bgImage && (
                  <button className="btn btn-ghost" onClick={() => setMeta({ bgImage: undefined })}>이미지 제거</button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="cp-lb">오버레이 색상</span>
                <ColorField value={overlayColor} onChange={hex => setMeta({ overlayColor: hex })} />
                <span className="cp-lb">강도</span>
                <KStep value={overlayOpacity} min={0} max={100} step={5} suffix="%"
                  onChange={v => setMeta({ overlayOpacity: v })} />
              </div>
              <p className="hint" style={{ margin: 0 }}>이미지는 위젯을 꽉 채우며(cover), 오버레이는 0%이면 표시되지 않습니다.</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
