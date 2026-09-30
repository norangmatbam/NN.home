'use client';
// 일반 게시판 목록 — 기본형 / 티켓형 / 대화형
import React, { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  useLocalList, BOARD_SEED, Post, fmtPostDate,
  CommentRow, COMMENT_KEY, COMMENT_SEED, commentsFor,
} from '@/lib/postStore';
import {
  useBoardSettings, useBoards, badgeFor, boardBadgeStyle, boardHref, MAIN_BOARD_ID, BoardPerm, BoardSkin,
} from '@/lib/boardStore';
import { useBoardDisplay } from '@/lib/boardDisplayStore';
import { boardEntries, buildMenu, useMenuSettings } from '@/lib/menuStore';
import { SearchBar, Pager } from '@/components/ui/Kit';
import { CropImg } from '@/components/ui/CropEditor';
import { BlobImg } from '@/lib/blobStore';
import { EditableDesc, PageTitle } from '@/components/ui/PageText';

const PER_PAGE = 10;

function firstImage(body: string): string | null {
  const html = /<img[^>]*src=["']([^"']+)["']/i.exec(body);
  if (html) return html[1];
  const md = /!\[[^\]]*\]\(([^)\s]+)/.exec(body);
  return md ? md[1] : null;
}

function BoardInner() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const params = useSearchParams();
  const bid = params.get('b') ?? MAIN_BOARD_ID;
  const { boards, loaded: boardsLoaded, patchBoard } = useBoards();
  const board = boards.find(b => b.id === bid) ?? boards[0];
  const [display] = useBoardDisplay(board.id);
  const [posts] = useLocalList<Post>('ohome.board.v1', BOARD_SEED);
  const [cmtRows] = useLocalList<CommentRow>(COMMENT_KEY, COMMENT_SEED);
  const cmtCount = (p: Post) => commentsFor(cmtRows, 'post', p.id, p.comments).length;
  const { st: boardSet } = useBoardSettings();
  const [menuSet, , menuLoaded] = useMenuSettings();
  const [cat, setCat] = useState('전체');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const currentBoardHref = boardHref(board.id);
  const siblingBoards = useMemo(() => {
    if (!menuLoaded) return [] as { label: string; href: string }[];
    const menu = buildMenu(menuSet, boardEntries(boards), { loggedIn: !!user, isAdmin, id: user?.id });
    const group = menu.find(m => m.children?.some(c => c.href === currentBoardHref));
    return (group?.children ?? []).filter(c => c.href === '/board' || c.href.startsWith('/board?b='));
  }, [menuLoaded, menuSet, boards, user, isAdmin, currentBoardHref]);

  const [prevBid, setPrevBid] = useState(bid);
  if (prevBid !== bid) { setPrevBid(bid); setCat('전체'); setQ(''); setPage(1); }

  const allow = (p: BoardPerm) => (p === 'admin' ? isAdmin : p === 'member' ? !!user : true);

  const visible = useMemo(() => {
    let list = posts.filter(p => (p.boardId ?? MAIN_BOARD_ID) === board.id);
    if (cat === '공지') list = list.filter(p => p.notice);
    else if (cat !== '전체') list = list.filter(p => p.category === cat);
    if (q) {
      const k = q.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(k) ||
        (display.showAuthor && p.author.toLowerCase().includes(k)) ||
        (p.tags ?? []).some(t => t.toLowerCase().includes(k)) ||
        (!p.secret && p.body.toLowerCase().includes(k)));
    }
    return list.sort((a, b) => (b.notice ? 1 : 0) - (a.notice ? 1 : 0) || b.date.localeCompare(a.date));
  }, [posts, board.id, cat, q, display.showAuthor]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PER_PAGE));
  const pageList = visible.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const canRead = (p: Post) => !p.secret || isAdmin || (!!p.authorId && p.authorId === user?.id);

  if (!boardsLoaded) return <section className="page" />;

  const postBadge = (p: Post) => (
    <span style={boardBadgeStyle(badgeFor(boardSet, p, board.cats))}>
      {p.notice ? boardSet.system[0].label : p.secret ? boardSet.system[1].label : p.category}
    </span>
  );
  const filterNames = ['전체', ...(display.showNotice ? ['공지'] : []), ...board.cats.map(x => x.label)];

  const skinLabel = (s: BoardSkin) => s === 'list' ? '기본형' : s === 'ticket' ? '티켓형' : '대화형';

  return (
    <section className="page">
      <div className="page-head">
        <PageTitle href={boardHref(board.id)}>{board.id === MAIN_BOARD_ID ? 'BOARD' : board.name}</PageTitle>
        <EditableDesc k={board.id === MAIN_BOARD_ID ? 'board-desc' : `board-desc-${board.id}`} def={board.desc} />
      </div>

      {siblingBoards.length > 1 && (
        <nav className="board-switch-nav" aria-label="같은 카테고리 게시판">
          {siblingBoards.map(item => <button key={item.href} className={item.href === currentBoardHref ? 'on' : ''} onClick={() => router.push(item.href)}>{item.label}</button>)}
        </nav>
      )}

      <div className="toolrow">
        <div className="seg">
          {filterNames.map(c => <button key={c} className={cat === c ? 'on' : ''} onClick={() => { setCat(c); setPage(1); }}>{c}</button>)}
          {isAdmin && board.skin === 'chat' && (
            <button onClick={() => router.push(`/convert/kakao?b=${encodeURIComponent(board.id)}`)}>↔ CONVERT</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {isAdmin && (
            <div className="mini-seg" data-tip="게시판 보기 형식">
              {(['list', 'ticket', 'chat'] as BoardSkin[]).map(s => (
                <button key={s} className={board.skin === s ? 'on' : ''} onClick={() => patchBoard(board.id, { skin: s })}>{skinLabel(s)}</button>
              ))}
            </div>
          )}
          <SearchBar onSearch={v => { setQ(v); setPage(1); }} />
          {allow(board.permWrite) && !!user && <button className="btn btn-dark" onClick={() => router.push(`/board/write?b=${board.id}`)}>✎ WRITE</button>}
        </div>
      </div>

      {board.skin === 'chat' ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {pageList.map(p => {
            const chat = canRead(p) ? p.chat : undefined;
            const first = chat?.messages.find(m => m.text.trim());
            return (
              <div key={p.id} className="panel" onClick={() => { if (canRead(p)) router.push(`/board/${p.id}`); }}
                style={{ padding: '14px 16px', cursor: canRead(p) ? 'var(--cur-pointer,pointer)' : undefined, display: 'grid', gridTemplateColumns: '44px minmax(0,1fr) auto', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--panel)' }}>
                  {chat ? <BlobImg fileRef={chat.left.avatar} label={chat.left.name.slice(0, 1)} /> : <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', color: 'var(--faint)' }}>•</div>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {postBadge(p)}
                    <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{canRead(p) ? p.title : '🔒 비밀글입니다'}</b>
                    {canRead(p) && cmtCount(p) > 0 && <span className="cmt">{cmtCount(p)}</span>}
                  </div>
                  {chat && <div style={{ fontSize: 11.5, color: 'var(--faint)', marginBottom: 3 }}>{chat.left.name} ↔ {chat.right.name}</div>}
                  {canRead(p) && first && <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{first.text}</div>}
                </div>
                <span style={{ fontSize: 11, color: 'var(--faint)', whiteSpace: 'nowrap' }}>{fmtPostDate(p)}</span>
              </div>
            );
          })}
          {pageList.length === 0 && <div className="panel" style={{ padding: 36, textAlign: 'center', fontSize: 12.5, color: 'var(--faint)' }}>대화가 없습니다</div>}
        </div>
      ) : board.skin === 'ticket' ? (
        <div style={board.fg ? { color: board.fg } : undefined}>
          {pageList.map(p => {
            const thumb = canRead(p) ? (p.thumbSrc ?? firstImage(p.body)) : null;
            return (
              <div className="bticket" key={p.id} onClick={() => { if (canRead(p)) router.push(`/board/${p.id}`); }}>
                <div className="bt-thumb">{thumb ? <CropImg src={thumb} crop={p.thumbSrc ? p.thumbCrop : undefined} /> : <div className="bt-ph">{(canRead(p) ? p.title : 'SECRET').slice(0, 1).toUpperCase()}</div>}</div>
                <div className="bt-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{postBadge(p)}{p.fold && <span style={boardBadgeStyle(boardSet.system[2])}>{boardSet.system[2].label}</span>}</div>
                  <div className="bt-title">{canRead(p) ? <>{p.secret && '🔒 '}{p.title}</> : '🔒 비밀글입니다'}{canRead(p) && cmtCount(p) > 0 && <span className="cmt">{cmtCount(p)}</span>}</div>
                  <div className="bt-meta">{display.showAuthor ? `${p.author} · ${fmtPostDate(p)}` : fmtPostDate(p)}</div>
                </div>
              </div>
            );
          })}
          {pageList.length === 0 && <div className="panel" style={{ padding: 36, textAlign: 'center', fontSize: 12.5, color: 'var(--faint)' }}>게시글이 없습니다</div>}
        </div>
      ) : (
        <div className="panel board-list flush" style={board.fg ? { color: board.fg } : undefined}>
          {pageList.map(p => (
            <div className="brow" key={p.id} style={{ gridTemplateColumns: display.showAuthor ? '70px minmax(0, 1fr) 90px 76px' : '70px minmax(0, 1fr) 76px' }} onClick={() => { if (canRead(p)) router.push(`/board/${p.id}`); }}>
              <span className="cat">{postBadge(p)}</span>
              <div className="tcell">
                {canRead(p) ? <b>{p.secret && '🔒 '}{p.title}{cmtCount(p) > 0 && <span className="cmt">{cmtCount(p)}</span>}{p.fold && <span style={{ ...boardBadgeStyle(boardSet.system[2]), marginLeft: 6 }}>{boardSet.system[2].label}</span>}</b> : <b style={{ color: 'var(--faint)' }}>🔒 비밀글입니다</b>}
                {canRead(p) && (p.tags ?? []).length > 0 && <span className="tags">{(p.tags ?? []).map(t => <i key={t}>#{t}</i>)}</span>}
              </div>
              {display.showAuthor && <span className="who">{p.author}</span>}
              <span className="dt">{fmtPostDate(p)}</span>
            </div>
          ))}
          {pageList.length === 0 && <div style={{ padding: 36, textAlign: 'center', fontSize: 12.5, color: 'var(--faint)' }}>게시글이 없습니다</div>}
        </div>
      )}
      <Pager page={page} total={totalPages} onChange={setPage} />
    </section>
  );
}

export default function BoardPage() {
  return <Suspense fallback={<section className="page" />}><BoardInner /></Suspense>;
}
