export type Grade = '해연' | '잔영';
export type ArmorKind = '천옷' | '경갑' | '중갑';
export type SlotId =
  | 'weapon' | 'necklace' | 'ring1' | 'ring2' | 'emblem'
  | 'hat' | 'top' | 'bottom' | 'gloves' | 'shoes';

export const JOB_GROUPS = [
  { label: '전사 계열', jobs: ['전사', '대검전사', '검술사', '기사'] },
  { label: '궁수 계열', jobs: ['궁수', '석궁사수', '장궁병'] },
  { label: '마법사 계열', jobs: ['마법사', '화염술사', '빙결술사', '전격술사'] },
  { label: '힐러 계열', jobs: ['힐러', '사제', '수도사', '암흑술사'] },
  { label: '음유시인 계열', jobs: ['음유시인', '댄서', '악사'] },
  { label: '도적 계열', jobs: ['도적', '격투가', '듀얼블레이드'] },
] as const;

export const ARMOR_KINDS: ArmorKind[] = ['천옷', '경갑', '중갑'];

export const MATERIAL_NAMES = [
  '백금강괴',
  '특급 목재',
  '특급 가죽',
  '특급 옷감',
  '특급 실크',
  '허상의 마력석',
  '포식의 마력석',
  '심해의 마력석',
  '야생의 영혼석',
  '삼림의 영혼석',
  '공명의 영혼석',
  '파동의 영혼석',
  '망령의 영혼석',
  '원념의 영혼석',
] as const;

export type MaterialName = typeof MATERIAL_NAMES[number];
export type Recipe = Partial<Record<MaterialName, number>>;

const STONE = {
  허상: '허상의 마력석',
  포식: '포식의 마력석',
  심해: '심해의 마력석',
  야생: '야생의 영혼석',
  삼림: '삼림의 영혼석',
  공명: '공명의 영혼석',
  파동: '파동의 영혼석',
  망령: '망령의 영혼석',
  원념: '원념의 영혼석',
} as const;

type StoneId = keyof typeof STONE;
type Role = '마력석' | 'A' | 'B' | 'C';

function roleOf(id: StoneId): Role {
  if (id === '허상' || id === '포식' || id === '심해') return '마력석';
  if (id === '망령' || id === '원념') return 'A';
  if (id === '야생' || id === '삼림') return 'B';
  return 'C';
}

const QTY: Record<'무기' | '방어구', Record<Grade, Record<Role, number>>> = {
  무기: {
    해연: { 마력석: 15, A: 80, B: 75, C: 90 },
    잔영: { 마력석: 0, A: 9, B: 15, C: 16 },
  },
  방어구: {
    해연: { 마력석: 8, A: 40, B: 35, C: 55 },
    잔영: { 마력석: 0, A: 5, B: 7, C: 12 },
  },
};

const WEAPON_STONES: Record<string, Record<Grade, StoneId[]>> = {};
function addWeaponGroup(jobs: readonly string[], haeyeon: StoneId[], janyeong: StoneId[]) {
  for (const job of jobs) WEAPON_STONES[job] = { 해연: haeyeon, 잔영: janyeong };
}
addWeaponGroup(JOB_GROUPS[0].jobs, ['포식', '망령', '야생', '파동'], ['망령', '야생', '공명']);
addWeaponGroup(JOB_GROUPS[1].jobs, ['포식', '망령', '삼림', '공명'], ['망령', '삼림', '파동']);
addWeaponGroup(JOB_GROUPS[2].jobs, ['심해', '망령', '야생', '파동'], ['망령', '야생', '공명']);
addWeaponGroup(JOB_GROUPS[3].jobs, ['심해', '망령', '삼림', '공명'], ['망령', '삼림', '파동']);
addWeaponGroup(JOB_GROUPS[4].jobs, ['허상', '망령', '야생', '파동'], ['망령', '야생', '공명']);
addWeaponGroup(JOB_GROUPS[5].jobs, ['허상', '망령', '삼림', '파동'], ['망령', '삼림', '파동']);

