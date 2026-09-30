'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { KTextarea } from '@/components/ui/Kit';
import { newId, type ChatMessage } from '@/lib/postStore';

const PAGE_SIZE = 30;

export type ChatMessageEditorHandle = {
  flush: () => ChatMessage[];
};

type Props = {
  messages: ChatMessage[];
  onChange: (messages: ChatMessage[]) => void;
  leftName: string;
  rightName: string;
  chunked?: boolean;
};

export const ChatMessageEditor = forwardRef<ChatMessageEditorHandle, Props>(function ChatMessageEditor({
  messages, onChange, leftName, rightName, chunked = false,
}, ref) {
  const [page, setPage] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [focusIndex, setFocusIndex] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const total = messages.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = chunked ? safePage * PAGE_SIZE : 0;
  const end = chunked ? Math.min(total, start + PAGE_SIZE) : total;
  const visible = chunked ? messages.slice(start, end) : messages;

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  const materialize = () => {
    if (!activeId) return messages;
    return messages.map(m => m.id === activeId ? { ...m, text: draft } : m);
  };

  const commitActive = () => {
    if (!activeId) return messages;
    const next = materialize();
    onChange(next);
    return next;
  };

  useImperativeHandle(ref, () => ({ flush: materialize }), [messages, activeId, draft]);

  const beginEdit = (m: ChatMessage) => {
    if (activeId === m.id) return;
    commitActive();
    setActiveId(m.id);
    setDraft(m.text);
  };

  const stopEdit = () => {
    if (!activeId) return;
    commitActive();
    setActiveId(null);
    setDraft('');
  };

  const updateMessage = (index: number, patch: Partial<ChatMessage>) => {
    const base = materialize();
    const next = base.map((m, i) => i === index ? { ...m, ...patch } : m);
    onChange(next);
    if (activeId && base[index]?.id === activeId && patch.text != null) setDraft(patch.text);
  };

  const moveMessage = (index: number, d: -1 | 1) => {
    const base = materialize();
    const to = index + d;
    if (to < 0 || to >= base.length) return;
    const next = [...base];
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
    setFocusIndex(to);
  };

  const removeMessage = (index: number) => {
    const base = materialize();
    if (base.length <= 1) {
      const only = { id: newId(), side: 'left' as const, text: '' };
      onChange([only]);
      setActiveId(only.id);
      setDraft('');
      setFocusIndex(0);
      setPage(0);
      return;
    }
    const removed = base[index];
    const next = base.filter((_, i) => i !== index);
    onChange(next);
    if (removed.id === activeId) { setActiveId(null); setDraft(''); }
    const nextIndex = Math.min(index, next.length - 1);
    setFocusIndex(nextIndex);
    if (chunked) setPage(Math.floor(nextIndex / PAGE_SIZE));
  };

  const goToIndex = (index: number, smooth = true) => {
    const next = Math.max(0, Math.min(total - 1, index));
    stopEdit();
    setFocusIndex(next);
    if (chunked) setPage(Math.floor(next / PAGE_SIZE));
    requestAnimationFrame(() => requestAnimationFrame(() => {
      rowRefs.current[next]?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
    }));
  };

  const goPage = (nextPage: number) => {
    stopEdit();
    const p = Math.max(0, Math.min(pageCount - 1, nextPage));
    setPage(p);
    setFocusIndex(p * PAGE_SIZE);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  };

  const addMessage = () => {
    const base = materialize();
    const m: ChatMessage = { id: newId(), side: 'left', text: '' };
    const next = [...base, m];
    onChange(next);
    const index = next.length - 1;
    setActiveId(m.id);
    setDraft('');
    setFocusIndex(index);
    if (chunked) setPage(Math.floor(index / PAGE_SIZE));
    requestAnimationFrame(() => requestAnimationFrame(() => rowRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' })));
  };

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as number[];
    const out: number[] = [];
    messages.forEach((m, i) => {
      if (out.length >= 80) return;
      const who = m.side === 'left' ? leftName : rightName;
      if (`${who} ${m.text}`.toLowerCase().includes(q)) out.push(i);
    });
    return out;
  }, [messages, query, leftName, rightName]);

  return (
    <div ref={topRef} className="chat-editor-lite">
      {total > PAGE_SIZE && (
        <>
          <div className="chat-editor-nav">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="대화 내용 검색" />
            <input
              className="chat-editor-number"
              type="number"
              min={1}
              max={total}
              value={focusIndex + 1}
              onChange={e => goToIndex(Number(e.target.value) - 1, false)}
              aria-label="메시지 번호"
            />
            <span>/ {total}</span>
          </div>
          {query.trim() && (
            <div className="chat-editor-results">
              {hits.length ? hits.map(i => (
                <button key={i} type="button" onClick={() => { setQuery(''); goToIndex(i); }}>
                  <small>#{i + 1} · {messages[i].side === 'left' ? leftName : rightName}</small>
                  <span>{messages[i].text.replace(/\n/g, ' ').slice(0, 100)}</span>
                </button>
              )) : <small>검색 결과가 없습니다.</small>}
            </div>
          )}
          <div className="chat-editor-slider">
            <button type="button" onClick={() => goToIndex(0)}>처음</button>
            <input type="range" min={0} max={Math.max(0, total - 1)} value={Math.min(focusIndex, total - 1)} onChange={e => goToIndex(Number(e.target.value), false)} aria-label="대화 위치" />
            <button type="button" onClick={() => goToIndex(total - 1)}>끝</button>
          </div>
          {chunked && (
            <div className="chat-editor-pages">
              <span>{start + 1}~{end} / {total}</span>
              <button type="button" disabled={safePage === 0} onClick={() => goPage(safePage - 1)}>← 이전 30개</button>
              <button type="button" disabled={safePage >= pageCount - 1} onClick={() => goPage(safePage + 1)}>다음 30개 →</button>
            </div>
          )}
        </>
      )}

      <div className="chat-editor-list">
        {visible.map((m, displayIndex) => {
          const i = start + displayIndex;
          const active = activeId === m.id;
          const who = m.side === 'left' ? leftName : rightName;
          return (
            <div key={m.id} ref={el => { rowRefs.current[i] = el; }} className={`chat-editor-row ${focusIndex === i ? 'focus' : ''}`} onClick={() => setFocusIndex(i)}>
              <div className="chat-editor-row-head">
                <span className="chat-editor-index">#{i + 1}</span>
                <div className="mini-seg">
                  <button type="button" className={m.side === 'left' ? 'on' : ''} onClick={e => { e.stopPropagation(); updateMessage(i, { side: 'left' }); }}>← {leftName || '왼쪽'}</button>
                  <button type="button" className={m.side === 'right' ? 'on' : ''} onClick={e => { e.stopPropagation(); updateMessage(i, { side: 'right' }); }}>{rightName || '오른쪽'} →</button>
                </div>
                <div className="chat-editor-row-actions">
                  <button type="button" className="btn btn-ghost" disabled={i === 0} onClick={e => { e.stopPropagation(); moveMessage(i, -1); }}>↑</button>
                  <button type="button" className="btn btn-ghost" disabled={i === total - 1} onClick={e => { e.stopPropagation(); moveMessage(i, 1); }}>↓</button>
                  <button type="button" className="btn btn-ghost" onClick={e => { e.stopPropagation(); removeMessage(i); }}>×</button>
                </div>
              </div>
              {active ? (
                <KTextarea
                  autoFocus
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onBlur={stopEdit}
                  placeholder="말풍선에 들어갈 대화"
                  style={{ minHeight: 84 }}
                />
              ) : (
                <button type="button" className="chat-editor-text" onClick={e => { e.stopPropagation(); setFocusIndex(i); beginEdit(m); }}>
                  <small>{who || (m.side === 'left' ? '왼쪽' : '오른쪽')}</small>
                  <span>{m.text || '내용 없음 — 눌러서 수정'}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button className="btn btn-ghost" type="button" onClick={addMessage}>＋ 대화 추가</button>

      {total > PAGE_SIZE && (
        <div className="chat-editor-floats">
          <button type="button" onClick={() => goToIndex(0)} aria-label="맨 처음 대화로 이동">↑ 처음</button>
          <button type="button" onClick={() => goToIndex(total - 1)} aria-label="맨 끝 대화로 이동">↓ 맨 끝</button>
        </div>
      )}

      <style>{`
        .chat-editor-lite{display:grid;gap:10px}.chat-editor-nav{display:grid;grid-template-columns:minmax(0,1fr) 76px auto;gap:7px;align-items:center}.chat-editor-nav input{height:32px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--ink);padding:0 9px;min-width:0}.chat-editor-nav span{font-size:10px;color:var(--faint);white-space:nowrap}.chat-editor-number{text-align:right}.chat-editor-results{max-height:170px;overflow:auto;border:1px solid var(--line);border-radius:9px;padding:4px}.chat-editor-results>button{display:grid;gap:2px;width:100%;padding:7px 8px;text-align:left;border-radius:6px}.chat-editor-results>button:hover{background:color-mix(in srgb,var(--accent) 8%,transparent)}.chat-editor-results small{font-size:9.5px;color:var(--faint)}.chat-editor-results span{font-size:11px;color:var(--sub)}.chat-editor-slider{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:7px;align-items:center}.chat-editor-slider>button,.chat-editor-pages>button{height:28px;padding:0 9px;border:1px solid var(--line);border-radius:7px;background:var(--panel);color:var(--sub);font-size:10px}.chat-editor-slider input{width:100%;accent-color:var(--accent)}.chat-editor-pages{display:flex;gap:6px;align-items:center;justify-content:flex-end;flex-wrap:wrap}.chat-editor-pages>span{margin-right:auto;font-size:10px;color:var(--faint)}.chat-editor-list{display:grid;gap:8px}.chat-editor-row{border:1px solid var(--line);border-radius:10px;padding:9px;display:grid;gap:7px;background:color-mix(in srgb,var(--panel) 92%,transparent)}.chat-editor-row.focus{outline:1px solid color-mix(in srgb,var(--accent) 50%,transparent);outline-offset:-1px}.chat-editor-row-head{display:flex;gap:7px;align-items:center;min-width:0}.chat-editor-index{font-size:9.5px;color:var(--faint);min-width:36px}.chat-editor-row-actions{margin-left:auto;display:flex;gap:4px}.chat-editor-row-actions .btn{width:29px;height:29px;padding:0}.chat-editor-text{display:grid;gap:3px;width:100%;text-align:left;padding:8px 9px;border-radius:8px;background:color-mix(in srgb,var(--panel) 84%,transparent);border:1px solid transparent}.chat-editor-text:hover{border-color:var(--line)}.chat-editor-text small{font-size:9.5px;color:var(--faint)}.chat-editor-text span{font-size:12px;line-height:1.45;white-space:pre-wrap;word-break:break-word;color:var(--ink)}.chat-editor-floats{position:fixed;right:16px;bottom:calc(92px + env(safe-area-inset-bottom));z-index:75;display:grid;gap:6px}.chat-editor-floats button{height:34px;padding:0 11px;border-radius:999px;border:1px solid var(--line-dark);background:var(--panel);color:var(--fg);font-size:10.5px;box-shadow:var(--sh-dd);white-space:nowrap}
        @media(max-width:620px){.chat-editor-nav{grid-template-columns:minmax(0,1fr) 68px auto}.chat-editor-row-head{align-items:flex-start;flex-wrap:wrap}.chat-editor-row-actions{margin-left:auto}.chat-editor-index{padding-top:7px}.chat-editor-pages{justify-content:flex-start}.chat-editor-floats{right:12px;bottom:calc(86px + env(safe-area-inset-bottom))}}
      `}</style>
    </div>
  );
});
