export type RuneSlot='무기'|'방어구'|'엠블럼';
export type RuneBonusKey='damageIncrease'|'skillDamage'|'strikeDamage'|'multiDamage'|'critDamage'|'critChance'|'extraChance';
export type RuneRecord={slot:RuneSlot;name:string;tiers:(number|null)[];bonus:RuneBonusKey;note?:string;rarity?:string;description?:string};
// Source: 마비노기 모바일 종합 시트 V2.3, 시즌2.
// Null denotes a source value shown as '?' — never interpolate that tier.
export const RUNE_CATALOG:RuneRecord[]=[
{slot:'무기',name:'오랜 광기',tiers:[20,22,null],bonus:'damageIncrease'},
{slot:'무기',name:'광채+',tiers:[20,22,null],bonus:'damageIncrease',note:'지속 피해 조건의 치명타 피해 증가는 제외'},
{slot:'무기',name:'거대한 분노',tiers:[21,23,null],bonus:'damageIncrease',note:'강타 중첩 스킬 피해 증가 제외'},
{slot:'무기',name:'암운+',tiers:[15,17,null],bonus:'strikeDamage',note:'조건부 스킬 피해 증가 제외'},
{slot:'무기',name:'추적자',tiers:[35,37,null],bonus:'strikeDamage',note:'조건부 강타 피해 감소 제외'},
{slot:'방어구',name:'계승자',tiers:[13,15,17],bonus:'damageIncrease',note:'스킬 사용 시 중첩 피해 효과 제외'},
{slot:'방어구',name:'잠든 땅',tiers:[13,14,15],bonus:'multiDamage',note:'동일 수치의 강타 피해도 자동 합산'},
{slot:'방어구',name:'열의+',tiers:[7,9,11],bonus:'damageIncrease'},
{slot:'방어구',name:'빛살+',tiers:[5.5,7.5,9.5],bonus:'damageIncrease'},
{slot:'방어구',name:'등대지기',tiers:[24,26,27],bonus:'damageIncrease',note:'조건부 방어구 파괴 효과 제외'},
{slot:'방어구',name:'녹슨 방패',tiers:[22,24,26],bonus:'damageIncrease'},
{slot:'방어구',name:'정복자+',tiers:[9,9,9],bonus:'damageIncrease',note:'조건부 공격력 상승은 제외'},
{slot:'엠블럼',name:'침묵',tiers:[33,35,null],bonus:'damageIncrease'},
{slot:'엠블럼',name:'해방',tiers:[25,27,29],bonus:'multiDamage',note:'밤의 축복 추가 40% 제외'},
{slot:'엠블럼',name:'위대함',tiers:[25,27,29],bonus:'strikeDamage',note:'밤의 축복 추가 40% 제외'},
{slot:'엠블럼',name:'태초',tiers:[20,22,null],bonus:'skillDamage'},
{slot:'엠블럼',name:'빛바랜 별',tiers:[31,33,null],bonus:'damageIncrease',note:'무방비 피해 증가 별도 미적용'}
,
{slot:"무기",name:"불꽃으로 새긴 문장",rarity:"신화",tiers:[null,null,null],bonus:"damageIncrease",description:"전투 시작 시, 3분 동안 불의 인장을 활성화해 적에게 주는 피해가 20%, 재사용 대기 시간 회복 속도가 15% 증가한다. 밤의 흔적이 45레벨 이상일 경우, 불의 인장이 사라지는 대신 강화되어 공격 적중 시 전방의 적들에게 (공격력×16%)의 피해를 주는 불길을 내뿜는다. (재사용 대기 시간: 3초)"},
{slot:"무기",name:"죽음",rarity:"신화",tiers:[20,20,20],bonus:"critDamage",description:"공격력이 20%, 치명타 피해가 20% 증가한다. 행동 불능을 방지하는 룬의 효과를 받을 수 없게 된다. 행동 불능 상태가 될 경우, 30초 동안 공격력이 10% 감소한다."},
{slot:"무기",name:"계시",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"공격력이 24/26/?% 증가하고, 캐스팅 및 차지 속도가 25% 증가한다."},
{slot:"무기",name:"눈부신 잔영",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"스킬 사용 시, 다음 기본 공격 적중 시 타겟 주변 3m 범위 내의 적들에게 (공격력×147/?/?%)의 피해를 추가로 입히고, 다음 1회의 공격 속도가 10% 증가한다."},
{slot:"무기",name:"타오르는 영광",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"공격력이 23.5/25.5/?% 증가한다. 전투 시, 5초마다 불씨를 얻는다. 이 효과는 최대 12회까지 중첩된다. 궁극기 사용 시, 모든 불씨를 소모하여 15초 동안 공격력이 소모한 중첩 당 3.5% 증가한다. 최대 추가 42%"},
{slot:"무기",name:"햇살+",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"공격력이 16/18/?% 증가하고, 재사용 대기 시간 회복 속도가 15% 증가한다."},
{slot:"무기",name:"억눌린 충동",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"저주 공격력이 30/32/?% 증가하며, 치명타 피해가 5% 증가한다. 이동 속도가 15% 감소한다."},
{slot:"무기",name:"부패+",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"공격력이 15/17/?% 증가한다. 전투 중 6초마다 1개씩, 최대 2개까지 충전되는 맹독의 정수를 얻는다. 공격 적중 시, 맹독의 정수를 1개 소모하여 타겟 주변 4m 범위 내의 적들에게 (공격력×77%)의 피해와 (공격력×116%)의 지속 피해: 중독을 준다. (재사용 대기 시간: 0.5초) 연타트리거"},
{slot:"무기",name:"창백한 기수",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"궁극기 스킬로 주는 피해가 20% 증가하고, 궁극기 게이지 회복량이 20% 감소한다. 공격력이 17/18/?%, 적에게 주는 피해가 17/18/?% 증가한다."},
{slot:"무기",name:"대군주+",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"궁극기 스킬로 주는 피해가 20% 증가한다. 궁극기 게이지 회복량이 20% 증가한다. 공격력이 16/18/?% 증가한다."},
{slot:"무기",name:"두 갈래 뿔",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"공격력이 16/18/?% 증가한다. 기본 공격 사용 시, 스킬 사용 속도가 5초 동안 15% 증가한다. 스킬 사용 시, 공격 속도가 5초 동안 15% 증가한다."},
{slot:"무기",name:"바위 칼날",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"공격이 적중할 때마다 10초 동안 공격력이 0.7/0.77/?%, 치명타 확률이 0.5% 증가한다. 해당 효과는 최대 30회까지 중첩되며 지속 시간은 스택마다 개별로 가진다."},
{slot:"방어구",name:"유폐된 어둠",rarity:"신화",tiers:[10,10,10],bonus:"damageIncrease",description:"적에게 주는 피해가 10% 증가한다. 3초마다 타겟 주변 적 최대 3명에게 어둠의 화살을 발사하여 (공격력×21%)의 피해를 주고 약화 효과: 방어구 파괴를 부여해 10초 동안 받는 피해를 10% 증가시킨다. 밤의 축복 스킬이 활성화된 동안 발사 횟수가 2배로 증가한다. 방어구 파괴는 중복 적용되지 않는다. #방어구파괴 #밤의 축복"},
{slot:"방어구",name:"여신",rarity:"신화",tiers:[29,29,29],bonus:"damageIncrease",description:"적에게 주는 피해가 29.0% 증가한다. 적색,청색,녹색,무색,황금색 팔라딘 아티팩트를 모두 1개 이상 장착했을 경우, 받는 피해가 10% 감소한다. 행동 불능에 이르는 공격을 1회 막아주고 체력을 대량 회복한다. 이 후 3초 동안 받는 피해가 80% 감소한다. 동일한 행동 불능에 저항하는 효과와 재사용 대기 시간을 공유한다. (재사용 대기 시간: 180초) #행동불능방지"},
{slot:"방어구",name:"가라앉은 왕국",rarity:"신화",tiers:[null,null,null],bonus:"damageIncrease",description:"공격력이 15%, 궁극기 스킬로 주는 피해가 10% 증가한다. 궁극기 사용 시, 30초 동안 재사용 대기 시간 회복 속도가 8% 증가하며, 10초 동안 속박 상태가 된다."},
{slot:"방어구",name:"무형",rarity:"신화",tiers:[null,null,null],bonus:"damageIncrease",description:"저주 룬 착용 시, 적에게 주는 피해와 받는 피해가 30% 증가하고 이동 속도 감소 효과가 사라진다. 침식 룬 착용 시, 5초마다 타겟 방향의 적들에게 (공격력×157%)의 피해를 준다. 용의 문장 룬 착용 시, 스킬 피해가 27% 증가한다. 순서대로 하나의 효과만 적용되며, 활성화되지 않은 경우 공격력이 30% 증가한다. #저주 #침식 #용의 문장"},
{slot:"방어구",name:"사슬로 묶은 법전",rarity:"신화",tiers:[null,null,null],bonus:"damageIncrease",description:"도발 시, 적에게 주는 피해가 26%, 무방비 피해가 16% 증가한다. 아군 치유 시, 공격력이 25%, 재사용 대기 시간 회복 속도가 4% 증가한다. 하나의 효과만 적용되며, 활성화되지 않은 경우 적에게 주는 피해가 29.0% 증가한다."},
{slot:"방어구",name:"용 사냥꾼",rarity:"신화",tiers:[10,10,10],bonus:"critDamage",description:"치명타 확률이 10%, 치명타 피해가 10% 증가한다. 퀵슬롯의 회복 물약 개수가 2개 증가하며, 붕대 개수가 2개 증가한다. 퀵슬롯 아이템 사용 시, 마력탄을 발사해 타겟 방향의 적들에게 (공격력×29%)의 피해를 주고 60초 동안 적에게 주는 피해가 5% 증가한다. (재사용 대기 시간: 3초)"},
{slot:"방어구",name:"첫 번째 서약",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"각성 공격력이 15/17/19% 증가한다. 밤의 축복 스킬 활성화 시, 강타 피해와 치명타 확률, 공격력이 11% 증가한다. #밤의 축복"},
{slot:"방어구",name:"공세+",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"공세 스킬 사용 시, 6초 동안 적에게 주는 피해가 5.5/6/6.4% 증가한다. 해당 효과는 최대 5회까지 중첩되며 지속 시간은 스택마다 개별로 가진다."},
{slot:"방어구",name:"긍지",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"전투 숙련: 지원 보유 시 공격력이 25/27/?%, 회복량이 10% 증가한다. 공격 시, 약화 효과: 방어구 파괴를 부여해 10초 동안 받는 피해를 10% 증가시킨다. 방어구 파괴는 중복 적용되지 않는다. (재사용 대기 시간: 1초) #방어구파괴 지원"},
{slot:"방어구",name:"그믐달",rarity:"전설",tiers:[15,17,19],bonus:"damageIncrease",description:"적에게 주는 피해가 15/17/19% 증가한다. 보유한 자원이 50% 미만일 경우, 공격력이 10% 증가한다."},
{slot:"방어구",name:"기사단장",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"적에게 주는 피해가 5/7/9%, 공격 속도 및 스킬 사용 속도가 6% 증가한다. 주위에서 적이 5/10/20명 처치될 경우, 공격 속도 및 스킬 사용 속도가 3%/6%/12% 증가한다."},
{slot:"방어구",name:"맹세+",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"공격력이 10/12/?% 증가한다. 체력이 50% 이하일 경우 받는 피해가 10% 감소하며, 2초마다 맹세 효과를 얻어 12초 동안 적에게 주는 피해가 3% 증가한다. 이 효과는 최대 5회까지 중첩된다."},
{slot:"방어구",name:"서광",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"공격력이 20/22/24% 증가한다. 브레이크 익스텐드 스킬 사용 시, 10초 동안 적에게 주는 피해가 20% 증가한다. 탱커"},
{slot:"방어구",name:"수호자",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"궁극기 게이지 획득량이 20% 감소한다. 공격력이 24/26/28% 증가한다. 궁극기 스킬로 주는 피해가 20% 증가한다."},
{slot:"방어구",name:"승전",rarity:"전설",tiers:[5,7,9],bonus:"damageIncrease",description:"적에게 주는 피해가 5/7/9%, 치명타 피해가 10% 증가한다. 주위에서 적이 5/10/20명 처치될 경우, 치명타 피해가 3%/6%/12% 증가한다."},
{slot:"방어구",name:"위엄",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"전투 숙련: 수호 보유 시 공격력이 16/18/20%, 무방비 피해가 32% 증가하며 적에게 받는 피해가 5% 감소한다. 탱커"},
{slot:"방어구",name:"은빛 찬가",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"공격력이 5/7/9%, 재사용 대기 시간 회복 속도가 6% 증가한다. 주위에서 적이 5/10/20명 처치될 경우, 재사용 대기시간 회복속도가 3%/6%/12% 증가한다."},
{slot:"방어구",name:"작열",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"거신의 파편 거신의 파편 공격 속도가 18/21/24%, 기본 공격으로 주는 피해와 기본 공격 추가타 확률이 18/21/24% 증가한다. 재사용 대기 시간 회복 속도가 5% 감소한다. 기본 공격 시, 장착한 빛 계열 룬의 수에 따라 10초동안 치명타 확률이 3%/7%/12%/18% 증가한다. #카브락"},
{slot:"방어구",name:"오팔 성배",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"거신의 파편 거신의 파편 공격력이 17.5% 증가한다. 빛, 어둠, 용 계열 룬을 각각 2개 이상 장착한 경우, 빠른 스킬 500마다 치명타 피해가 1.5% 증가한다. (최대 6%) 추가로, 스킬 사용 시 8초 동안 치명타 피해가 1% 증가한다. 해당 효과는 최대 5회까지 중첩된다. #카브락"},
{slot:"방어구",name:"교차하는 사슬",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"각성 공격력이 15/17/19% 증가한다. 밤의 축복 스킬 활성화 시, 연타 피해와 추가타 확률, 공격력이 11% 증가한다. #밤의 축복"},
{slot:"방어구",name:"무덤지기+",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"무덤지기 공격력이 16% 증가한다. 자신과 전투 중인 적이 처치되었을 경우, 자신의 체력을 (최대HP×14.1%)만큼 회복한다."},
{slot:"방어구",name:"복수+",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"복수 피해를 입을 경우 12초 동안 공격력이 5/5.4/?%, 받는 회복량이 2% 증가한다. 이 효과는 최대 5회까지 중첩된다."},
{slot:"방어구",name:"끓는 피",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"저주 스킬 사용 시, 최대 체력의 4% 만큼 피해를 입고 5초 동안 스킬 피해가 24/26/27% 증가한다. 이 효과는 남은 체력이 30% 이상일 때만 발동한다."},
{slot:"방어구",name:"날 선 적의",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"저주 공격력이 6/8/10%, 치명타 확률, 추가타 확률, 적에게 주는 피해가 6% 증가한다. 이동 속도가 15% 감소한다."},
{slot:"방어구",name:"금 간 봉인",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"전투 시, 1초마다 침식 수치가 5 증가한다. 침식이 부여된 동안 치명타 확률이 16.5/17.8/19.1% 증가한다. 침식 수치가 100 이상일 경우, 효과가 두 배로 증가한다. 침식 수치가 300에 도달하면 오염되며, 15초 동안 모든 효과를 잃는다. 침식과 오염은 전투 중에만 진행된다. #침식 #오염 시즌2 등급 이름 태그 유일 유일 옵션 비고1 비고2"},
{slot:"방어구",name:"무너진 경계",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"전투 시, 1초마다 침식 수치가 5 증가한다. 침식이 부여된 동안 추가타 확률이 16.5/17.8/19.1% 증가한다. 침식 수치가 100 이상일 경우, 효과가 두 배로 증가한다. 침식 수치가 300에 도달하면 오염되며, 15초 동안 모든 효과를 잃는다. 침식과 오염은 전투 중에만 진행된다. #침식 #오염"},
{slot:"방어구",name:"잿빛 장막",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"전투 시, 1초마다 침식 수치가 5 증가한다. 침식이 부여된 동안 연타 피해가 18/19.5/21% 증가한다. 침식 수치가 100 이상일 경우, 효과가 두 배로 증가한다. 침식 수치가 300에 도달하면 오염되며, 15초 동안 모든 효과를 잃는다. 침식과 오염은 전투 중에만 진행된다. #침식 #오염"},
{slot:"방어구",name:"흐릿한 형상",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"전투 시, 1초마다 침식 수치가 5 증가한다. 침식이 부여된 동안 강타 피해가 18/19.5/21% 증가한다. 침식 수치가 100 이상일 경우, 효과가 두 배로 증가한다. 침식 수치가 300에 도달하면 오염되며, 15초 동안 모든 효과를 잃는다. 침식과 오염은 전투 중에만 진행된다. #침식 #오염"},
{slot:"방어구",name:"거두는 손길",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"전투 시작 시, 15초 동안 적에게 주는 피해가 26/28/30% 증가한다. 자신과 전투 중인 적이 처치되었을 경우 재발동한다."},
{slot:"방어구",name:"공허",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"스킬 8회 사용 시, 모든 스킬의 재사용 대기 시간이 3초 감소한다. 공격력이 5/7/9% 증가한다."},
{slot:"방어구",name:"무한한 탐욕",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"스킬 자원을 소모하는 스킬로 주는 피해가 38/40/42% 증가한다. 재사용 대기 시간 회복 속도가 10% 감소한다."},
{slot:"방어구",name:"부서진 왕관",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"전투 중, 5초마다 자신 주위 5m 범위 내에 15초 동안 지속되는 마력의 원을 생성한다. 마력의 원에 올라설 경우, 15초 동안 공격력이 4/4.4/4.8%, 강타 피해가 4.5/4.7/5% 증가한다. 최대 3회까지 중첩된다."},
{slot:"방어구",name:"뼈 인장",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"액티브 3번 슬롯 스킬로 주는 피해가 53/58/63% 증가한다."},
{slot:"방어구",name:"아귀",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"매 5초마다, 다음 공격 시 (공격력×21%)의 피해와 (공격력×53%)의 지속 피해: 상처를 추가로 준다. 공격력이 15/17/19%, 무방비 피해가 12% 증가한다. 연타트리거"},
{slot:"방어구",name:"악몽",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"전투 중 4초마다 1개씩, 최대 3개까지 충전되는 불의 정수를 얻는다. 스킬 사용 시, 불의 정수를 1개 소모하여 타겟의 위치에 화염 지대를 소환한다. 화염 지대는 3초 동안 주변 2m 범위 내의 적들에게 0.5초마다 (공격력×14/16/17%)의 화염 피해를 준다. (재사용 대기 시간 0.5초) 전투 시작 시, 3중첩을 즉시 획득한다."},
{slot:"방어구",name:"삼키는 모래",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"거신의 파편 거신의 파편 침식 효과를 부여하는 룬 장착 시 활성화된다. 연타 피해가 10% 증가하며, 연타 강화 500마다 적에게 주는 피해가 2% 증가한다. (최대 8%) 침식 수치가 100미만이거나 오염 상태일 때, 연타 피해가 추가로 17% 증가한다. #카브락 #침식"},
{slot:"방어구",name:"신기루",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"거신의 파편 거신의 파편 강타 강화 500마다 적에게 주는 피해가 2.5% 증가한다. (최대 10%) 전투 중 5초마다 신기루 효과를 얻어, 적에게 주는 피해가 1%, 강타 피해가 1% 증가한다. 해당 효과는 최대 10회까지 중첩되며 전투 시작 시 즉시 5중첩을 얻는다. 적에게 피해를 입을 경우 중첩이 1감소한다. #카브락"},
{slot:"방어구",name:"잊힌 맹약",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"각성 공격력이 15/17/19% 증가한다. 밤의 축복 스킬 활성화 시, 스킬 사용 속도와 캐스팅 및 차지 속도, 재사용 대기 시간 회복 속도가 13% 증가한다. #밤의 축복"},
{slot:"방어구",name:"바다뱀+",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"바다뱀 공격력이 5%, 스킬 사용 속도가 5% 증가한다. 채널링 스킬로 주는 피해가 31/34/37% 증가한다."},
{slot:"방어구",name:"돌 심장",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"용의 문장 적에게 주는 피해가 10/12/14% 증가한다. 용의 문장이 활성화된 동안 재사용 대기 시간 회복 속도가 20%, 연타 피해가 18% 증가한다."},
{slot:"방어구",name:"번개 숨결",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"용의 문장 적에게 주는 피해가 10/12/14% 증가한다. 용의 문장이 활성화된 동안 스킬 사용 속도와 캐스팅 및 차지 속도가 17%, 강타 피해가 18% 증가한다."},
{slot:"방어구",name:"별바라기",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"용의 문장 적에게 주는 피해가 10/12/14% 증가한다. 공격 시, 10초 동안 용의 문장을 활성화한다. (재사용 대기 시간: 20초) 용의 문장이 활성화된 동안 공격력이 14.0% 증가한다. 활성화"},
{slot:"방어구",name:"용암 비늘",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"용의 문장 적에게 주는 피해가 10/12/14% 증가한다. 공격 시, 10초 동안 용의 문장을 활성화한다. (재사용 대기 시간: 20초) 용의 문장이 활성화된 동안 1초마다 가장 가까운 적에게 (공격력×10%)의 피해를 준다. 활성화"},
{slot:"방어구",name:"황동 날개",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"용의 문장 적에게 주는 피해가 10/12/14% 증가한다. 궁극기 사용 시, 10초 동안 용의 문장을 활성화한다. (재사용 대기 시간: 20초) 용의 문장이 활성화된 동안 적에게 주는 피해가 14.0% 증가한다. 활성화"},
{slot:"방어구",name:"얼음 발톱",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"용의 문장 적에게 주는 피해가 10/12/14% 증가한다. 용의 문장의 지속 시간이 10초만큼 증가한다. 용의 문장이 활성화된 동안 추가타 확률이 12.5% 증가한다. 연장"},
{slot:"방어구",name:"잠들지 않는 불",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"용의 문장 적에게 주는 피해가 10/12/14% 증가한다. 용의 문장의 지속 시간이 10초만큼 증가한다. 용의 문장이 활성화된 동안 치명타 확률이 12.5% 증가한다. 연장"},
{slot:"방어구",name:"폭염+",rarity:"전설",tiers:[5,7,9],bonus:"damageIncrease",description:"폭염 적에게 주는 피해가 5/7/9% 증가한다. 전투 시, 2초마다 자신 주변 4m 범위 내의 모든 적에게 (공격력×45%)의 피해와 (공격력×21%)의 지속 피해: 화상을 준다. 연타트리거"},
{slot:"방어구",name:"봉인술사",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"캐스팅 및 차지 속도가 15% 증가한다. 캐스팅 및 차지 스킬로 주는 피해가 25/28/31% 증가한다."},
{slot:"방어구",name:"비늘 덮인 현자",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"아군 치유 시, 15초 동안 자신의 공격력이 20/22/?% 증가한다. 추가로, 회복된 아군 근처에 10초 동안 지속되는 회복 구슬을 생성한다. (재사용 대기시간: 5초) 회복 구슬을 획득한 대상의 최대 체력을 2% 회복시키고, 15초 동안 공격력을 5%만큼 증가시킨다. 지원"},
{slot:"방어구",name:"숲 길잡이",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"이동 속도가 10% 증가한다. 공격 10회 적중 혹은 5m를 이동할 경우, 10초 동안 이동 속도를 추가로 5%, 적에게 주는 피해를 21/23/25% 증가시킨다."},
{slot:"방어구",name:"칼바람",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"브레이크 스킬로 주는 피해가 29.0/33.0/?% 증가한다. 브레이크 스킬 사용 시, 7초 동안 치명타 피해가 10% 증가한다."},
{slot:"방어구",name:"황혼 숨결",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"거신의 파편 거신의 파편 용 계열 룬 2개 이상 장착 시 활성화된다. 공격력이 10%, 스킬 사용 속도가 10% 증가한다. 스킬 위력 500마다 공격력이 1% 추가 증가한다. (최대 4%) 공격 적중 시, 타겟 주변의 적 5명에게 바위 쐐기를 발사해 (공격력×32%)의 피해와 (공격력×36%)의 지속 피해: 신성, 절망을 준다. (재사용 대기시간: 10초) #카브락 연타트리거"},
{slot:"방어구",name:"두 영웅",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"거신의 파편 거신의 파편 동일한 무기를 양손에 장착한 클래스일 경우 활성화된다. 적에게 주는 피해가 22% 증가한다. 공격 적중 시 타겟 주변의 적들을 끌어당기며 (공격력×1%) ~ (공격력×13%)의 피해를 2회 준다. 피해량은 마도 저항에 비례하여 증가하며, 마도저항이 3000이상일 때 최대 피해를 준다. (재사용 대기시간: 4초) (듀얼블레이드, 댄서, 격투가 클래스 전용) #카브락 듀블, 댄서, 격가"},
{slot:"방어구",name:"쐐기돌",rarity:"전설",tiers:[9,9,9],bonus:"damageIncrease",description:"거신의 파편 거신의 파편 적에게 주는 피해가 9% 증가한다. 서로 다른 계열의 룬을 장착했을 때, 1종마다 공격력이 5% 증가한다. (최대 15%) 빛, 어둠, 용 계열의 룬을 모두 장착한 경우, 치명타 500마다 공격력이 1% 추가 증가한다. (최대 4%) #카브락"},
{slot:"방어구",name:"기본기+",rarity:"전설",tiers:[20,22,24],bonus:"damageIncrease",description:"적에게 주는 피해가 20/22/24% 증가한다"},
{slot:"엠블럼",name:"고결함",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"스킬 사용 속도가 15%, 재사용 대기 시간 회복 속도가 10% 증가한다. 밤의 축복 스킬 활성화 시, 15초 동안 적에게 주는 피해가 48/56/64% 증가한다. #밤의 축복"},
{slot:"엠블럼",name:"백금 천칭",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"스킬 사용 시, 기본 공격의 추가타 확률이 10초 동안 21% 증가한다. 기본 공격 사용 시, 적에게 주는 피해가 10초 동안 21/22.5/?% 증가한다. 두 효과가 모두 활성화될 경우, 증가량이 1.5배가 된다."},
{slot:"엠블럼",name:"초월",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"추가타를 5회 적중시킬 경우, 다음 공격 적중 시 (공격력×41%)의 피해를 주고, 적에게 주는 피해가 10초 동안 15% 증가한다. 치명타를 5회 적중시킬 경우, 다음 공격 적중 시 (공격력×41%)의 피해를 주고, 치명타 피해가 10초 동안 15/17/?% 증가한다. ( 재사용 대기 시간: 각 4초 )"},
{slot:"엠블럼",name:"영원한 밤",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"공격력이 7.0/9.0/?%, 강타 피해, 연타 피해, 치명타 확률, 추가타 확률이 7.0% 증가한다. 오염의 지속 시간이 33% 감소한다. #오염"},
{slot:"엠블럼",name:"원정대",rarity:"전설",tiers:[null,null,null],bonus:"damageIncrease",description:"공격력이 34/34/34% 증가한다."},
];

