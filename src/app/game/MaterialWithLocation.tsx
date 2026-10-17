import type { CSSProperties } from 'react';

const FARM_LOCATIONS: Record<string, string> = {
  '망령의 영혼석': '페카 심층 1층',
  '야생의 영혼석': '피오드 1층',
  '원념의 영혼석': '페카 심층 2층',
  '공명의 영혼석': '룬다 1층',
  '삼림의 영혼석': '피오드 2층',
  '파동의 영혼석': '룬다 2층',
};

const labelStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', minWidth: 0 };
const badgeStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', flex: 'none', whiteSpace: 'nowrap',
  padding: '1px 5px', borderRadius: '999px', background: '#edf2fa',
  border: '1px solid #d6e2f3', color: '#53709a', fontSize: '9px',
  lineHeight: 1.35, fontWeight: 600,
};

export default function MaterialWithLocation({ name }: { name: string }) {
  const location = FARM_LOCATIONS[name];
  return <span style={labelStyle}>
    <span>{name}</span>
    {location && <span style={badgeStyle}>{location}</span>}
  </span>;
}
