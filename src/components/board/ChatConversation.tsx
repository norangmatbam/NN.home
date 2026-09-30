'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BlobImg } from '@/lib/blobStore';
import type { ChatPostData } from '@/lib/postStore';

const RAIL_MAX = 1000;

export function ChatConversation({ chat }: { chat: ChatPostData }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [railVisible, setRailVisible] = useState(false);
  const [railValue, setRailValue] = useState(0);
  const [railTop, setRailTop] = useState(0);
  const [railLeft, setRailLeft] = useState(0);
  const [railWidth, setRailWidth] = useState(0);
  const longChat = chat.messages.length > 30;

  const jumpTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const jumpBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  useEffect(() => {
    if (!longChat) return;
    const scroller = document.getElementById('appMain');
    const wrap = wrapRef.current;
    if (!scroller || !wrap) return;

    const sync = () => {
      const sr = scroller.getBoundingClientRect();
      const wr = wrap.getBoundingClientRect();
      const start = wr.top - sr.top + scroller.scrollTop;
      const bottom = wr.bottom - sr.top + scroller.scrollTop;
      const end = Math.max(start + 1, bottom - scroller.clientHeight);
      const ratio = Math.max(0, Math.min(1, (scroller.scrollTop - start) / (end - start)));

      setRailValue(Math.round(ratio * RAIL_MAX));
      setRailTop(sr.top);
      setRailLeft(sr.left);
      setRailWidth(sr.width);

      // 대화 영역이 화면에 걸쳐 있고 사용자가 실제로 스크롤하기 시작하면 바로 표시.
      // sticky를 부모 안에 두면 대화 카드가 상단에 닿기 전엔 보이지 않아 fixed rail로 분리한다.
      const chatInView = wr.top < sr.bottom - 40 && wr.bottom > sr.top + 80;
      setRailVisible(scroller.scrollTop > 16 && chatInView);
    };

    sync();
    scroller.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      scroller.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [longChat]);

  const moveByRail = (value: number) => {
    setRailValue(value);
    const scroller = document.getElementById('appMain');
    const wrap = wrapRef.current;
    if (!scroller || !wrap) return;
    const sr = scroller.getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();
    const start = wr.top - sr.top + scroller.scrollTop;
    const bottom = wr.bottom - sr.top + scroller.scrollTop;
    const end = Math.max(start + 1, bottom - scroller.clientHeight);
    const top = start + (end - start) * (value / RAIL_MAX);
    scroller.scrollTo({ top, behavior: 'auto' });
  };

  return (
    <div ref={wrapRef} className="chat-conversation-wrap">
      <div ref={topRef} />

      {longChat && railVisible && (
        <div
          className="chat-view-rail"
          style={{ top: railTop, left: railLeft, width: railWidth }}
          aria-label="대화 위치 이동"
        >
          <button type="button" onClick={jumpTop} aria-label="맨 위 대화로 이동">↑</button>
          <input
            type="range"
            min={0}
            max={RAIL_MAX}
            value={railValue}
            onChange={e => moveByRail(Number(e.target.value))}
            aria-label="대화 세로 위치"
          />
          <button type="button" onClick={jumpBottom} aria-label="맨 아래 대화로 이동">↓</button>
        </div>
      )}

      <div className="chat-conversation">
        {chat.messages.map((m, i) => {
          const who = m.side === 'left' ? chat.left : chat.right;
          const prev = chat.messages[i - 1];
          const firstInRun = !prev || prev.side !== m.side;
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

      {longChat && (
        <div className="chat-float-nav">
          <button type="button" onClick={jumpTop} aria-label="맨 위 대화로 이동">↑ 맨 위</button>
          <button type="button" onClick={jumpBottom} aria-label="맨 아래 대화로 이동">↓ 맨 아래</button>
        </div>
      )}

      <style>{`
        .chat-conversation-wrap{position:relative}
        .chat-view-rail{position:fixed;z-index:54;display:grid;grid-template-columns:28px minmax(0,1fr) 28px;align-items:center;gap:8px;padding:7px 12px;background:color-mix(in srgb,var(--panel-solid) 88%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--line);box-shadow:0 5px 16px rgba(0,0,0,.08)}
        .chat-view-rail input{width:100%;accent-color:var(--accent)}
        .chat-view-rail button{height:28px;border:1px solid var(--line);border-radius:999px;background:var(--panel);color:var(--sub);font-size:12px}
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
        .chat-float-nav{position:fixed;right:20px;bottom:calc(96px + env(safe-area-inset-bottom));z-index:75;display:grid;gap:6px}
        .chat-float-nav button{height:36px;padding:0 13px;border-radius:999px;border:1px solid var(--line-dark);background:var(--panel);color:var(--fg);font-size:11px;box-shadow:var(--sh-dd);white-space:nowrap}
        @media(max-width:620px){
          .chat-view-rail{padding:6px 10px;grid-template-columns:27px minmax(0,1fr) 27px}
          .chat-view-rail button{height:27px}
          .chat-conversation{padding:14px 0 22px;gap:10px}
          .chat-avatar-slot{width:36px;flex-basis:36px}
          .chat-avatar{width:36px;height:36px}
          .chat-message-stack{max-width:76%}
          .chat-bubble{font-size:13px;padding:9px 12px;border-radius:14px}
          .chat-name{font-size:11px}
          .chat-float-nav{right:14px;bottom:calc(74px + env(safe-area-inset-bottom))}
          .chat-float-nav button{height:34px;padding:0 11px}
        }
      `}</style>
    </div>
  );
}
