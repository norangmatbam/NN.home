'use client';
// 게시글 상세 (4.2) — 본문 렌더(격리 새니타이즈) · 접기 · 댓글+대댓글
import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useHrefBlock } from '@/components/shell/MenuGuard';
import { extraBoardHref } from '@/lib/menuStore';
import { useAuth } from '@/lib/auth';
import {
  useLocalList, BOARD_SEED, Post, Comment, newId, fmtDate, fmtPostDate,
  CommentRow, COMMENT_KEY, COMMENT_SEED, commentsFor,
} from '@/lib/postStore';
import { useBoards, boardHref, MAIN_BOARD_ID, BoardPerm } from '@/lib/boardStore';
import { useBoardDisplay } from '@/lib/boardDisplayStore';
import { renderBody } from '@/lib/sanitize';
import { KInput } from '@/components/ui/Kit';
import { ConfirmModal } from '@/components/ui/Modal';
import { GuestIdBar } from '@/components/ui/GuestId';
import { useToast } from '@/components/ui/Toast';
import { PageTitle } from '@/components/ui/PageText';
import { pushNotif } from '@/lib/notifStore';
import { ChatConversation } from '@/components/board/ChatConversation';

const FOLD_LABEL = { spoiler: '스포일러 주의', adult: '수위 주의' };