const ARMOR_STONES: Record<ArmorKind, Record<'hat' | 'top' | 'bottom' | 'gloves' | 'shoes', Record<Grade, StoneId[]>>> = {
  중갑: {
    hat: { 해연: ['허상', '망령', '삼림', '파동'], 잔영: ['망령', '삼림', '파동'] },
    top: { 해연: ['포식', '원념', '삼림', '파동'], 잔영: ['원념', '삼림', '파동'] },
    gloves: { 해연: ['허상', '망령', '야생', '삼림'], 잔영: ['망령', '야생', '삼림'] },
    bottom: { 해연: ['심해', '원념', '삼림', '공명'], 잔영: ['원념', '삼림', '공명'] },
    shoes: { 해연: ['허상', '망령', '야생', '삼림'], 잔영: ['망령', '야생', '삼림'] },
  },
  경갑: {
    hat: { 해연: ['허상', '망령', '삼림', '공명'], 잔영: ['망령', '삼림', '공명'] },
    top: { 해연: ['포식', '원념', '삼림', '파동'], 잔영: ['원념', '삼림', '파동'] },
    gloves: { 해연: ['포식', '망령', '야생', '삼림'], 잔영: ['망령', '야생', '삼림'] },
    bottom: { 해연: ['심해', '원념', '야생', '파동'], 잔영: ['원념', '야생', '파동'] },
    shoes: { 해연: ['포식', '망령', '야생', '삼림'], 잔영: ['망령', '야생', '삼림'] },
  },
  천옷: {
    hat: { 해연: ['허상', '망령', '야생', '공명'], 잔영: ['망령', '야생', '공명'] },
    top: { 해연: ['포식', '원념', '야생', '공명'], 잔영: ['원념', '야생', '공명'] },
    gloves: { 해연: ['심해', '망령', '야생', '삼림'], 잔영: ['망령', '야생', '삼림'] },
    bottom: { 해연: ['심해', '원념', '삼림', '파동'], 잔영: ['원념', '삼림', '파동'] },
    shoes: { 해연: ['심해', '망령', '야생', '삼림'], 잔영: ['망령', '야생', '삼림'] },
  },
};

const WEAPON_EXTRA: Record<string, Recipe> = {
  전사: { 백금강괴: 5, '특급 목재': 5 },
  대검전사: { 백금강괴: 5, '특급 목재': 5 },
  검술사: { 백금강괴: 5, '특급 가죽': 5 },
  기사: { 백금강괴: 5, '특급 목재': 5 },
  궁수: { '특급 목재': 5, '특급 가죽': 5 },
  석궁사수: { 백금강괴: 5, '특급 목재': 5 },
  장궁병: { '특급 목재': 5, '특급 가죽': 5 },
  마법사: { '특급 목재': 5, '특급 가죽': 5 },
  화염술사: { 백금강괴: 5, '특급 목재': 5 },
  빙결술사: { 백금강괴: 5, '특급 목재': 5 },
  전격술사: { 백금강괴: 5, '특급 가죽': 5 },
  힐러: { 백금강괴: 5, '특급 목재': 5 },
  사제: { 백금강괴: 5, '특급 목재': 5 },
  수도사: { 백금강괴: 5, '특급 목재': 5 },
  암흑술사: { 백금강괴: 5, '특급 가죽': 5 },
  음유시인: { 백금강괴: 5, '특급 목재': 5 },
  댄서: { 백금강괴: 5, '특급 목재': 5 },
  악사: { 백금강괴: 5, '특급 목재': 5 },
  도적: { 백금강괴: 5, '특급 가죽': 5 },
  격투가: { 백금강괴: 5, '특급 가죽': 5 },
  듀얼블레이드: { 백금강괴: 5, '특급 가죽': 5 },
};

const ARMOR_EXTRA: Record<ArmorKind, Record<'hat' | 'top' | 'bottom' | 'gloves' | 'shoes', Recipe>> = {
  중갑: {
    hat: { 백금강괴: 4, '특급 가죽': 4 },
    top: { 백금강괴: 5, '특급 옷감': 5 },
    gloves: { 백금강괴: 4, '특급 실크': 4 },
    bottom: { 백금강괴: 5, '특급 옷감': 5 },
    shoes: { 백금강괴: 4, '특급 가죽': 4 },
  },
  경갑: {
    hat: { 백금강괴: 4, '특급 가죽': 4 },
    top: { '특급 가죽': 5, '특급 옷감': 5 },
    gloves: { '특급 가죽': 4, '특급 실크': 4 },
    bottom: { '특급 가죽': 5, '특급 옷감': 5 },
    shoes: { 백금강괴: 4, '특급 가죽': 4 },
  },
  천옷: {
    hat: { '특급 가죽': 4, '특급 옷감': 4 },
    top: { 백금강괴: 5, '특급 옷감': 5 },
    gloves: { '특급 옷감': 4, '특급 실크': 4 },
    bottom: { '특급 가죽': 5, '특급 옷감': 5 },
    shoes: { 백금강괴: 4, '특급 옷감': 4 },
  },
};