export type PeakBonus={key:RuneBonusKey;tiers:[number|null,number|null,number|null];multiplier?:number};
export const RUNE_PEAK_EFFECTS:Record<string,{label:string;bonuses:PeakBonus[];caveat:string}>={
 '삼키는 모래':{label:'침식 룬 장착 · 연타 강화 충분',bonuses:[{key:'multiDamage',tiers:[27,27,27]},{key:'damageIncrease',tiers:[8,8,8]}],caveat:'연타 강화 2,000 이상, 침식 100 미만 또는 오염 구간의 연타 피해를 가정'},
 '신기루':{label:'피격 없이 10중첩',bonuses:[{key:'damageIncrease',tiers:[20,20,20]},{key:'strikeDamage',tiers:[10,10,10]}],caveat:'강타 강화 2,000 이상, 버프 10중첩 유지 가정'},
 '부서진 왕관':{label:'마력의 원 3중첩',bonuses:[{key:'strikeDamage',tiers:[13.5,14.1,15]}],caveat:'마력의 원에 머물며 3중첩, 공격력 증가 효과는 제외'},
 '서광':{label:'브레이크 익스텐드 이후',bonuses:[{key:'damageIncrease',tiers:[20,20,20]}],caveat:'10초 효과 상시 유지 가정'},
 '무한한 탐욕':{label:'자원 소모 스킬 위주',bonuses:[{key:'skillDamage',tiers:[38,40,42]}],caveat:'대미지 전부가 자원 소모 스킬이라는 과대 상한 가정'},
 '바다뱀+':{label:'채널링 스킬 위주',bonuses:[{key:'skillDamage',tiers:[31,34,37]}],caveat:'채널링 스킬 피해 보너스를 전체 스킬 피해에 근사 적용한 상한'},
 '봉인술사':{label:'캐스팅·차지 스킬 위주',bonuses:[{key:'skillDamage',tiers:[25,28,31]}],caveat:'캐스팅·차지 스킬 전용 피해 보너스를 전체 스킬 피해에 근사 적용한 상한'},
 '무너진 경계':{label:'침식 100 이상',bonuses:[{key:'extraChance',tiers:[16.5,17.8,19.1],multiplier:2}],caveat:'오염 15초간 효과 소멸 구간 제외'},
 '금 간 봉인':{label:'침식 100 이상',bonuses:[{key:'critChance',tiers:[16.5,17.8,19.1],multiplier:2}],caveat:'오염 15초간 효과 소멸 구간 제외'},
 '잿빛 장막':{label:'침식 100 이상',bonuses:[{key:'multiDamage',tiers:[18,19.5,21],multiplier:2}],caveat:'오염 구간 제외'},
 '흐릿한 형상':{label:'침식 100 이상',bonuses:[{key:'strikeDamage',tiers:[18,19.5,21],multiplier:2}],caveat:'오염 구간 제외'},
 '끓는 피':{label:'저주 스킬 사용 후',bonuses:[{key:'skillDamage',tiers:[24,26,27]}],caveat:'체력 30% 이상 및 5초 지속을 상시로 가정'},
 '첫 번째 서약':{label:'밤의 축복',bonuses:[{key:'strikeDamage',tiers:[11,11,11]},{key:'critChance',tiers:[11,11,11]}],caveat:'조건부 공격력 +11%는 스탯 중복 방지를 위해 제외'},
 '교차하는 사슬':{label:'밤의 축복',bonuses:[{key:'multiDamage',tiers:[11,11,11]},{key:'extraChance',tiers:[11,11,11]}],caveat:'조건부 공격력 +11% 제외'},
 '고결함':{label:'밤의 축복',bonuses:[{key:'damageIncrease',tiers:[48,56,64]}],caveat:'15초 지속시간과 재사용 대기 가동률 무시'},
 '거두는 손길':{label:'전투 시작',bonuses:[{key:'damageIncrease',tiers:[26,28,30]}],caveat:'첫 15초간 효과를 전투 내내 유지한다고 가정'},
 '공세+':{label:'5중첩',bonuses:[{key:'damageIncrease',tiers:[5.5,6,6.4],multiplier:5}],caveat:'공세 스킬로 각 중첩을 계속 유지한다고 가정'},
 '맹세+':{label:'5중첩',bonuses:[{key:'damageIncrease',tiers:[3,3,3],multiplier:5}],caveat:'남은 체력과 중첩 유지 조건, 공격력 옵션은 제외'},
 '숲 길잡이':{label:'공격 또는 이동 조건',bonuses:[{key:'damageIncrease',tiers:[21,23,25]}],caveat:'10초 효과를 상시로 가정'},
 '돌 심장':{label:'용의 문장 활성화',bonuses:[{key:'multiDamage',tiers:[18,18,18]}],caveat:'용의 문장 유지율 미반영'},
 '번개 숨결':{label:'용의 문장 활성화',bonuses:[{key:'strikeDamage',tiers:[18,18,18]}],caveat:'용의 문장 유지율 미반영'},
 '얼음 발톱':{label:'용의 문장 활성화',bonuses:[{key:'extraChance',tiers:[12.5,12.5,12.5]}],caveat:'용의 문장 유지율 미반영'},
 '잠들지 않는 불':{label:'용의 문장 활성화',bonuses:[{key:'critChance',tiers:[12.5,12.5,12.5]}],caveat:'용의 문장 유지율 미반영'},
 '황동 날개':{label:'용의 문장 활성화',bonuses:[{key:'damageIncrease',tiers:[14,14,14]}],caveat:'용의 문장 유지율 미반영'},
 '백금 천칭':{label:'두 효과 동시 활성',bonuses:[{key:'damageIncrease',tiers:[21,22.5,null],multiplier:1.5}],caveat:'2초월 수치 미확인, 기본 공격 전용 효과 가동률 무시'},
 '초월':{label:'추가타 5회 적중',bonuses:[{key:'damageIncrease',tiers:[15,15,15]},{key:'critDamage',tiers:[15,17,null]}],caveat:'치명타 피해 2초월 수치 미확인, 10초 효과 상시 가정'},
 '용 사냥꾼':{label:'퀵슬롯 발동',bonuses:[{key:'damageIncrease',tiers:[5,5,5]}],caveat:'발동 후 60초 지속 가정; 기본 치명타 확률·피해 효과는 별도 상시 적용'},
 '무형':{label:'저주 룬 장착',bonuses:[{key:'damageIncrease',tiers:[30,30,30]}],caveat:'저주 룬 조건 충족 가정, 다른 계열 발동 효과 미반영'},
 '사슬로 묶은 법전':{label:'비활성 상태',bonuses:[{key:'damageIncrease',tiers:[29,29,29]}],caveat:'도발·치유 발동 없는 상태를 가정'},
};
export function peakBonusSummary(item:EquippedRune){
 const profile=RUNE_PEAK_EFFECTS[item.name];if(!profile)return null;
 const parts=profile.bonuses.flatMap(b=>b.tiers[item.tier]==null?[]:[{key:b.key,value:(b.tiers[item.tier] as number)*(b.multiplier||1)}]);
 return {profile,parts,complete:parts.length===profile.bonuses.length};
}

