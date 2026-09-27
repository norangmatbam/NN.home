'use client';
// 게시판 글쓰기/수정 — 일반/티켓/대화형 게시판 지원
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList, BOARD_SEED, Post, newId, FoldType, ChatMessage } from '@/lib/postStore';
import { useBoards, boardHref, MAIN_BOARD_ID } from '@/lib/boardStore';
import { renderBody } from '@/lib/sanitize';
import { KInput, KTextarea, KSelect, KCheck } from '@/components/ui/Kit';
import { CropEditor, CropImg, CropValue } from '@/components/ui/CropEditor';
import { ConfirmModal } from '@/components/ui/Modal';
import { RichEditor } from '@/components/ui/RichEditor';
import { useToast } from '@/components/ui/Toast';
import { PageTitle, EditableDesc } from '@/components/ui/PageText';
import { BlobImg, putBlob } from '@/lib/blobStore';

const hasRichHtml = (html: string) =>
  /<(table|thead|tbody|tr|td|th|div|span|section|article|video|audio|details|summary|font|center)\b/i.test(html)
  || /\s(style|class|id)\s*=/i.test(html);

const emptyMessage = (): ChatMessage => ({ id: newId(), side: 'left', text: '' });

function WriteInner() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const params = useSearchParams();
  const editPid = params.get('edit');
  const [posts, setPosts, postsLoaded] = useLocalList<Post>('ohome.board.v1', BOARD_SEED);
  const editing = editPid ? posts.find(p => p.id === editPid) : undefined;
  const bid = editing?.boardId ?? params.get('b') ?? MAIN_BOARD_ID;
  const { boards } = useBoards();
  const board = boards.find(b => b.id === bid) ?? boards[0];
  const isChat = board.skin === 'chat';

  const [title, setTitle] = useState('');
  const [writeMode, setWriteMode] = useState<'editor' | 'md' | 'html'>('editor');
  const [body, setBody] = useState('');
  const [htmlView, setHtmlView] = useState<'code' | 'preview'>('code');
  const [askRich, setAskRich] = useState<null | (() => void)>(null);
  const [category, setCategory] = useState('');
  React.useEffect(() => { if (!category && board.cats[0]) setCategory(board.cats[0].label); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.cats.length]);
  const [secret, setSecret] = useState(false);
  const [notice, setNotice] = useState(false);
  const [tagsText, setTagsText] = useState('');
  const parseTags = (s: string) => [...new Set(s.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean))];
  const [foldType, setFoldType] = useState<FoldType | 'none'>('none');
  const [foldLabel, setFoldLabel] = useState('');

  // 대화형 게시판 전용
  const [leftName, setLeftName] = useState('왼쪽');
  const [rightName, setRightName] = useState('오른쪽');
  const [leftAvatar, setLeftAvatar] = useState<string | undefined>();
  const [rightAvatar, setRightAvatar] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([emptyMessage()]);
  const setMessage = (id: string, patch: Partial<ChatMessage>) =>
    setMessages(ms => ms.map(m => m.id === id ? { ...m, ...patch } : m));
  const moveMessage = (index: number, d: -1 | 1) => {
    const to = index + d;
    if (to < 0 || to >= messages.length) return;
    setMessages(ms => {
      const n = [...ms];
      [n[index], n[to]] = [n[to], n[index]];
      return n;
    });
  };
  const uploadAvatar = async (side: 'left' | 'right', file?: File) => {
    if (!file) return;
    try {
      const ref = await putBlob(file);
      if (side === 'left') setLeftAvatar(ref); else setRightAvatar(ref);
    } catch { toast('프로필 이미지 업로드에 실패했습니다'); }
  };

  // 티켓형
  const [thumbSrc, setThumbSrc] = useState<string | undefined>(undefined);
  const [thumbCrop, setThumbCrop] = useState<CropValue | undefined>(undefined);
  const [cropOpen, setCropOpen] = useState(false);
  const bodyImages = useMemo(() => {
    const out: string[] = [];
    for (const m of body.matchAll(/<img[^>]*src=["']([^"']+)["']/gi)) out.push(m[1]);
    for (const m of body.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) out.push(m[1]);
    return [...new Set(out)];
  }, [body]);
  useEffect(() => {
    if (thumbSrc && !bodyImages.includes(thumbSrc)) { setThumbSrc(undefined); setThumbCrop(undefined); }
  }, [bodyImages, thumbSrc]);

  const hydrated = useRef(false);
  useEffect(() => {
    if (!editPid || !postsLoaded || hydrated.current) return;
    const p = posts.find(x => x.id === editPid);
    if (!p) return;
    hydrated.current = true;
    setTitle(p.title); setBody(p.body);
    setWriteMode(p.mode === 'md' ? 'md' : (p.authored === 'editor' ? 'editor' : 'html'));
    setCategory(p.category);
    setSecret(p.secret); setNotice(p.notice);
    setFoldType(p.fold?.type ?? 'none'); setFoldLabel(p.fold?.label ?? '');
    setTagsText((p.tags ?? []).join(', '));
    setThumbSrc(p.thumbSrc); setThumbCrop(p.thumbCrop);
    if (p.chat) {
      setLeftName(p.chat.left.name); setLeftAvatar(p.chat.left.avatar);
      setRightName(p.chat.right.name); setRightAvatar(p.chat.right.avatar);
      setMessages(p.chat.messages.length ? p.chat.messages : [emptyMessage()]);
    }
  }, [editPid, postsLoaded, posts]);

  const preview = useMemo(() => renderBody(writeMode === 'md' ? 'md' : 'html', body), [writeMode, body]);

  if (!user) {
    return <section className="page"><div className="page-head"><PageTitle>WRITE</PageTitle><p>글쓰기는 로그인 후 이용할 수 있습니다</p></div></section>;
  }

  const post = () => {
    const cleanMessages = messages.map(m => ({ ...m, text: m.text.trim() })).filter(m => m.text);
    const chatBody = cleanMessages.map(m => m.text).join('\n');
    if (!title.trim()) { toast('제목을 입력해 주세요'); return; }
    if (isChat && (!leftName.trim() || !rightName.trim() || cleanMessages.length === 0)) {
      toast('좌·우 닉네임과 대화를 한 줄 이상 입력해 주세요'); return;
    }
    if (!isChat && !body.trim()) { toast('내용을 입력해 주세요'); return; }

    const common = {
      title: title.trim(), body: isChat ? chatBody : body,
      mode: (isChat ? 'html' : (writeMode === 'md' ? 'md' : 'html')) as Post['mode'],
      authored: (!isChat && writeMode === 'editor' ? 'editor' : undefined) as Post['authored'],
      category, secret,
      tags: parseTags(tagsText),
      fold: foldType === 'none' ? null : { type: foldType, label: foldType === 'custom' ? foldLabel : undefined },
      thumbSrc: isChat ? undefined : thumbSrc,
      thumbCrop: isChat ? undefined : thumbCrop,
      chat: isChat ? {
        left: { name: leftName.trim(), avatar: leftAvatar },
        right: { name: rightName.trim(), avatar: rightAvatar },
        messages: cleanMessages,
      } : undefined,
    };

    if (editing) {
      if (editing.authorId !== user.id) { toast('수정은 작성자 본인만 할 수 있습니다'); return; }
      setPosts(posts.map(p => p.id === editing.id ? {
        ...p, ...common, notice: isAdmin ? notice : p.notice,
      } : p));
      toast('수정되었습니다');
      router.push(`/board/${editing.id}`);
      return;
    }

    const p: Post = {
      id: newId(), ...common,
      author: user.nickname, authorId: user.id, date: new Date().toISOString(),
      notice: isAdmin && notice, comments: [], boardId: board.id,
    };
    setPosts([p, ...posts]);
    toast('등록되었습니다');
    router.push(`/board/${p.id}`);
  };

  const Participant = ({ side }: { side: 'left' | 'right' }) => {
    const name = side === 'left' ? leftName : rightName;
    const avatar = side === 'left' ? leftAvatar : rightAvatar;
    const setName = side === 'left' ? setLeftName : setRightName;
    const inputId = `chat-avatar-${side}`;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '54px 1fr', gap: 10, alignItems: 'center' }}>
        <div style={{ width: 54, height: 54, borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--panel)' }}>
          <BlobImg fileRef={avatar} label={side === 'left' ? 'L' : 'R'} />
        </div>
        <div style={{ display: 'grid', gap: 7 }}>
          <KInput value={name} onChange={e => setName(e.target.value)} placeholder={`${side === 'left' ? '왼쪽' : '오른쪽'} 닉네임`} />
          <div style={{ display: 'flex', gap: 7 }}>
            <input id={inputId} type="file" accept="image/*" hidden onChange={e => { void uploadAvatar(side, e.target.files?.[0]); e.target.value = ''; }} />
            <button className="btn btn-ghost" style={{ height: 28, fontSize: 10 }} onClick={() => document.getElementById(inputId)?.click()}>{avatar ? '이미지 교체' : '프로필 이미지'}</button>
            {avatar && <button className="btn btn-ghost" style={{ height: 28, fontSize: 10 }} onClick={() => side === 'left' ? setLeftAvatar(undefined) : setRightAvatar(undefined)}>제거</button>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="page">
      <div className="page-head">
        <PageTitle href={boardHref(board.id)}>{board.id === MAIN_BOARD_ID ? (editing ? 'EDIT' : 'WRITE') : board.name}</PageTitle>
        <EditableDesc k="board-write-desc" def={isChat ? '좌·우 대화 상대와 말풍선을 순서대로 작성' : '에디터 / Markdown / HTML — 스크립트는 저장 시 자동 제거'} />
      </div>
      <div className="write-grid">
        <div className="panel" style={{ padding: 24 }}>
          <div className="form-row"><label className="k-label" style={{ width: 60 }}>제목</label><KInput value={title} onChange={e => setTitle(e.target.value)} style={{ flex: 1 }} /></div>

          {isChat ? (
            <div style={{ display: 'grid', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Participant side="left" /><Participant side="right" />
              </div>
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, display: 'grid', gap: 10 }}>
                <label className="k-label" style={{ margin: 0 }}>대화</label>
                {messages.map((m, i) => (
                  <div key={m.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 10, display: 'grid', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                      <div className="mini-seg">
                        <button className={m.side === 'left' ? 'on' : ''} onClick={() => setMessage(m.id, { side: 'left' })}>← {leftName || '왼쪽'}</button>
                        <button className={m.side === 'right' ? 'on' : ''} onClick={() => setMessage(m.id, { side: 'right' })}>{rightName || '오른쪽'} →</button>
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost" style={{ width: 29, height: 29, padding: 0 }} disabled={i === 0} onClick={() => moveMessage(i, -1)}>↑</button>
                        <button className="btn btn-ghost" style={{ width: 29, height: 29, padding: 0 }} disabled={i === messages.length - 1} onClick={() => moveMessage(i, 1)}>↓</button>
                        <button className="btn btn-ghost" style={{ width: 29, height: 29, padding: 0 }} onClick={() => setMessages(ms => ms.length === 1 ? [emptyMessage()] : ms.filter(x => x.id !== m.id))}>×</button>
                      </div>
                    </div>
                    <KTextarea value={m.text} onChange={e => setMessage(m.id, { text: e.target.value })} placeholder="말풍선에 들어갈 대화" style={{ minHeight: 74 }} />
                  </div>
                ))}
                <button className="btn btn-ghost" onClick={() => setMessages(ms => [...ms, emptyMessage()])}>＋ 대화 추가</button>
              </div>
            </div>
          ) : (
            <>
              <div className="form-row">
                <label className="k-label" style={{ width: 60 }}>모드</label>
                <div className="mini-seg">
                  <button className={writeMode === 'editor' ? 'on' : ''} onClick={() => { if (writeMode === 'html' && hasRichHtml(body)) { setAskRich(() => () => setWriteMode('editor')); return; } setWriteMode('editor'); }}>에디터</button>
                  <button className={writeMode === 'md' ? 'on' : ''} onClick={() => { setWriteMode('md'); setHtmlView('code'); }}>Markdown</button>
                  <button className={writeMode === 'html' ? 'on' : ''} onClick={() => setWriteMode('html')}>HTML</button>
                </div>
                {writeMode === 'html' && <div className="mini-seg">
                  <button className={htmlView === 'code' ? 'on' : ''} onClick={() => setHtmlView('code')}>코드</button>
                  <button className={htmlView === 'preview' ? 'on' : ''} onClick={() => { if (htmlView === 'preview') return; if (hasRichHtml(body)) { setAskRich(() => () => setHtmlView('preview')); return; } setHtmlView('preview'); }}>미리보기 (편집 가능)</button>
                </div>}
              </div>
              {writeMode === 'editor' || (writeMode === 'html' && htmlView === 'preview') ? (
                <RichEditor value={body} onChange={setBody} placeholder="내용을 작성하세요 — 이미지 삽입 가능 (스크립트 불허 6.3)" />
              ) : <><KTextarea style={{ minHeight: 220, fontFamily: writeMode === 'html' ? 'ui-monospace, Consolas, monospace' : undefined }} placeholder={writeMode === 'md' ? '마크다운으로 작성...' : '<div>HTML 코드를 작성/붙여넣기...</div>'} value={body} onChange={e => setBody(e.target.value)} /><div className="preview-box" style={{ marginTop: 14 }}><div className="pv-label">PREVIEW — 실시간 미리보기</div><div className="post-body" dangerouslySetInnerHTML={{ __html: preview }} /></div></>}
              {board.skin === 'ticket' && bodyImages.length > 0 && <div style={{ marginTop: 14 }}><label className="k-label" style={{ marginBottom: 7 }}>대표 이미지 (티켓 썸네일)</label><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{bodyImages.map(src => <div key={src} data-tip={thumbSrc === src ? '썸네일 위치 조정' : '대표로 선택'} onClick={() => { if (thumbSrc !== src) { setThumbSrc(src); setThumbCrop(undefined); } setCropOpen(true); }} style={{ width: 104, aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', position: 'relative', flexShrink: 0, outline: thumbSrc === src ? '2px solid var(--accent)' : '1px solid var(--line)', outlineOffset: 2 }}><CropImg src={src} crop={thumbSrc === src ? thumbCrop : undefined} /></div>)}</div></div>}
            </>
          )}
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
          <div className="form-actions"><button className="btn btn-onbk" onClick={() => router.push(editing ? `/board/${editing.id}` : boardHref(board.id))}>CANCEL</button><button className="btn btn-accent" onClick={post}>{editing ? 'SAVE' : 'POST'}</button></div>
        </div>
      </div>

      <ConfirmModal open={askRich !== null} title="여기서 편집하면 일부 태그가 정리됩니다" body="에디터는 굵게·목록·제목·이미지 같은 기본 서식만 다룹니다. 표·div·style·class 등은 편집하는 순간 정리되며 되돌릴 수 없습니다. HTML을 그대로 두려면 취소하세요." onClose={() => setAskRich(null)} buttons={[{ label: 'CANCEL', kind: 'ghost', onClick: () => setAskRich(null) }, { label: '계속', kind: 'accent', onClick: () => { askRich?.(); setAskRich(null); } }]} />
      {cropOpen && thumbSrc && <CropEditor open src={thumbSrc} aspect="16:9" initial={thumbCrop} onClose={() => setCropOpen(false)} onApply={c => { setThumbCrop(c); setCropOpen(false); }} />}
    </section>
  );
}

export default function BoardWritePage() {
  return <Suspense fallback={<section className="page" />}><WriteInner /></Suspense>;
}