const ACCESSORY: Record<'necklace' | 'ring', Record<Grade, Recipe>> = {
  necklace: {
    해연: {
      백금강괴: 4,
      '포식의 마력석': 5,
      '심해의 마력석': 5,
      '삼림의 영혼석': 50,
      '파동의 영혼석': 75,
      '망령의 영혼석': 30,
      '원념의 영혼석': 30,
    },
    잔영: {
      '삼림의 영혼석': 10,
      '파동의 영혼석': 14,
      '망령의 영혼석': 4,
      '원념의 영혼석': 4,
    },
  },
  ring: {
    해연: {
      백금강괴: 4,
      '허상의 마력석': 8,
      '야생의 영혼석': 40,
      '공명의 영혼석': 60,
      '원념의 영혼석': 55,
    },
    잔영: {
      '야생의 영혼석': 8,
      '공명의 영혼석': 12,
      '원념의 영혼석': 6,
    },
  },
};

function stoneRecipe(kind: '무기' | '방어구', grade: Grade, ids: StoneId[]): Recipe {
  const result: Recipe = {};
  for (const id of ids) {
    const qty = QTY[kind][grade][roleOf(id)];
    if (qty > 0) result[STONE[id]] = qty;
  }
  return result;
}

function mergeRecipe(...parts: Recipe[]): Recipe {
  const out: Recipe = {};
  for (const part of parts) {
    for (const [name, qty] of Object.entries(part) as [MaterialName, number][]) {
      out[name] = (out[name] ?? 0) + qty;
    }
  }
  return out;
}

export function getRecipe(
  slot: SlotId,
  grade: Grade,
  job: string,
  armorKind: ArmorKind,
): { materials: Recipe; complete: boolean } | null {
  if (slot === 'emblem') return null;

  if (slot === 'weapon') {
    const ids = WEAPON_STONES[job]?.[grade] ?? WEAPON_STONES['화염술사'][grade];
    const stones = stoneRecipe('무기', grade, ids);
    return {
      materials: grade === '해연' ? mergeRecipe(WEAPON_EXTRA[job] ?? {}, stones) : stones,
      complete: grade === '해연',
    };
  }

  if (slot === 'necklace') {
    return { materials: ACCESSORY.necklace[grade], complete: grade === '해연' };
  }

  if (slot === 'ring1' || slot === 'ring2') {
    return { materials: ACCESSORY.ring[grade], complete: grade === '해연' };
  }

  const armorSlot = slot as 'hat' | 'top' | 'bottom' | 'gloves' | 'shoes';
  const stones = stoneRecipe('방어구', grade, ARMOR_STONES[armorKind][armorSlot][grade]);
  return {
    materials: grade === '해연' ? mergeRecipe(ARMOR_EXTRA[armorKind][armorSlot], stones) : stones,
    complete: grade === '해연',
  };
}

const WEAPON_MARKET_NAME: Record<string, string> = {
  전사: '숏소드',
  대검전사: '그레이트소드',
  검술사: '론 엣지소드',
  기사: '라이트 핼버드',
  궁수: '숏보우',
  석궁사수: '라이트 크로스보우',
  장궁병: '라이트 롱보우',
  마법사: '우드 완드',
  화염술사: '라운드헤드 케인',
  빙결술사: '스노우 오브',
  전격술사: '라운드 코일',
  힐러: '마블 힐링 완드',
  사제: '크리스탈 스태프',
  수도사: '블런트 쿼터스태프',
  암흑술사: '서펜트 의식용 단검',
  음유시인: '켈틱 류트',
  댄서: '꽃잎 접부채',
  악사: '커브드 하프',
  도적: '플랫 대거',
  격투가: '라이트 너클',
  듀얼블레이드: '샤프 듀얼소드',
};

const ARMOR_MARKET_NAME: Record<ArmorKind, string> = {
  천옷: '전투복',
  경갑: '가죽 갑옷',
  중갑: '비늘 갑옷',
};

const ARMOR_PART: Record<'hat' | 'top' | 'bottom' | 'gloves' | 'shoes', string> = {
  hat: '투구',
  top: '상의',
  bottom: '하의',
  gloves: '장갑',
  shoes: '신발',
};

export function getEquipmentName(
  slot: SlotId,
  grade: Grade,
  job: string,
  armorKind: ArmorKind,
) {
  const prefix = grade + '의 ';

  if (slot === 'weapon') return prefix + (WEAPON_MARKET_NAME[job] ?? WEAPON_MARKET_NAME['화염술사']);
  if (slot === 'necklace') return prefix + '페리도트 네크리스';
  if (slot === 'ring1' || slot === 'ring2') return prefix + '페리도트 링';
  if (slot === 'emblem') return '';

  return prefix + ARMOR_MARKET_NAME[armorKind] + ' ' + ARMOR_PART[slot];
}
