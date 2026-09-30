'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@/lib/postStore';

const TRANSFER_KEY = 'ohome.kakao.convert.v1';
const LONG_CHAT_LIMIT = 30;

type Props = {
  onImport: (data: { leftName: string; rightName: string; messages: ChatMessage[] }) => void;
};

type TransferData = {
  boardId?: string;
  leftName?: string;
  rightName?: string;
  messages?: ChatMessage[];
};

/**
 * Convert 페이지가 sessionStorage에 넣은 선택 구간을 대화형 글쓰기로 한 번만 전달한다.
 * 파일 선택/파싱 UI는 /convert/kakao 전용으로 분리한다.
 * 긴 대화 편집 중에는 마지막 말풍선으로 바로 이동할 수 있는 floating 버튼도 제공한다.
 */
export function KakaoChatImport({ onImport }: Props) {
  const consumed = useRef(false);
  const [showBottomJump, setShowBottomJump] = useState(false);

  useEffect(() => {
    if (consumed.current) return;
    const raw = sessionStorage.getItem(TRANSFER_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as TransferData;
      if (!data.leftName || !data.rightName || !Array.isArray(data.messages) || !data.messages.length) return;
      consumed.current = true;
      sessionStorage.removeItem(TRANSFER_KEY);
      onImport({ leftName: data.leftName, rightName: data.rightName, messages: data.messages });
    } catch {
      sessionStorage.removeItem(TRANSFER_KEY);
    }
  }, [onImport]);

  useEffect(() => {
    const update = () => {
      const count = document.querySelectorAll('textarea[placeholder="말풍선에 들어갈 대화"]').length;
      setShowBottomJump(count > LONG_CHAT_LIMIT);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const jumpBottom = () => {
    const inputs = document.querySelectorAll<HTMLTextAreaElement>('textarea[placeholder="말풍선에 들어갈 대화"]');
    const last = inputs[inputs.length - 1];
    last?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (!showBottomJump) return null;

  return (
    <>
      <button
        type="button"
        className="chat-edit-float-bottom"
        onClick={jumpBottom}
        aria-label="맨 아래 대화 입력칸으로 이동"
      >
        ↓ 맨 아래
      </button>
      <style>{`
        .chat-edit-float-bottom{
          position:fixed;right:20px;bottom:calc(22px + env(safe-area-inset-bottom));z-index:65;
          height:36px;padding:0 13px;border-radius:999px;border:1px solid var(--line-dark);
          background:var(--panel);color:var(--fg);font-size:11px;box-shadow:var(--sh-dd);white-space:nowrap
        }
        @media(max-width:620px){
          .chat-edit-float-bottom{right:14px;bottom:calc(16px + env(safe-area-inset-bottom));height:34px;padding:0 11px}
        }
      `}</style>
    </>
  );
}
