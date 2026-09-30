'use client';

import React, { useMemo, useRef, useState } from 'react';
import type { ChatMessage } from '@/lib/postStore';
import { newId } from '@/lib/postStore';

type ParsedMessage = { speaker: string; text: string };

type Props = {
  onImport: (data: { leftName: string; rightName: string; messages: ChatMessage[] }) => void;
};

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
    if (!line.trim()) {
      if (current) current.text += '\n';
      continue;
    }

    // 모바일 카카오톡 내보내기: [닉네임] [오후 4:12] 메시지
    let m = line.match(/^\[(.+?)\]\s*\[(?:오전|오후)?\s*\d{1,2}:\d{2}\]\s*(.*)$/);
    if (m) {
      push();
      current = { speaker: m[1], text: m[2] };
      continue;
    }

    // PC/일부 버전: 2026년 9월 30일 오후 4:12, 닉네임 : 메시지
    m = line.match(/^\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*(?:오전|오후)?\s*\d{1,2}:\d{2},\s*(.+?)\s*:\s*(.*)$/);
    if (m) {
      push();
      current = { speaker: m[1], text: m[2] };
      continue;
    }

    // 영문/CSV 계열: 2026-09-30 16:12, Nick, Message
    m = line.match(/^\d{4}[-./]\d{1,2}[-./]\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?\s*,\s*([^,]+?)\s*,\s*(.*)$/);
    if (m) {
      push();
      current = { speaker: m[1], text: m[2] };
      continue;
    }

    // 날짜 구분선/저장 안내 등은 버리고, 그 외 줄은 직전 메시지의 줄바꿈으로 취급
    if (/^-{3,}.*-{3,}$/.test(line) || /^(채팅방|저장한 날짜|대화 내용)/.test(line)) continue;
    if (current) current.text += `${current.text.endsWith('\n') ? '' : '\n'}${line}`;
  }
  push();
  return out;
}

