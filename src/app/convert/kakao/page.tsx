'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useBoards, boardHref } from '@/lib/boardStore';
import { newId, type ChatMessage } from '@/lib/postStore';
import { PageTitle } from '@/components/ui/PageText';

const TRANSFER_KEY = 'ohome.kakao.convert.v1';

type ParsedMessage = { speaker: string; text: string };

type Headers = Record<string, string>;

function parseHeaders(raw: string): Headers {
  const unfolded = raw.replace(/\r?\n[ \t]+/g, ' ');
  const out: Headers = {};
  for (const line of unfolded.split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i <= 0) continue;
    out[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return out;
}

function bytesToText(bytes: Uint8Array, charset = 'utf-8'): string {
  const cs = charset.toLowerCase().replace(/["']/g, '');
  const aliases: Record<string, string> = {
    'ks_c_5601-1987': 'euc-kr', 'ks_c_5601-1989': 'euc-kr', 'cp949': 'euc-kr', 'ms949': 'euc-kr',
  };
  try { return new TextDecoder(aliases[cs] ?? cs).decode(bytes); }
  catch { return new TextDecoder('utf-8').decode(bytes); }
}

function decodeBase64(body: string, charset?: string): string {
  const clean = body.replace(/\s/g, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytesToText(bytes, charset);
}

function decodeQuotedPrintable(body: string, charset?: string): string {
  const src = body.replace(/=\r?\n/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < src.length; i++) {
    if (src[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(src.slice(i + 1, i + 3))) {
      bytes.push(parseInt(src.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      const enc = new TextEncoder().encode(src[i]);
      bytes.push(...enc);
    }
  }
  return bytesToText(new Uint8Array(bytes), charset);
}

function decodeMimeBody(headers: Headers, body: string): string {
  const ct = headers['content-type'] ?? 'text/plain; charset=utf-8';
  const charset = ct.match(/charset\s*=\s*"?([^;"\s]+)/i)?.[1] ?? 'utf-8';
  const cte = (headers['content-transfer-encoding'] ?? '').toLowerCase();
  if (cte.includes('base64')) return decodeBase64(body, charset);
  if (cte.includes('quoted-printable')) return decodeQuotedPrintable(body, charset);
  return body;
}

function htmlToText(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent ?? '';
  } catch {
    return html.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, ' ');
  }
}

function extractMimeTexts(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, '\n');
  const splitAt = normalized.indexOf('\n\n');
  const headRaw = splitAt >= 0 ? normalized.slice(0, splitAt) : '';
  const body = splitAt >= 0 ? normalized.slice(splitAt + 2) : normalized;
  const headers = parseHeaders(headRaw);
  const ct = headers['content-type'] ?? '';
  const bm = ct.match(/boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
  const boundary = bm?.[1] ?? bm?.[2];

  if (boundary) {
    const marker = `--${boundary}`;
    return body.split(marker)
      .map(p => p.replace(/^\n/, '').replace(/--\s*$/, ''))
      .filter(p => p.trim())
      .flatMap(extractMimeTexts);
  }

  const decoded = decodeMimeBody(headers, body).trim();
  if (!decoded) return [];
  if (/text\/html/i.test(ct)) return [htmlToText(decoded)];
  if (/text\/plain/i.test(ct) || !ct || /message\/rfc822/i.test(ct)) return [decoded];
  const disp = headers['content-disposition'] ?? '';
  const name = `${headers['content-type'] ?? ''};${disp}`;
  if (/\.(txt|csv)/i.test(name)) return [decoded];
  return [];
}

function parseKakaoText(raw: string): ParsedMessage[] {
  const lines = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const out: ParsedMessage[] = [];
  let current: ParsedMessage | null = null;
  const push = () => {
    if (current?.speaker.trim() && current.text.trim()) out.push({ speaker: current.speaker.trim(), text: current.text.trim() });
    current = null;
  };

  for (const source of lines) {
    const line = source.trimEnd();
    if (!line.trim()) { if (current) current.text += '\n'; continue; }

    let m = line.match(/^\[(.+?)\]\s*\[(?:오전|오후)?\s*\d{1,2}:\d{2}\]\s*(.*)$/);
    if (m) { push(); current = { speaker: m[1], text: m[2] }; continue; }

    m = line.match(/^\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*(?:오전|오후)?\s*\d{1,2}:\d{2},\s*(.+?)\s*:\s*(.*)$/);
    if (m) { push(); current = { speaker: m[1], text: m[2] }; continue; }

    m = line.match(/^\d{4}[-./]\d{1,2}[-./]\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?\s*,\s*([^,]+?)\s*,\s*(.*)$/);
    if (m) { push(); current = { speaker: m[1], text: m[2] }; continue; }

    m = line.match(/^([^:\n]{1,60})\s*:\s+(.+)$/);
    if (m && !/^(From|To|Date|Subject|Content-Type|MIME-Version)$/i.test(m[1])) {
      push(); current = { speaker: m[1], text: m[2] }; continue;
    }

    if (/^-{3,}.*-{3,}$/.test(line) || /^(채팅방|저장한 날짜|대화 내용)/.test(line)) continue;
    if (current) current.text += `${current.text.endsWith('\n') ? '' : '\n'}${line}`;
  }
  push();
  return out;
}

function parseEml(raw: string): ParsedMessage[] {
  const candidates = extractMimeTexts(raw);
  let best: ParsedMessage[] = [];
  for (const text of candidates.length ? candidates : [raw]) {
    const parsed = parseKakaoText(text);
    if (parsed.length > best.length) best = parsed;
  }
  return best;
}

export default function KakaoConvertPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, isAdmin } = useAuth();
  const { boards, loaded } = useBoards();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedMessage[]>([]);
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [targetBoard, setTargetBoard] = useState('');
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState(0);
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [error, setError] = useState('');

  const requestedBoard = params.get('b') ?? '';
  const chatBoards = useMemo(() => boards.filter(b => b.skin === 'chat'), [boards]);
  const speakers = useMemo(() => [...new Set(rows.map(r => r.speaker))], [rows]);
  const searchHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as number[];
    const hit: number[] = [];
    rows.forEach((r, i) => {
      if (hit.length < 100 && (`${r.speaker} ${r.text}`).toLowerCase().includes(q)) hit.push(i);
    });
    return hit;
  }, [rows, query]);

  const lo = Math.max(0, Math.min(focus - 10, Math.max(0, rows.length - 21)));
  const hi = Math.min(rows.length, lo + 21);
  const rangeLo = start == null || end == null ? null : Math.min(start, end);
  const rangeHi = start == null || end == null ? null : Math.max(start, end);

  React.useEffect(() => {
    if (!loaded || targetBoard || !chatBoards.length) return;
    const requested = chatBoards.find(b => b.id === requestedBoard);
    setTargetBoard(requested?.id ?? chatBoards[0].id);
  }, [loaded, targetBoard, chatBoards, requestedBoard]);

  React.useEffect(() => {
    if (user && !isAdmin) router.replace('/');
  }, [user, isAdmin, router]);

  if (!user || !isAdmin) return null;

  const load = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      const raw = await file.text();
      const parsed = file.name.toLowerCase().endsWith('.eml') ? parseEml(raw) : parseKakaoText(raw);
      if (!parsed.length) {
        setRows([]);
        setError('대화 메시지를 찾지 못했습니다. 이 EML의 본문 형식이 다른 경우 파일을 보내주면 파서를 맞출 수 있습니다.');
        return;
      }
      const names = [...new Set(parsed.map(r => r.speaker))];
      setRows(parsed); setFileName(file.name);
      setLeft(names[0] ?? '왼쪽'); setRight(names[1] ?? names[0] ?? '오른쪽');
      setFocus(0); setStart(null); setEnd(null); setQuery('');
    } catch {
      setRows([]); setError('파일을 읽거나 변환하지 못했습니다.');
    }
  };

  const jump = (ratio: number) => {
    if (!rows.length) return;
    setFocus(Math.max(0, Math.min(rows.length - 1, Math.round((rows.length - 1) * ratio))));
  };

  const sendToWrite = () => {
    if (rangeLo == null || rangeHi == null || !left || !right || left === right || !targetBoard) return;
    const selected = rows.slice(rangeLo, rangeHi + 1)
      .filter(r => r.speaker === left || r.speaker === right)
      .map<ChatMessage>(r => ({ id: newId(), side: r.speaker === left ? 'left' : 'right', text: r.text }));
    if (!selected.length) { setError('선택한 범위에 지정한 두 화자의 메시지가 없습니다.'); return; }

    // 화자명은 좌/우 배치 판정에만 사용한다. 게시글의 닉네임/프로필은 글쓰기에서 직접 입력한다.
    sessionStorage.setItem(TRANSFER_KEY, JSON.stringify({
      boardId: targetBoard,
      leftName: '왼쪽',
      rightName: '오른쪽',
      messages: selected,
    }));
    router.push(targetBoard === 'main' ? '/board/write' : `/board/write?b=${encodeURIComponent(targetBoard)}`);
  };

  return (
    <section className="page convert-page">
      <div className="page-head">
        <PageTitle href={targetBoard ? boardHref(targetBoard) : '/board'}>CONVERT</PageTitle>
        <p>카카오톡 EML에서 필요한 대화 구간만 골라 대화형 게시판 글쓰기로 보냅니다.</p>
      </div>

      <div className="panel convert-panel">
        <div className="convert-upload">
          <div><b>카카오톡 대화 파일</b><small>{fileName || '.eml 권장 · .txt도 지원'}</small></div>
          <input ref={inputRef} type="file" accept=".eml,message/rfc822,.txt,text/plain" hidden onChange={e => { void load(e.target.files?.[0]); e.target.value = ''; }} />
          <button className="btn btn-ghost" type="button" onClick={() => inputRef.current?.click()}>{rows.length ? '파일 다시 선택' : 'EML 선택'}</button>
        </div>

        {error && <div className="convert-error">{error}</div>}

        {rows.length > 0 && <>
          <div className="convert-grid3">
            <label>왼쪽 화자<select value={left} onChange={e => setLeft(e.target.value)}>{speakers.map(s => <option key={s}>{s}</option>)}</select></label>
            <label>오른쪽 화자<select value={right} onChange={e => setRight(e.target.value)}>{speakers.map(s => <option key={s}>{s}</option>)}</select></label>
            <label>보낼 게시판<select value={targetBoard} onChange={e => setTargetBoard(e.target.value)}>{chatBoards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          </div>

          {!chatBoards.length && <div className="convert-error">대화형으로 설정된 게시판이 없습니다. 먼저 게시판 하나를 대화형으로 설정해 주세요.</div>}
          {left === right && <div className="convert-error">왼쪽과 오른쪽 화자를 다르게 선택해 주세요.</div>}
          <div className="convert-note">{rows.length.toLocaleString()}개 메시지 · {speakers.length}명 감지</div>
          <div className="convert-note">화자 선택은 좌/우 말풍선 배치에만 사용합니다. 글에 표시할 닉네임과 프로필 이미지는 글쓰기에서 직접 입력합니다.</div>

          <div className="convert-find">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="기억나는 대화 내용이나 닉네임 검색" />
            <div className="convert-jumps">
              <button onClick={() => jump(0)}>처음</button><button onClick={() => jump(.25)}>25%</button><button onClick={() => jump(.5)}>50%</button><button onClick={() => jump(.75)}>75%</button><button onClick={() => jump(1)}>끝</button>
            </div>
          </div>

          {query.trim() && <div className="convert-results">
            {searchHits.length ? searchHits.map(i => <button key={i} onClick={() => { setFocus(i); setQuery(''); }}><span>#{i + 1} · {rows[i].speaker}</span>{rows[i].text.replace(/\n/g, ' ').slice(0, 120)}</button>) : <small>검색 결과가 없습니다.</small>}
          </div>}

          <div className="convert-status"><span>현재 #{focus + 1} / {rows.length}</span><span>{rangeLo == null ? '시작점과 끝점을 지정하세요' : `선택 #${rangeLo + 1} ~ #${rangeHi! + 1} · ${rangeHi! - rangeLo + 1}개`}</span></div>

          <div className="convert-preview">
            {rows.slice(lo, hi).map((r, j) => {
              const i = lo + j;
              const selected = rangeLo != null && rangeHi != null && i >= rangeLo && i <= rangeHi;
              return <button key={i} className={`${i === focus ? 'focus' : ''} ${selected ? 'selected' : ''}`} onClick={() => setFocus(i)}>
                <span>#{i + 1}</span><b>{r.speaker}</b><em>{r.text}</em>
              </button>;
            })}
          </div>

          <div className="convert-actions">
            <button className="btn btn-ghost" onClick={() => setStart(focus)}>현재 위치를 시작점으로</button>
            <button className="btn btn-ghost" onClick={() => setEnd(focus)}>현재 위치를 끝점으로</button>
            <button className="btn btn-ghost" onClick={() => { setStart(null); setEnd(null); }}>범위 초기화</button>
            <button className="btn btn-accent" disabled={rangeLo == null || rangeHi == null || left === right || !targetBoard || !chatBoards.length} onClick={sendToWrite}>대화형 글쓰기로 보내기</button>
          </div>
        </>}
      </div>

      <style>{`
        .convert-panel{padding:20px;display:grid;gap:14px}.convert-upload{display:flex;gap:12px;align-items:center;justify-content:space-between}.convert-upload>div{display:grid;gap:3px}.convert-upload b{font-size:13px}.convert-upload small,.convert-note,.convert-status{font-size:10.5px;color:var(--faint)}.convert-error{font-size:11px;color:var(--accent)}
        .convert-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}.convert-grid3 label{display:grid;gap:5px;font-size:10.5px;color:var(--faint)}.convert-grid3 select,.convert-find input{height:34px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--ink);padding:0 9px;min-width:0;width:100%}
        .convert-find{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.convert-jumps{display:flex;gap:4px}.convert-jumps button{padding:0 9px;border:1px solid var(--line);border-radius:7px;font-size:10px;color:var(--sub)}
        .convert-results{max-height:180px;overflow:auto;border:1px solid var(--line);border-radius:9px;padding:4px}.convert-results button{display:grid;width:100%;text-align:left;gap:2px;padding:7px 8px;border-radius:6px;font-size:11px;color:var(--sub)}.convert-results button:hover{background:color-mix(in srgb,var(--accent) 8%,transparent)}.convert-results span{font-size:9.5px;color:var(--faint)}
        .convert-status{display:flex;justify-content:space-between;gap:10px}.convert-preview{border:1px solid var(--line);border-radius:10px;overflow:hidden}.convert-preview>button{display:grid;grid-template-columns:50px 110px minmax(0,1fr);gap:8px;width:100%;padding:8px 10px;text-align:left;border-bottom:1px solid var(--line);font-size:11px;align-items:start}.convert-preview>button:last-child{border-bottom:0}.convert-preview>button.focus{outline:1px solid var(--accent);outline-offset:-1px}.convert-preview>button.selected{background:color-mix(in srgb,var(--accent) 10%,transparent)}.convert-preview>button>span{color:var(--faint)}.convert-preview b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.convert-preview em{font-style:normal;white-space:pre-wrap;word-break:break-word}.convert-actions{display:flex;gap:7px;flex-wrap:wrap}.convert-actions .btn{height:32px;font-size:10px}
        @media(max-width:620px){.convert-panel{padding:14px}.convert-upload{align-items:flex-start;flex-wrap:wrap}.convert-grid3{grid-template-columns:1fr}.convert-find{grid-template-columns:1fr}.convert-jumps{overflow-x:auto}.convert-jumps button{min-height:30px;flex:1 0 auto}.convert-status{display:grid}.convert-preview>button{grid-template-columns:42px 72px minmax(0,1fr);padding:7px 6px}.convert-actions{display:grid;grid-template-columns:1fr 1fr}.convert-actions .btn:last-child{grid-column:1/-1}}
      `}</style>
    </section>
  );
}