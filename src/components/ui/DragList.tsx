'use client';
// 공통 드래그 정렬 리스트 (v1.9 — 들어 올림 + 빈 자리 + FLIP)
// 행 안의 .drag-h 핸들을 잡아 세로로 끌면 다른 행이 부드럽게 밀려나며 삽입 위치를 보여줌.
// 놓으면 정확한 슬롯 위치로 안착 애니메이션 후 커밋 — 커밋 프레임은 transition을 죽여 튀지 않게 (v1.9)
// 모바일/터치에서는 핸들이 브라우저 스크롤 제스처에 뺏기지 않도록 pointer capture + touch-action을 사용한다.
import React, { useRef, useState } from 'react';

export function DragList<T>({ items, keyOf, render, onReorder, disabled }: {
  items: T[];
  keyOf: (t: T) => string;
  render: (t: T, i: number) => React.ReactNode;
  onReorder: (items: T[]) => void;
  disabled?: boolean;
}) {
  const contRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ key: string; from: number; to: number; dy: number; h: number; settling?: boolean } | null>(null);
  const [frozen, setFrozen] = useState(false);   // 커밋 직후 1프레임 — transform 해제가 애니메이션되지 않게

  const onPointerDown = (e: React.PointerEvent, index: number) => {
    if (disabled || e.button !== 0) return;
    if (!(e.target as HTMLElement).closest('.drag-h')) return;
    e.preventDefault();
    e.stopPropagation();   // 중첩 DragList(메뉴 트리 등)에서 바깥 리스트가 같이 끌리지 않게

    const row = e.currentTarget as HTMLDivElement;
    const pointerId = e.pointerId;
    if (e.pointerType !== 'mouse') {
      try { row.setPointerCapture(pointerId); } catch { /* 지원하지 않는 브라우저는 window listener로 처리 */ }
    }

    const rows = Array.from(contRef.current!.children) as HTMLElement[];
    const tops = rows.map(r => r.getBoundingClientRect().top);
    const heights = rows.map(r => r.getBoundingClientRect().height);
    const startY = e.clientY;
    const key = keyOf(items[index]);
    setDrag({ key, from: index, to: index, dy: 0, h: heights[index] });

    const cleanup = () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      if (e.pointerType !== 'mouse') {
        try {
          if (row.hasPointerCapture(pointerId)) row.releasePointerCapture(pointerId);
        } catch { /* 이미 해제된 경우 무시 */ }
      }
    };

    const mv = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      if (ev.pointerType !== 'mouse') ev.preventDefault();
      const dy = ev.clientY - startY;
      const centerY = tops[index] + heights[index] / 2 + dy;
      let to = index;
      for (let j = 0; j < rows.length; j++) {
        const c = tops[j] + heights[j] / 2;
        if (j < index && centerY < c) to = Math.min(to, j);
        if (j > index && centerY > c) to = Math.max(to, j);
      }
      setDrag(d => (d ? { ...d, dy, to } : d));
    };

    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      cleanup();
      setDrag(d => {
        if (!d) return null;
        const target = d.to === d.from ? 0
          : (tops[d.to] - tops[d.from]) + (d.to > d.from ? heights[d.to] - heights[d.from] : 0);
        return { ...d, dy: target, settling: true };
      });
      window.setTimeout(() => {
        setFrozen(true);
        setDrag(d => {
          if (d && d.to !== d.from) {
            const arr = [...items];
            const [m] = arr.splice(d.from, 1);
            arr.splice(d.to, 0, m);
            onReorder(arr);
          }
          return null;
        });
        requestAnimationFrame(() => requestAnimationFrame(() => setFrozen(false)));
      }, 170);
    };

    const cancel = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      cleanup();
      setDrag(null);
    };

    window.addEventListener('pointermove', mv, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  };

  const recordOf = (it: T) => (it && typeof it === 'object' ? it as Record<string, unknown> : null);
  const boardLike = (it: T) => {
    const b = recordOf(it);
    return b
      && typeof b.skin === 'string'
      && ['list', 'ticket', 'chat'].includes(b.skin)
      && Array.isArray(b.cats)
      && typeof b.permWrite === 'string'
      && typeof b.permComment === 'string'
      ? b : null;
  };
  const boardBadgeLike = (it: T) => {
    const b = recordOf(it);
    return b
      && typeof b.label === 'string'
      && typeof b.bg === 'string'
      && typeof b.border === 'string'
      && typeof b.fg === 'string'
      ? b : null;
  };

  // 게시판 관리 행: 기존 「기본형 / 티켓형」 세그먼트 안에 대화형을 넣는다.
  // 게시판 말머리 행: 이름·색·삭제 컨트롤이 모바일에서도 절대 두 줄로 내려가지 않게 고정한다.
  const enhanceSettingsRow = (it: T, node: React.ReactNode): React.ReactNode => {
    const board = boardLike(it);
    const badge = boardBadgeLike(it);
    if ((!board && !badge) || !React.isValidElement(node)) return node;

    const inject = (child: React.ReactNode): React.ReactNode => {
      if (!React.isValidElement(child)) return child;
      const el = child as React.ReactElement<{ className?: string; style?: React.CSSProperties; children?: React.ReactNode }>;
      const cls = el.props.className ?? '';

      if (board && cls.includes('mini-seg')) {
        const style: React.CSSProperties = { ...el.props.style, flexWrap: 'nowrap', whiteSpace: 'nowrap', flexShrink: 0 };
        return React.cloneElement(el, {
          style,
          children: <>
            {el.props.children}
            <button
              type="button"
              className={board.skin === 'chat' ? 'on' : ''}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('ohome-board-skin', {
                  detail: { id: keyOf(it), skin: 'chat' },
                }));
              }}
            >대화형</button>
          </>,
        });
      }

      const children = React.Children.map(el.props.children, inject);
      let style: React.CSSProperties | undefined = el.props.style;
      if (cls.includes('cp-group')) {
        style = { ...el.props.style, flexWrap: 'nowrap', whiteSpace: 'nowrap', flexShrink: 0 };
      } else if (cls.includes('set-row')) {
        style = { ...el.props.style, flexWrap: 'nowrap', whiteSpace: 'nowrap', minWidth: 0 };
      } else if (badge && cls.split(/\s+/).includes('l')) {
        style = { ...el.props.style, flexWrap: 'nowrap', whiteSpace: 'nowrap', flexShrink: 0 };
      }
      return React.cloneElement(el, { style, children });
    };

    return inject(node);
  };

  return (
    <>
      <style>{`
        @media (hover: none) and (pointer: coarse) {
          .drag-list-mobile .drag-h {
            touch-action: none;
            -webkit-user-select: none;
            user-select: none;
            min-width: 32px;
            min-height: 32px;
            display: inline-grid;
            place-items: center;
          }
        }
      `}</style>
      <div ref={contRef} className="drag-list-mobile">
        {items.map((it, i) => {
          let style: React.CSSProperties = frozen ? { transition: 'none' } : {};
          let cls = 'dl-row';
          if (drag) {
            if (keyOf(it) === drag.key) {
              style = {
                transform: `translateY(${drag.dy}px) scale(1.02)`,
                transition: drag.settling ? 'transform .16s ease' : 'none',
              };
              cls += ' lift';
            } else if (drag.from < drag.to && i > drag.from && i <= drag.to) {
              style = { transform: `translateY(${-drag.h}px)` };
            } else if (drag.from > drag.to && i >= drag.to && i < drag.from) {
              style = { transform: `translateY(${drag.h}px)` };
            }
          }
          return (
            <div key={keyOf(it)} className={cls} style={style} onPointerDown={ev => onPointerDown(ev, i)}>
              {enhanceSettingsRow(it, render(it, i))}
            </div>
          );
        })}
      </div>
    </>
  );
}
