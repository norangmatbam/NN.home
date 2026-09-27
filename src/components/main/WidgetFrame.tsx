'use client';
// 위젯 프레임 (4.0 편집모드) — 드래그 이동 · 우하단 리사이즈 · 우클릭 겹침 순서 · 클릭 차단
// 프로토타입의 편집 모델을 계승: 그리드 배치는 유지하고 transform 오프셋 + 크기 동결(px)로 조작
import React, { useEffect, useRef, useState } from 'react';
import { WidgetConf, useMainStore } from '@/lib/mainStore';
import { ConfirmModal } from '@/components/ui/Modal';

export function WidgetFrame({ conf, mobileOrder, children, className, style, onCtx }: {
  conf: WidgetConf;
  mobileOrder: number;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onCtx: (id: string, x: number, y: number) => void;
}) {
  const { editOn, gridOn, updateWidget } = useMainStore();
  // 메인은 항상 고정 캔버스 (v1.9 — 반응형 옵션 제거, PC/모바일 두 가지만) — 저장 크기 상시 유지
  const useSize = true;
  const ref = useRef<HTMLDivElement>(null);
  // Shift+드래그 중앙 정렬에서 폭이 20px 배수가 아니라 딱 가운데가 안 될 때의 안내 (v1.9 사용자 요청)
  const [centerAsk, setCenterAsk] = useState<{ w: number; canvasW: number; grow: number; shrink: number } | null>(null);

  // 편집모드 진입 시 크기 동결 (v1.8)
  useEffect(() => {
    if (!editOn || !ref.current) return;
    if (conf.w == null || conf.h == null) {
      const r = ref.current.getBoundingClientRect();
      if (r.width > 2) {
        updateWidget(conf.id, {
          w: Math.max(160, Math.round(r.width)),
          h: Math.max(80, Math.round(r.height)),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOn]);

  const abs = conf.ax != null && conf.ay != null;

  const onPointerDown = (e: React.PointerEvent) => {
    if (!editOn || e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (!ref.current?.contains(t)) return;
    if (t.closest('.rs') || t.closest('.rr')) return;
    // 폰에서 브라우저의 '데스크톱 사이트'로 편집할 때는 손가락 스크롤과 위젯 드래그가 충돌한다.
    // 터치는 작은 상단 그립에서만 이동을 시작하고, 마우스는 기존처럼 위젯 어디서든 드래그 가능.
    if (e.pointerType === 'touch' && !t.closest('.wgt-move-handle')) return;
    e.preventDefault();
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* 브라우저 미지원 */ }
    document.body.classList.add('drag-move');
    const sx = e.clientX, sy = e.clientY;
    if (abs) {
      const bx = conf.ax!, by = conf.ay!;
      const canvasW = (ref.current?.closest('.main-grid') as HTMLElement | null)?.clientWidth ?? 0;
      const myW = () => conf.w ?? Math.round(ref.current?.getBoundingClientRect().width ?? 0);
      let centered = false;
      const mv = (ev: PointerEvent) => {
        const nx = bx + (ev.clientX - sx), ny = by + (ev.clientY - sy);
        const snap = gridOn && !conf.freeMove;
        if (ev.shiftKey && canvasW > 0) {
          centered = true;
          const cx = (canvasW - myW()) / 2;
          updateWidget(conf.id, {
            ax: snap ? Math.round(cx / 10) * 10 : Math.round(cx),
            ay: snap ? Math.round(ny / 10) * 10 : ny,
          });
          return;
        }
        centered = false;
        if (snap) updateWidget(conf.id, { ax: Math.round(nx / 10) * 10, ay: Math.round(ny / 10) * 10 });
        else updateWidget(conf.id, { ax: nx, ay: ny });
      };
      const up = () => {
        document.body.classList.remove('drag-move');
        window.removeEventListener('pointermove', mv);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        if (centered && gridOn && !conf.freeMove && canvasW > 0) {
          const w = myW();
          const r = (((canvasW - w) % 20) + 20) % 20;
          if (r !== 0) setCenterAsk({ w, canvasW, grow: r, shrink: 20 - r });
        }
      };
      window.addEventListener('pointermove', mv, { passive: false });
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      return;
    }
    const bx = conf.tx, by = conf.ty;
    const gr = ref.current?.closest('.main-grid')?.getBoundingClientRect();
    const r0 = ref.current?.getBoundingClientRect();
    const natX = gr && r0 ? r0.left - bx - gr.left : 0;
    const natY = gr && r0 ? r0.top - by - gr.top : 0;
    const mv = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (gridOn && !conf.freeMove) {
        updateWidget(conf.id, {
          tx: Math.round((natX + bx + dx) / 10) * 10 - natX,
          ty: Math.round((natY + by + dy) / 10) * 10 - natY,
        });
      } else {
        updateWidget(conf.id, { tx: bx + dx, ty: by + dy });
      }
    };
    const up = () => {
      document.body.classList.remove('drag-move');
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', mv, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  // 기울기 — 왼쪽 위 핸들 드래그로 위젯 중심 기준 회전
  const rotatable = conf.type === 'deco' || conf.type === 'freetext';
  const onRotDown = (e: React.PointerEvent) => {
    if (!editOn) return;
    e.stopPropagation(); e.preventDefault();
    const r = ref.current!.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const base = conf.rot ?? 0;
    const a0 = Math.atan2(e.clientY - cy, e.clientX - cx);
    document.body.classList.add('drag-move');
    const mv = (ev: PointerEvent) => {
      let deg = base + (Math.atan2(ev.clientY - cy, ev.clientX - cx) - a0) * 180 / Math.PI;
      deg = gridOn && !conf.freeMove ? Math.round(deg / 5) * 5 : Math.round(deg);
      if (deg > 180) deg -= 360;
      if (deg < -180) deg += 360;
      updateWidget(conf.id, { rot: deg === 0 ? undefined : deg });
    };
    const up = () => {
      document.body.classList.remove('drag-move');
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', mv, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  // 리사이즈 — 실제 보이는 모서리는 작게, 터치 판정 영역은 40px로 크게 잡는다.
  const onResizeDown = (e: React.PointerEvent) => {
    if (!editOn) return;
    e.stopPropagation(); e.preventDefault();
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* 브라우저 미지원 */ }
    document.body.classList.add('drag-rs');
    const r = ref.current!.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const gr = ref.current!.closest('.main-grid')?.getBoundingClientRect();
    const absL = abs ? conf.ax! : (gr ? r.left - gr.left : 0);
    const absT = abs ? conf.ay! : (gr ? r.top - gr.top : 0);
    const mv = (ev: PointerEvent) => {
      ev.preventDefault();
      const dw = ev.clientX - sx, dh = ev.clientY - sy;
      let w = r.width + dw, h = r.height + dh;
      if (gridOn && !conf.freeMove) {
        w = Math.round((absL + w) / 10) * 10 - absL;
        h = Math.round((absT + h) / 10) * 10 - absT;
      }
      updateWidget(conf.id, { w: Math.max(160, w), h: Math.max(80, h) });
    };
    const up = () => {
      document.body.classList.remove('drag-rs');
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', mv, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  return (
    <div
      ref={ref}
      data-wid={conf.id}
      className={`wgt ${useSize && conf.w != null ? 'sized' : ''} ${conf.mOff ? 'wgt-hide-m' : ''} ${className ?? ''}`}
      style={{
        ...style,
        order: mobileOrder,
        ...(abs
          ? {
            position: 'absolute' as const, left: conf.ax, top: conf.ay, margin: 0,
            transform: conf.rot ? `rotate(${conf.rot}deg)` : undefined,
          }
          : {
            transform: [
              conf.tx || conf.ty ? `translate(${conf.tx}px, ${conf.ty}px)` : '',
              conf.rot ? `rotate(${conf.rot}deg)` : '',
            ].join(' ').trim() || undefined,
          }),
        width: useSize && conf.w != null ? conf.w : undefined,
        height: useSize && conf.h != null ? conf.h : undefined,
        zIndex: conf.z,
      }}
      onPointerDown={onPointerDown}
      onContextMenu={e => {
        if (!editOn) return;
        if (!ref.current?.contains(e.target as Node)) return;
        e.preventDefault();
        onCtx(conf.id, e.clientX, e.clientY);
      }}
      onClickCapture={e => {
        if (!editOn) return;
        const t = e.target as HTMLElement;
        if (!ref.current?.contains(t)) return;
        if (t.closest('.rs') || t.closest('.rr') || t.closest('.wgt-move-handle')) return;
        e.stopPropagation(); e.preventDefault();
      }}
    >
      {editOn && (
        <span
          className="wgt-move-handle"
          data-tip="드래그해서 이동"
          style={{
            position: 'absolute', top: 7, left: '50%', transform: 'translateX(-50%)', zIndex: 40,
            width: 44, height: 18, display: 'grid', placeItems: 'center',
            borderRadius: 999, background: 'rgba(20,22,27,.42)',
            border: '1px solid rgba(255,255,255,.16)', boxShadow: '0 2px 8px rgba(0,0,0,.12)',
            cursor: 'grab', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
            backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)',
          }}>
          <i style={{ width: 20, height: 3, borderRadius: 999, background: 'rgba(255,255,255,.78)', pointerEvents: 'none' }} />
        </span>
      )}
      {children}
      <ConfirmModal open={centerAsk !== null}
        title="가운데에 딱 맞추려면 가로 크기를 조정해야 합니다"
        body={centerAsk
          ? `그리드가 10px 단위라, 지금 가로(${centerAsk.w}px)로는 중앙에서 5px 치우칩니다. 가로를 어느 쪽으로 맞출까요?`
          : undefined}
        onClose={() => setCenterAsk(null)}
        buttons={[
          {
            label: `가로 +${centerAsk?.grow ?? 10}px`, kind: 'dark',
            onClick: () => {
              if (centerAsk) {
                const w = centerAsk.w + centerAsk.grow;
                updateWidget(conf.id, { w, ax: (centerAsk.canvasW - w) / 2 }, { persist: true });
              }
              setCenterAsk(null);
            },
          },
          {
            label: `가로 −${centerAsk?.shrink ?? 10}px`, kind: 'ghost',
            onClick: () => {
              if (centerAsk) {
                const w = Math.max(160, centerAsk.w - centerAsk.shrink);
                updateWidget(conf.id, { w, ax: (centerAsk.canvasW - w) / 2 }, { persist: true });
              }
              setCenterAsk(null);
            },
          },
          { label: '그대로 두기', kind: 'ghost', onClick: () => setCenterAsk(null) },
        ]} />
      <span
        className="rs"
        data-tip="드래그로 크기 조절"
        onPointerDown={onResizeDown}
        style={{
          position: 'absolute', right: -8, bottom: -8, width: 42, height: 42, zIndex: 45,
          cursor: 'nwse-resize', touchAction: 'none', background: 'transparent',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 8,
        }}>
        <i style={{
          width: 13, height: 13, display: 'block', pointerEvents: 'none',
          borderRight: '2px solid rgba(28,31,36,.72)', borderBottom: '2px solid rgba(28,31,36,.72)',
          borderRadius: '0 0 3px 0',
        }} />
      </span>
      {rotatable && (
        <span className="rr" data-tip="드래그로 기울기 · 더블클릭 = 초기화"
          onPointerDown={onRotDown}
          onDoubleClick={() => updateWidget(conf.id, { rot: undefined })} />
      )}
    </div>
  );
}