export default function BoardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const [posts, setPosts, loaded] = useLocalList<Post>('ohome.board.v1', BOARD_SEED);
  const [cmtRows, setCmtRows] = useLocalList<CommentRow>(COMMENT_KEY, COMMENT_SEED);
  const { boards } = useBoards();
  const [open, setOpen] = useState(false);
  const [cmt, setCmt] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [delAsk, setDelAsk] = useState(false);
  const [gName, setGName] = useState('');

  const post = posts.find(p => p.id === id);
  const bid = post?.boardId ?? MAIN_BOARD_ID;
  const [display] = useBoardDisplay(bid);
  const blocked = useHrefBlock(post && (bid === MAIN_BOARD_ID ? '/board' : extraBoardHref(bid)));
  const html = useMemo(() => (post && loaded && !post.chat ? renderBody(post.mode, post.body) : ''), [post, loaded]);

  if (blocked) return blocked;
  if (!loaded) return <section className="page" />;
  if (!post) {
    return <section className="page"><div className="page-head"><PageTitle>BOARD</PageTitle><p>글을 찾을 수 없습니다</p></div></section>;
  }

  const isAuthor = !!post.authorId && post.authorId === user?.id;
  if (post.secret && !isAdmin && !isAuthor) {
    return <section className="page"><div className="page-head"><PageTitle>BOARD</PageTitle><p>비밀글 — 작성자와 관리자만 열람할 수 있습니다</p></div></section>;
  }

  const board = boards.find(b => b.id === (post.boardId ?? MAIN_BOARD_ID)) ?? boards[0];
  const boardTitle = board.id === MAIN_BOARD_ID ? 'BOARD' : board.name;
  const allow = (p: BoardPerm) => (p === 'admin' ? isAdmin : p === 'member' ? !!user : true);
  const guestMode = !user && board.permComment === 'guest';
  const canComment = allow(board.permComment) && (!!user || guestMode);
  const canManage = isAdmin || isAuthor;
  const update = (patch: Partial<Post>) => setPosts(posts.map(p => p.id === post.id ? { ...p, ...patch } : p));
  const comments = commentsFor(cmtRows, 'post', post.id, post.comments);

  const downloadChatTxt = () => {
    const chat = post.chat;
    if (!chat) return;

    const header = [
      `제목: ${post.title}`,
      `날짜: ${post.chatDate ?? fmtPostDate(post)}`,
      `왼쪽: ${chat.left.name}`,
      `오른쪽: ${chat.right.name}`,
      `메시지: ${chat.messages.length.toLocaleString()}개`,
    ];
    const transcript = chat.messages.map(m => {
      const name = m.side === 'left' ? chat.left.name : chat.right.name;
      const text = m.text.replace(/\r\n?/g, '\n').replace(/\n/g, '\n  ');
      return `[${name}] ${text}`;
    });
    const text = `${header.join('\n')}\n\n---\n\n${transcript.join('\n\n')}\n`;
    const blob = new Blob(['\uFEFF', text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeTitle = post.title.replace(/[\\/:*?"<>|]/g, '_').trim() || 'chat';
    const date = (post.chatDate || post.date.slice(0, 10)).replace(/[^0-9.-]/g, '');
    a.href = url;
    a.download = `${safeTitle}${date ? `_${date}` : ''}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const addComment = () => {
    if (!canComment) { toast('댓글은 로그인 후 작성할 수 있습니다'); return; }
    if (!cmt.trim()) return;
    if (guestMode && !gName.trim()) { toast('닉네임을 입력해 주세요'); return; }
    const base = { id: newId(), text: cmt.trim(), date: new Date().toISOString(), parentId: replyTo ?? undefined };
    const c: CommentRow = user
      ? { ...base, target: 'post', targetId: post.id, author: user.nickname, authorId: user.id }
      : { ...base, target: 'post', targetId: post.id, author: gName.trim(), authorId: '' };
    setCmtRows([...cmtRows, c]);
    const me = user?.id ?? '';
    if (post.authorId && post.authorId !== me) {
      pushNotif({ type: 'comment', toUserId: post.authorId, href: `/board/${post.id}`, title: `「${post.title}」에 새 댓글`, body: `${c.author} — ${c.text.slice(0, 50)}` });
    }
    if (replyTo) {
      const rootAuthor = comments.find(x => x.id === replyTo)?.authorId;
      const seen = new Set<string>();
      for (const t of comments.filter(x => x.id === replyTo || x.parentId === replyTo)) {
        const to = t.authorId;
        if (!to || to === me || to === post.authorId || seen.has(to)) continue;
        seen.add(to);
        pushNotif({ type: 'comment', toUserId: to, href: `/board/${post.id}`, title: to === rootAuthor ? '내 댓글에 답글이 달렸습니다' : '참여한 댓글에 새 답글이 달렸습니다', body: `${c.author} — ${c.text.slice(0, 50)}` });
      }
    }
    setCmt(''); setReplyTo(null);
  };

  const removeComment = (c: Comment) => {
    const gone = (x: { id: string; parentId?: string }) => x.id === c.id || x.parentId === c.id;
    if (cmtRows.some(gone)) setCmtRows(cmtRows.filter(x => !gone(x)));
    if (post.comments.some(gone)) update({ comments: post.comments.filter(x => !gone(x)) });
  };
  const roots = comments.filter(c => !c.parentId);
  const childrenOf = (pid: string) => comments.filter(c => c.parentId === pid);

  const CmtRow = ({ c, depth }: { c: Comment; depth: number }) => (
    <div className={`cmt ${depth > 0 ? 'reply-depth' : ''}`}>
      <b>{c.author}</b><small>{fmtDate(c.date)}</small>
      {canComment && depth === 0 && <small style={{ cursor: 'var(--cur-pointer,pointer)', color: 'var(--accent)', marginLeft: 8 }} onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}>{replyTo === c.id ? '답글 취소' : '답글'}</small>}
      {(isAdmin || (user && c.authorId === user.id)) && <small style={{ cursor: 'var(--cur-pointer,pointer)', marginLeft: 8 }} onClick={() => removeComment(c)}>삭제</small>}
      <p>{c.text}</p>
    </div>
  );

  return (
    <section className="page">
      <div className="page-head">
        <PageTitle href={boardHref(board.id)}>{boardTitle}</PageTitle>
        <p>{post.notice ? '공지' : post.category}{display.showAuthor && <> · {post.author}</>}{' · '}{fmtPostDate(post)}</p>
        <div className="head-actions">
          {post.chat && <button className="btn btn-dark" onClick={downloadChatTxt}>TXT ↓</button>}
          {isAuthor && <button className="btn btn-dark" onClick={() => router.push(`/board/write?edit=${post.id}`)}>EDIT</button>}
          {canManage && <button className="btn btn-dark" onClick={() => setDelAsk(true)}>DELETE</button>}
        </div>
      </div>

      <div className="panel" style={{ padding: '26px 28px' }}>
        <h2 style={{ fontSize: 19, marginBottom: 4 }}>{post.secret && '🔒 '}{post.title}</h2>
        <p style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 18 }}>
          {display.showAuthor && <>{post.author} · </>}{fmtPostDate(post)} · {post.chat ? 'CHAT' : post.mode.toUpperCase()}
          {(post.tags ?? []).map(t => <span key={t} style={{ marginLeft: 7, color: 'color-mix(in srgb,var(--accent) 65%,var(--faint))' }}>#{t}</span>)}
        </p>

        <div className={`veil ${!post.fold || open ? 'open' : ''}`}>
          {post.fold && !open && <div className="cover" onClick={() => setOpen(true)} style={{ position: 'absolute' }}><div><b>{post.fold.type === 'custom' ? (post.fold.label || '접힌 글') : FOLD_LABEL[post.fold.type]}</b><span style={{ display: 'block' }}>클릭하면 내용이 표시됩니다</span></div></div>}
          <div style={post.fold && !open ? { minHeight: 120, filter: 'blur(6px)' } : undefined}>
            {post.chat ? <ChatConversation chat={post.chat} /> : <div className="post-body" dangerouslySetInnerHTML={{ __html: html }} />}
          </div>
        </div>
      </div>

      <div className="panel" style={{ padding: 0, marginTop: 16 }}>
        <div style={{ padding: '16px 18px' }}>
          <h4 style={{ fontSize: 11.5, letterSpacing: '.12em', color: 'var(--faint)', marginBottom: 13 }}>COMMENTS {comments.length > 0 && <span style={{ color: 'var(--accent)' }}>{comments.length}</span>}</h4>
          {roots.map(c => <React.Fragment key={c.id}><CmtRow c={c} depth={0} />{childrenOf(c.id).map(cc => <CmtRow key={cc.id} c={cc} depth={1} />)}</React.Fragment>)}
          {comments.length === 0 && <p style={{ fontSize: 12, color: 'var(--faint)' }}>첫 댓글을 남겨보세요</p>}
        </div>
        {canComment ? (
          <div className={`cmt-input ${guestMode ? 'guest' : ''}`}>
            {guestMode && <GuestIdBar name={gName} onName={setGName} />}
            <div className="ci-row" style={guestMode ? undefined : { display: 'contents' }}>
              <KInput placeholder={replyTo ? '답글 작성...' : '댓글 남기기...'} value={cmt} onChange={e => setCmt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addComment(); }} />
              <button className="btn btn-dark" onClick={addComment}>POST</button>
            </div>
          </div>
        ) : <div style={{ padding: '12px 18px', borderTop: '1px solid var(--line)', fontSize: 11.5, color: 'var(--faint)' }}>{user ? '이 게시판은 관리자만 댓글을 쓸 수 있습니다' : '댓글은 로그인 후 작성할 수 있습니다'}</div>}
      </div>

      <ConfirmModal open={delAsk} title="글을 삭제하시겠습니까?" body="삭제한 글은 복구할 수 없습니다." onClose={() => setDelAsk(false)} buttons={[
        { label: 'DELETE', kind: 'accent', onClick: () => { setPosts(posts.filter(p => p.id !== post.id)); setCmtRows(cmtRows.filter(c => !(c.target === 'post' && c.targetId === post.id))); router.push(boardHref(board.id)); } },
        { label: 'CANCEL', kind: 'ghost', onClick: () => setDelAsk(false) },
      ]} />
    </section>
  );
}
