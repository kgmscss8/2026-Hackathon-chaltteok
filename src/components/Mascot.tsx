/**
 * 찰떡이: 말랑한 찹쌀떡 몸에 팥 세 알, 외지부처럼 갓을 쓰고 붓을 든 대필 도우미.
 * 판단하지 않고, 들은 말만 정성껏 받아 적는다.
 *   hello     안녕하세요        첫 화면·동의 화면
 *   listening 듣고 있어요        녹음 중
 *   writing   정리하고 있어요    STT·요약 생성 대기
 *   done      정리했어요         요약 카드 완성
 *   puzzled   다시 말씀해 주시겠어요? 인식 실패·오류
 */
export type MascotMood = 'hello' | 'listening' | 'writing' | 'done' | 'puzzled';

const INK = '#3a2a22';
const OUTLINE = '#7a4e2d';
const MOCHI = '#fffdf6';
const SHADE = '#f1e8d6';
const BEAN = '#8b5a2b';
const CHEEK = '#f6b5ad';
const GOLD = '#e8b04a';

function Eyes({ mood }: { mood: MascotMood }) {
  const stroke = { stroke: INK, strokeWidth: 4.5, strokeLinecap: 'round' as const, fill: 'none' };
  switch (mood) {
    case 'listening':
      return (
        <g>
          <circle cx="82" cy="111" r="6.5" fill={INK} />
          <circle cx="118" cy="111" r="6.5" fill={INK} />
          <circle cx="84.5" cy="108.5" r="2" fill="#fff" />
          <circle cx="120.5" cy="108.5" r="2" fill="#fff" />
        </g>
      );
    case 'writing':
      return (
        <g {...stroke}>
          <path d="M73 110 q9 6 18 0" />
          <path d="M109 110 q9 6 18 0" />
        </g>
      );
    case 'puzzled':
      return (
        <g {...stroke}>
          <path d="M72 104 l16 -3" />
          <path d="M74 112 h14" />
          <circle cx="118" cy="111" r="6" fill={INK} stroke="none" />
          <circle cx="120.3" cy="108.8" r="1.8" fill="#fff" stroke="none" />
        </g>
      );
    default:
      return (
        <g {...stroke}>
          <path d="M73 113 q9 -10 18 0" />
          <path d="M109 113 q9 -10 18 0" />
        </g>
      );
  }
}

