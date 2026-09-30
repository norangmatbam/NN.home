'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/lib/postStore';

const TRANSFER_KEY = 'ohome.kakao.convert.v1';

type Props = {
  onImport: (data: { leftName: string; rightName: string; messages: ChatMessage[] }) => void;
};

type TransferData = {
  boardId?: string;
  leftName?: string;
  rightName?: string;
  messages?: ChatMessage[];
};

/** Convert 페이지가 sessionStorage에 넣은 선택 구간을 대화형 글쓰기로 한 번만 전달한다. */
export function KakaoChatImport({ onImport }: Props) {
  const consumed = useRef(false);

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

  return null;
}