export function KakaoChatImport({ onImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedMessage[]>([]);
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState(0);
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [error, setError] = useState('');

  const speakers = useMemo(() => [...new Set(rows.map(r => r.speaker))], [rows]);
  const searchHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as number[];
    const hit: number[] = [];
    rows.forEach((r, i) => {
      if (hit.length < 50 && (`${r.speaker} ${r.text}`).toLowerCase().includes(q)) hit.push(i);
    });
    return hit;
  }, [rows, query]);

  const lo = Math.max(0, Math.min(focus - 10, Math.max(0, rows.length - 21)));
  const hi = Math.min(rows.length, lo + 21);
  const rangeLo = start == null || end == null ? null : Math.min(start, end);
  const rangeHi = start == null || end == null ? null : Math.max(start, end);

  const load = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      const text = await file.text();
      const parsed = parseKakaoText(text);
      if (!parsed.length) {
        setRows([]);
        setError('메시지를 찾지 못했습니다. 카카오톡에서 내보낸 TXT 파일인지 확인해 주세요.');
        return;
      }
      const names = [...new Set(parsed.map(r => r.speaker))];
      setRows(parsed);
      setFileName(file.name);
      setLeft(names[0] ?? '왼쪽');
      setRight(names[1] ?? names[0] ?? '오른쪽');
      setFocus(0); setStart(null); setEnd(null); setQuery('');
    } catch {
      setError('파일을 읽지 못했습니다.');
    }
  };

  const jump = (ratio: number) => {
    if (!rows.length) return;
    setFocus(Math.max(0, Math.min(rows.length - 1, Math.round((rows.length - 1) * ratio))));
  };

  const importRange = () => {
    if (rangeLo == null || rangeHi == null) return;
    if (!left || !right || left === right) return;
    const selected = rows.slice(rangeLo, rangeHi + 1)
      .filter(r => r.speaker === left || r.speaker === right)
      .map<ChatMessage>(r => ({ id: newId(), side: r.speaker === left ? 'left' : 'right', text: r.text }));
    if (!selected.length) return;
    onImport({ leftName: left, rightName: right, messages: selected });
  };

  return (
    <div className="kakao-import">
      <div className="kakao-import-head">
        <div>
          <b>카카오톡 대화 가져오기</b>
          <small>{fileName ? `${fileName} · ${rows.length.toLocaleString()}개 메시지` : 'TXT 파일에서 필요한 구간만 가져옵니다'}</small>
        </div>
        <input ref={inputRef} type="file" accept=".txt,text/plain" hidden onChange={e => { void load(e.target.files?.[0]); e.target.value = ''; }} />
        <button type="button" className="btn btn-ghost" onClick={() => inputRef.current?.click()}>{rows.length ? '파일 다시 선택' : '파일 선택'}</button>
      </div>

      {error && <div className="kakao-import-error">{error}</div>}

      {rows.length > 0 && (
        <>
          <div className="kakao-speakers">
            <label>왼쪽<select value={left} onChange={e => setLeft(e.target.value)}>{speakers.map(s => <option key={s}>{s}</option>)}</select></label>
            <label>오른쪽<select value={right} onChange={e => setRight(e.target.value)}>{speakers.map(s => <option key={s}>{s}</option>)}</select></label>
          </div>

          {left === right && <div className="kakao-import-error">왼쪽과 오른쪽 화자를 다르게 선택해 주세요.</div>}
          {speakers.length > 2 && <div className="kakao-import-note">화자가 {speakers.length}명입니다. 선택한 두 사람의 메시지만 가져옵니다.</div>}

          <div className="kakao-find">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="기억나는 대화 내용이나 닉네임 검색" />
            <div className="kakao-jumps">
              <button type="button" onClick={() => jump(0)}>처음</button>
              <button type="button" onClick={() => jump(.25)}>25%</button>
              <button type="button" onClick={() => jump(.5)}>50%</button>
              <button type="button" onClick={() => jump(.75)}>75%</button>
              <button type="button" onClick={() => jump(1)}>끝</button>
            </div>
          </div>

          {query.trim() && (
            <div className="kakao-search-results">
              {searchHits.length ? searchHits.map(i => (
                <button key={i} type="button" onClick={() => setFocus(i)}>
                  <span>#{i + 1} · {rows[i].speaker}</span>{rows[i].text.replace(/\n/g, ' ').slice(0, 90)}
                </button>
              )) : <small>검색 결과가 없습니다.</small>}
            </div>
          )}

          <div className="kakao-range-status">
            <span>현재 #{focus + 1} / {rows.length}</span>
            <span>{rangeLo == null ? '시작점과 끝점을 지정하세요' : `선택: #${rangeLo + 1} ~ #${rangeHi! + 1} (${rangeHi! - rangeLo + 1}개)`}</span>
          </div>

          <div className="kakao-preview">
            {rows.slice(lo, hi).map((r, j) => {
              const i = lo + j;
              const inRange = rangeLo != null && rangeHi != null && i >= rangeLo && i <= rangeHi;
              return (
                <button key={i} type="button" className={`${i === focus ? 'focus' : ''} ${inRange ? 'selected' : ''}`} onClick={() => setFocus(i)}>
                  <span className="num">#{i + 1}</span><b>{r.speaker}</b><span className="text">{r.text}</span>
                </button>
              );
            })}
          </div>

          <div className="kakao-range-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setStart(focus)}>현재 위치를 시작점으로</button>
            <button type="button" className="btn btn-ghost" onClick={() => setEnd(focus)}>현재 위치를 끝점으로</button>
            <button type="button" className="btn btn-ghost" onClick={() => { setStart(null); setEnd(null); }}>범위 초기화</button>
            <button type="button" className="btn btn-dark" disabled={rangeLo == null || rangeHi == null || !left || !right || left === right} onClick={importRange}>선택 구간 가져오기</button>
          </div>
        </>
      )}

      <style>{`
        .kakao-import{border:1px solid var(--line);border-radius:11px;padding:13px;display:grid;gap:11px;background:color-mix(in srgb,var(--panel) 86%,transparent)}
        .kakao-import-head{display:flex;align-items:center;gap:10px;justify-content:space-between}
        .kakao-import-head>div{display:grid;gap:2px;min-width:0}.kakao-import-head b{font-size:12px}.kakao-import-head small,.kakao-import-note{font-size:10.5px;color:var(--faint)}
        .kakao-import-error{font-size:11px;color:var(--accent)}
        .kakao-speakers{display:grid;grid-template-columns:1fr 1fr;gap:9px}.kakao-speakers label{display:grid;grid-template-columns:45px minmax(0,1fr);align-items:center;gap:7px;font-size:10.5px;color:var(--faint)}
        .kakao-speakers select,.kakao-find input{min-width:0;width:100%;height:32px;border:1px solid var(--line);border-radius:7px;background:var(--panel);color:var(--fg);padding:0 9px;font:inherit}
        .kakao-find{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.kakao-jumps{display:flex;gap:4px}.kakao-jumps button{padding:0 7px;border:1px solid var(--line);border-radius:7px;font-size:10px;color:var(--muted)}
        .kakao-search-results{max-height:160px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:4px}.kakao-search-results button{display:grid;width:100%;text-align:left;gap:2px;padding:7px 8px;border-radius:6px;font-size:11px;color:var(--muted)}.kakao-search-results button:hover{background:color-mix(in srgb,var(--accent) 8%,transparent)}.kakao-search-results button span{font-size:9.5px;color:var(--faint)}
        .kakao-range-status{display:flex;justify-content:space-between;gap:8px;font-size:10.5px;color:var(--faint)}
        .kakao-preview{border:1px solid var(--line);border-radius:9px;overflow:hidden}.kakao-preview>button{display:grid;grid-template-columns:44px 92px minmax(0,1fr);gap:7px;width:100%;text-align:left;padding:7px 9px;border-bottom:1px solid var(--line);font-size:11px;align-items:start}.kakao-preview>button:last-child{border-bottom:0}.kakao-preview>button.focus{outline:1px solid var(--accent);outline-offset:-1px}.kakao-preview>button.selected{background:color-mix(in srgb,var(--accent) 10%,transparent)}.kakao-preview .num{color:var(--faint)}.kakao-preview b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kakao-preview .text{white-space:pre-wrap;word-break:break-word}
        .kakao-range-actions{display:flex;gap:6px;flex-wrap:wrap}.kakao-range-actions .btn{font-size:10px;height:30px}
        @media(max-width:620px){.kakao-import-head{align-items:flex-start;flex-wrap:wrap}.kakao-speakers{grid-template-columns:1fr}.kakao-find{grid-template-columns:1fr}.kakao-jumps{overflow-x:auto}.kakao-jumps button{min-height:29px;flex:1 0 auto}.kakao-range-status{display:grid}.kakao-preview>button{grid-template-columns:40px 70px minmax(0,1fr);padding:7px 6px}.kakao-range-actions{display:grid;grid-template-columns:1fr 1fr}.kakao-range-actions .btn:last-child{grid-column:1/-1}}
      `}</style>
    </div>
  );
}
