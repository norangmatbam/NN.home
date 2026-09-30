'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BlobImg } from '@/lib/blobStore';
import type { ChatPostData } from '@/lib/postStore';

const COLLAPSE_LIMIT = 30;

export function ChatConversation({ chat }: { chat: ChatPostData }) {
  const total = chat.messages.length;
  const [expanded, setExpanded] = useState(total <= COLLAPSE_LIMIT);
  const [windowStart, setWindowStart] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setExpanded(total <= COLLAPSE_LIMIT);
    setWindowStart(0);
  }, [total]);

  const collapsed = total > COLLAPSE_LIMIT && !expanded;
  const start = collapsed ? Math.min(windowStart, Math.max(0, total - COLLAPSE_LIMIT)) : 0;
  const end = collapsed ? Math.min(total, start + COLLAPSE_LIMIT) : total;
  const visible = chat.messages.slice(start, end);

  const jumpBottom = () => {
    if (collapsed) setWindowStart(Math.max(0, total - COLLAPSE_LIMIT));
    requestAnimationFrame(() => requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }));
  };

  return (
    <div className="chat-conversation-wrap">
      {total > COLLAPSE_LIMIT && (
        <div className="chat-foldbar">
          <span>{collapsed ? `${start + 1}~${end} / ${total}` : `${total}개 전체 표시`}</span>
          <div>
            {collapsed && start > 0 && <button onClick={() => setWindowStart(Math.max(0, start - COLLAPSE_LIMIT))}>← 이전 30개</button>}
            {collapsed && end < total && <button onClick={() => setWindowStart(Math.min(total - COLLAPSE_LIMIT, start + COLLAPSE_LIMIT))}>다음 30개 →</button>}
            <button onClick={() => {
              setExpanded(v => !v);
              if (expanded) setWindowStart(0);
            }}>{expanded ? '30개로 접기' : '전체 펼치기'}</button>
          </div>
        </div>
      )}

      <div className="chat-conversation">
        {visible.map((m, displayIndex) => {
          const actualIndex = start + displayIndex;
          const who = m.side === 'left' ? chat.left : chat.right;
          const prev = chat.messages[actualIndex - 1];
          const firstInRun = displayIndex === 0 || !prev || prev.side !== m.side;
          return (
            <div key={m.id} className={`chat-line ${m.side}`}>
              {m.side === 'left' && (
                <div className="chat-avatar-slot">
                  {firstInRun && (
                    <div className="chat-avatar"><BlobImg fileRef={who.avatar} label={who.name.slice(0, 1)} /></div>
                  )}
                </div>
              )}
              <div className="chat-message-stack">
                {firstInRun && <div className="chat-name">{who.name}</div>}
                <div className="chat-bubble">{m.text}</div>
              </div>
              {m.side === 'right' && (
                <div className="chat-avatar-slot">
                  {firstInRun && (
                    <div className="chat-avatar"><BlobImg fileRef={who.avatar} label={who.name.slice(0, 1)} /></div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {total > COLLAPSE_LIMIT && (
        <button type="button" className="chat-float-bottom" onClick={jumpBottom} aria-label="맨 아래 대화로 이동">↓ 맨 아래</button>
      )}

      <style>{`
        .chat-conversation-wrap{position:relative}
        .chat-foldbar{max-width:760px;margin:0 auto 2px;padding:8px 10px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:10.5px;color:var(--faint)}
        .chat-foldbar>div{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
        .chat-foldbar button{height:27px;padding:0 9px;border:1px solid var(--line);border-radius:7px;background:var(--panel);color:var(--sub);font-size:10px}
        .chat-conversation{max-width:760px;margin:0 auto;padding:22px 10px 30px;display:grid;gap:11px}
        .chat-line{display:flex;align-items:flex-start;gap:9px;width:100%}
        .chat-line.right{justify-content:flex-end}
        .chat-avatar-slot{width:42px;flex:0 0 42px}
        .chat-avatar{width:42px;height:42px;border-radius:50%;overflow:hidden;background:var(--panel);border:1px solid var(--line)}
        .chat-message-stack{min-width:0;max-width:min(72%,560px);display:grid;gap:5px}
        .chat-line.right .chat-message-stack{justify-items:end}
        .chat-name{font-size:11.5px;font-weight:650;color:var(--fg);padding:0 3px}
        .chat-bubble{position:relative;white-space:pre-wrap;word-break:break-word;padding:10px 13px;border-radius:15px;font-size:13px;line-height:1.55;background:var(--panel);border:1px solid var(--line);color:var(--fg);box-shadow:0 2px 8px rgba(0,0,0,.04)}
        .chat-line.left .chat-bubble{border-top-left-radius:5px}
        .chat-line.right .chat-bubble{border-top-right-radius:5px;background:color-mix(in srgb,var(--accent) 16%,var(--panel));border-color:color-mix(in srgb,var(--accent) 28%,var(--line))}
        .chat-float-bottom{position:fixed;right:20px;bottom:calc(22px + env(safe-area-inset-bottom));z-index:65;height:36px;padding:0 13px;border-radius:999px;border:1px solid var(--line-dark);background:var(--panel);color:var(--fg);font-size:11px;box-shadow:var(--sh-dd);white-space:nowrap}
        @media(max-width:620px){
          .chat-foldbar{padding:7px 0;align-items:flex-start;flex-direction:column}
          .chat-foldbar>div{width:100%;justify-content:flex-start}
          .chat-conversation{padding:14px 0 22px;gap:10px}
          .chat-avatar-slot{width:36px;flex-basis:36px}
          .chat-avatar{width:36px;height:36px}
          .chat-message-stack{max-width:76%}
          .chat-bubble{font-size:13px;padding:9px 12px;border-radius:14px}
          .chat-name{font-size:11px}
          .chat-float-bottom{right:14px;bottom:calc(16px + env(safe-area-inset-bottom));height:34px;padding:0 11px}
        }
      `}</style>
    </div>
  );
}