export type EquippedRune={slot:RuneSlot;name:string;tier:number;maxEffect?:boolean};
export function getRuneBonuses(selected:EquippedRune[]):Partial<Record<RuneBonusKey,number>>{
 const totals:Partial<Record<RuneBonusKey,number>>={};
 const add=(key:RuneBonusKey,value:number)=>{totals[key]=(totals[key]||0)+value;};
 for(const item of selected){
  const rune=RUNE_CATALOG.find(r=>r.slot===item.slot&&r.name===item.name);
  if(!rune)continue;
  // Always use source-verified, unconditional off-sheet bonuses only.
  // Peak effects are additive to the baseline ONLY if explicitly opted in.
  const value=rune.tiers[item.tier];
  if(value!=null)add(rune.bonus,value);
  if(rune.name==='잠든 땅'&&value!=null)add('strikeDamage',value);
  if(rune.name==='승전')add('critDamage',10);
  if(rune.name==='용 사냥꾼')add('critChance',10);
  if(rune.name==='날 선 적의'){add('damageIncrease',6);add('critChance',6);add('extraChance',6);}
  if(rune.name==='영원한 밤'){add('strikeDamage',7);add('multiDamage',7);add('critChance',7);add('extraChance',7);}
  if(['돌 심장','번개 숨결','별바라기','용암 비늘','황동 날개','얼음 발톱','잠들지 않는 불'].includes(rune.name)){
   add('damageIncrease',[10,12,14][item.tier]);
  }
  if(rune.name==='기사단장')add('damageIncrease',[5,7,9][item.tier]);
  if(rune.name==='창백한 기수'&&item.tier<2)add('damageIncrease',[17,18][item.tier]);

  // Avoid adding same rune's peak and default damageIncrease twice.
  if(item.maxEffect){
   const peak=peakBonusSummary(item);
   if(peak)for(const {key,value:extra} of peak.parts)add(key,extra);
  }
 }
 return totals;
}
