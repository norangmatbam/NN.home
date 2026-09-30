'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import type { Post, FoldType, ChatMessage } from '@/lib/postStore';
import { useBoards, boardHref, MAIN_BOARD_ID } from '@/lib/boardStore';
import { KCheck, KInput, KSelect } from '@/components/ui/Kit';
import { PageTitle, EditableDesc } from '@/components/ui/PageText';
import { BlobImg, putBlob } from '@/lib/blobStore';
import { useToast } from '@/components/ui/Toast';
import { ChatMessageEditor, type ChatMessageEditorHandle } from '@/components/board/ChatMessageEditor';

type Props = {
  post: Post;
  posts: Post[];
  setPosts: (next: Post[]) => void;
};

export function LongChatEditPage({ post, posts, setPosts }: Props) {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const { boards } = useBoards();
  const board = boards.find(b => b.id === (post.boardId ?? MAIN_BOARD_ID)) ?? boards[0];
  const editorRef = useRef<ChatMessageEditorHandle>(null);

  const [title, setTitle] = useState(post.title);
  const [chatDate, setChatDate] = useState(post.chatDate ?? '');
  const [leftName, setLeftName] = useState(post.chat?.left.name ?? '왼쪽');
  const [rightName, setRightName] = useState(post.chat?.right.name ?? '오른쪽');
  const [leftAvatar, setLeftAvatar] = useState<string | undefined>(post.chat?.left.avatar);
  const [rightAvatar, setRightAvatar] = useState<string | undefined>(post.chat?.right.avatar);
  const [messages, setMessages] = useState<ChatMessage[]>(post.chat?.messages ?? []);
  const [category, setCategory] = useState(post.category);
  const [secret, setSecret] = useState(post.secret);
  const [notice, setNotice] = useState(post.notice);
  const [tagsText, setTagsText] = useState((post.tags ?? []).join(', '));
  const [foldType, setFoldType] = useState<FoldType | 'none'>(post.fold?.type ?? 'none');
  const [foldLabel, setFoldLabel] = useState(post.fold?.label ?? '');

  const parseTags = (s: string) => [...new Set(s.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean))];

  const uploadAvatar = async (side: 'left' | 'right', file?: File) => {
    if (!file) return;
    try {
      const ref = await putBlob(file);
      if (side === 'left') setLeftAvatar(ref); else setRightAvatar(ref);
    } catch {
      toast('프로필 이미지 업로드에 실패했습니다');
    }
  };

  const save = () => {
    if (!user || user.id !== post.authorId) {
      toast('수정은 작성자 본인만 할 수 있습니다');
      return;
    }
    const source = editorRef.current?.flush() ?? messages;
    const cleanMessages = source.map(m => ({ ...m, text: m.text.trim() })).filter(m => m.text);
    if (!title.trim()) { toast('제목을 입력해 주세요'); return; }
    if (!leftName.trim() || !rightName.trim() || cleanMessages.length === 0) {
      toast('좌·우 닉네임과 대화를 한 줄 이상 입력해 주세요');
      return;
    }

    const nextPost: Post = {
      ...post,
      title: title.trim(),
      body: cleanMessages.map(m => m.text).join('\n'),
      category,
      secret,
      notice: isAdmin ? notice : post.notice,
      chatDate: chatDate || undefined,
      tags: parseTags(tagsText),
      fold: foldType === 'none' ? null : { type: foldType, label: foldType === 'custom' ? foldLabel : undefined },
      chat: {
        left: { name: leftName.trim(), avatar: leftAvatar },
        right: { name: rightName.trim(), avatar: rightAvatar },
        messages: cleanMessages,
      },
    };

    setPosts(posts.map(p => p.id === post.id ? nextPost : p));
    toast('수정되었습니다');
    router.push(`/board/${post.id}`);
  };

  const renderParticipant = (side: 'left' | 'right') => {
    const name = side === 'left' ? leftName : rightName;
    const avatar = side === 'left' ? leftAvatar : rightAvatar;
    const setName = side === 'left' ? setLeftName : setRightName;
    const inputId = `long-chat-avatar-${side}`;
    return (
      <div className="long-chat-participant">
        <div className="long-chat-avatar"><BlobImg fileRef={avatar} label={side === 'left' ? 'L' : 'R'} /></div>
        <div className="long-chat-participant-fields">
          <KInput value={name} onChange={e => setName(e.target.value)} placeholder={`${side === 'left' ? '왼쪽' : '오른쪽'} 닉네임`} />
          <div className="long-chat-avatar-actions">
            <input id={inputId} type="file" accept="image/*" hidden onChange={e => { void uploadAvatar(side, e.target.files?.[0]); e.target.value = ''; }} />
            <button className="btn btn-ghost" type="button" onClick={() => document.getElementById(inputId)?.click()}>{avatar ? '이미지 교체' : '프로필 이미지'}</button>
            {avatar && <button className="btn btn-ghost" type="button" onClick={() => side === 'left' ? setLeftAvatar(undefined) : setRightAvatar(undefined)}>제거</button>}
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return <section className="page"><div className="page-head"><PageTitle>EDIT</PageTitle><p>수정은 로그인 후 이용할 수 있습니다</p></div></section>;
  }

  return (
    <section className="page long-chat-edit-page">
      <div className="page-head">
        <PageTitle href={boardHref(board.id)}>{board.id === MAIN_BOARD_ID ? 'EDIT' : board.name}</PageTitle>
        <EditableDesc k="board-write-desc" def="긴 대화 전용 편집기 · 30개씩 표시 · 선택한 메시지만 입력창으로 전환" />
      </div>

      <div className="write-grid">
        <div className="panel long-chat-main">
          <div className="form-row"><label className="k-label" style={{ width: 60 }}>제목</label><KInput value={title} onChange={e => setTitle(e.target.value)} style={{ flex: 1 }} /></div>
          <div className="form-row">
            <label className="k-label" style={{ width: 60 }}>대화 날짜</label>
            <KInput type="date" value={chatDate} onChange={e => setChatDate(e.target.value)} style={{ width: 170 }} />
            <span className="long-chat-hint">비워두면 작성일 표시</span>
          </div>

          <div className="long-chat-participants">{renderParticipant('left')}{renderParticipant('right')}</div>

          <div className="long-chat-editor-section">
            <div className="long-chat-editor-head">
              <label className="k-label">대화</label>
              <span>{messages.length.toLocaleString()}개 · 메시지를 누르면 그 한 줄만 편집됩니다</span>
            </div>
            <ChatMessageEditor
              ref={editorRef}
              messages={messages}
              onChange={setMessages}
              leftName={leftName}
              rightName={rightName}
              chunked={messages.length > 30}
            />
          </div>
        </div>

        <div>
          <div className="panel widget" style={{ marginBottom: 14 }}>
            <h4>설정</h4>
            <div className="form-row"><label className="k-label" style={{ width: 60 }}>말머리</label><KSelect minWidth={130} value={category} onChange={setCategory} options={board.cats.map(x => ({ value: x.label, label: x.label }))} placeholder="말머리 선택" /></div>
            <div className="form-row"><label className="k-label" style={{ width: 60 }}>태그</label><KInput value={tagsText} onChange={e => setTagsText(e.target.value)} placeholder="쉼표로 구분" style={{ flex: 1 }} /></div>
            <div style={{ display: 'grid', gap: 9 }}><KCheck label="비밀글 (관리자와 나만 열람)" checked={secret} onChange={setSecret} />{isAdmin && <KCheck label="공지로 고정" checked={notice} onChange={setNotice} />}</div>
          </div>
          <div className="panel widget" style={{ marginBottom: 14 }}>
            <h4>접기 (6.2)</h4>
            <div style={{ display: 'grid', gap: 9 }}>
              <KCheck label="스포일러 접기" checked={foldType === 'spoiler'} onChange={v => setFoldType(v ? 'spoiler' : 'none')} />
              <KCheck label="수위 주의 접기" checked={foldType === 'adult'} onChange={v => setFoldType(v ? 'adult' : 'none')} />
              <KCheck label="직접 입력 문구" checked={foldType === 'custom'} onChange={v => setFoldType(v ? 'custom' : 'none')} />
              {foldType === 'custom' && <KInput placeholder="접기 문구" value={foldLabel} onChange={e => setFoldLabel(e.target.value)} />}
            </div>
          </div>
          <div className="form-actions"><button className="btn btn-onbk" type="button" onClick={() => router.push(`/board/${post.id}`)}>CANCEL</button><button className="btn btn-accent" type="button" onClick={save}>SAVE</button></div>
        </div>
      </div>

      <style>{`
        .long-chat-main{padding:24px;display:grid;gap:18px}.long-chat-hint{font-size:10.5px;color:var(--faint)}.long-chat-participants{display:grid;grid-template-columns:1fr 1fr;gap:14px}.long-chat-participant{display:grid;grid-template-columns:54px minmax(0,1fr);gap:10px;align-items:center}.long-chat-avatar{width:54px;height:54px;border-radius:50%;overflow:hidden;border:1px solid var(--line);background:var(--panel)}.long-chat-participant-fields{display:grid;gap:7px;min-width:0}.long-chat-avatar-actions{display:flex;gap:7px;flex-wrap:wrap}.long-chat-avatar-actions .btn{height:28px;font-size:10px}.long-chat-editor-section{border-top:1px solid var(--line);padding-top:16px;display:grid;gap:10px}.long-chat-editor-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}.long-chat-editor-head span{font-size:10px;color:var(--faint)}
        @media(max-width:620px){.long-chat-main{padding:18px}.long-chat-participants{grid-template-columns:1fr}.long-chat-participant{grid-template-columns:48px minmax(0,1fr)}.long-chat-avatar{width:48px;height:48px}.long-chat-edit-page .form-row:has(input[type=date]){display:grid!important;grid-template-columns:1fr!important;gap:7px!important}.long-chat-edit-page .form-row:has(input[type=date]) .k-label{width:auto!important}.long-chat-edit-page input[type=date]{width:100%!important;max-width:100%!important}}
      `}</style>
    </section>
  );
}
