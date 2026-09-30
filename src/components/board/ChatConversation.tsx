'use client';

import React, { useRef } from 'react';
import { BlobImg } from '@/lib/blobStore';
import type { ChatPostData } from '@/lib/postStore';

export function ChatConversation({ chat }: { chat: ChatPostData }) {
  const endRef = useRef<HTMLDivElement>(null);
  const longChat = chat.messages.length > 30;

  const jumpBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  return (
    <div className="chat-conversation-wrap">
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
        <button type="button" className="chat-float-bottom" onClick={jumpBottom} aria-label="맨 아래 대화로 이동">↓ 맨 아래</button>
      )}

      <style>{`
        .chat-conversation-wrap{position:relative}
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