function Mouth({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case 'listening':
      return <ellipse cx="100" cy="127" rx="3.5" ry="4" fill={INK} />;
    case 'writing':
      return (
        <path
          d="M94 125 q6 4 12 0"
          stroke={INK}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'puzzled':
      return (
        <path
          d="M92 128 q4 -4 8 0 t8 0"
          stroke={INK}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      );
    default:
      return (
        <path
          d="M91 122 q9 12 18 0 z"
          fill="#8a3a2c"
          stroke={INK}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      );
  }
}

/** 4갈래 반짝이 */
function Sparkle({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -10 C1.5 -3 3 -1.5 10 0 C3 1.5 1.5 3 0 10 C-1.5 3 -3 1.5 -10 0 C-3 -1.5 -1.5 -3 0 -10 Z"
      fill={GOLD}
    />
  );
}

export function Mascot({
  mood = 'hello',
  size = 160,
  label,
  className = '',
  bob = false,
}: {
  mood?: MascotMood;
  size?: number;
  /** 스크린 리더용 설명. 없으면 장식으로 취급 */
  label?: string;
  className?: string;
  bob?: boolean;
}) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const };
  const wave = mood === 'hello';

  return (
    <svg
      viewBox="0 0 220 190"
      width={size}
      height={(size * 190) / 220}
      className={`${bob ? 'mochi-bob' : ''} ${className}`}
      {...a11y}
    >
      {/* 그림자 */}
      <ellipse cx="104" cy="177" rx="74" ry="7" fill="#c9b79a" opacity="0.45" />

      {/* 왼손(인사할 땐 들어 흔든다) */}
      {wave ? (
        <g>
          <path
            d="M14 96 q-8 6 -6 16"
            stroke={GOLD}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M6 90 q-10 10 -6 24"
            stroke={GOLD}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            opacity="0.7"
          />
          <circle cx="24" cy="114" r="11" fill={MOCHI} stroke={OUTLINE} strokeWidth="4" />
        </g>
      ) : (
        <circle cx="26" cy="142" r="10" fill={MOCHI} stroke={OUTLINE} strokeWidth="4" />
      )}

      {/* 몸 */}
      <path
        d="M28 158 C20 112 46 70 104 68 C162 70 188 112 180 158 C178 167 170 170 158 170 L50 170 C38 170 30 167 28 158 Z"
        fill={MOCHI}
        stroke={OUTLINE}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M38 160 C60 166 148 166 170 160 C168 166 162 167 156 167 L52 167 C46 167 40 166 38 160 Z"
        fill={SHADE}
      />

      {/* 팥 세 알 */}
      <ellipse cx="138" cy="90" rx="4.6" ry="3.4" transform="rotate(-25 138 90)" fill={BEAN} />
      <ellipse cx="154" cy="103" rx="4.2" ry="3.2" transform="rotate(20 154 103)" fill={BEAN} />
      <ellipse cx="134" cy="105" rx="3.6" ry="2.8" transform="rotate(10 134 105)" fill={BEAN} />

      {/* 볼 */}
      <ellipse cx="62" cy="132" rx="10" ry="6" fill={CHEEK} />
      <ellipse cx="146" cy="132" rx="10" ry="6" fill={CHEEK} />

      <g transform="translate(0 8)">
        <Eyes mood={mood} />
        <Mouth mood={mood} />
      </g>

      {/* 갓 */}
      <g>
        <path
          d="M88 68 C88 46 90 34 104 34 C118 34 120 46 120 68 Z"
          fill="#4a3b33"
          stroke={INK}
          strokeWidth="2"
        />
        <rect x="89" y="60" width="30" height="5" rx="2" fill="#2b211c" />
        <ellipse cx="104" cy="70" rx="50" ry="6.5" fill="#3b2f2a" stroke={INK} strokeWidth="2" />
        <ellipse cx="104" cy="68" rx="36" ry="3" fill="#5a4a40" opacity="0.6" />
      </g>

      {/* 오른손과 붓 */}
      <g>
        <path d="M198 100 L174 156" stroke="#9a6a3a" strokeWidth="6.5" strokeLinecap="round" />
        <path
          d="M174 156 C170 164 166 170 161 174 C165 166 166 160 168 154 Z"
          fill="#2b211c"
          stroke="#2b211c"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="184" cy="136" r="11" fill={MOCHI} stroke={OUTLINE} strokeWidth="4" />
      </g>

      {/* 표정별 소품 */}
      {mood === 'listening' && (
        <g stroke={GOLD} strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M200 112 q7 11 0 22" />
          <path d="M209 104 q12 19 0 38" />
        </g>
      )}
      {mood === 'writing' && (
        <g>
          <circle cx="164" cy="38" r="4" fill={GOLD} opacity="0.55" />
          <circle cx="178" cy="32" r="5" fill={GOLD} opacity="0.8" />
          <circle cx="194" cy="24" r="6" fill={GOLD} />
          <g transform="rotate(-12 170 164)">
            <rect
              x="146"
              y="150"
              width="48"
              height="30"
              rx="3"
              fill="#fff8e8"
              stroke={OUTLINE}
              strokeWidth="3"
            />
            <path
              d="M154 160 h26 M154 168 h18"
              stroke="#b08a5c"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        </g>
      )}
      {mood === 'done' && (
        <g>
          <Sparkle x={34} y={52} s={1.3} />
          <Sparkle x={182} y={48} s={1.1} />
          <Sparkle x={24} y={92} s={0.7} />
        </g>
      )}
      {mood === 'puzzled' && (
        <text
          x="176"
          y="44"
          fontSize="40"
          fontWeight="900"
          fill={GOLD}
          fontFamily="'Noto Sans KR', sans-serif"
        >
          ?
        </text>
      )}
    </svg>
  );
}
