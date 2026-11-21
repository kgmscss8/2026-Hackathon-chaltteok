// 위기 발언 키워드 감지 (파트 C). 프론트(인식 직후)와 /api/turn(LLM 판단과 OR) 둘 다 쓴다.
// 생명·안전 위협(자살·자해, 폭력·학대)과 생계 위기(굶주림, 당장 쫓겨남·잘 곳 없음).
// "죽겠다·미치겠다" 같은 일상 과장 표현은 잡지 않도록 구체적인 표현만 넣는다.

const KO: RegExp[] = [
  // 자살·자해
  /죽고\s*싶/,
  /죽어\s*버리/,
  /죽을\s*(거|것)\s*같아서/,
  /자살/,
  /목숨을\s*끊/,
  /살고\s*싶지\s*않/,
  /사라지고\s*싶/,
  /자해/,
  /손목을\s*긋/,
  // 폭력·학대·위협
  /(한테|에게|에게서)\s*(또\s*)?맞(았|아|고|는)/,
  /때려(요|서|요\.|$)|때렸|때리(고|는|면)/,
  /폭행|폭력|학대|성폭|성추행|스토킹/,
  /죽이겠다|죽인다고|죽여\s*버리겠/,
  // 생계 위기
  /굶(고|어|었|는|주)/,
  /(아무것도|며칠째|며칠\s*동안).{0,10}못\s*먹/,
  /먹을\s*(게|것이?|거)\s*(하나도\s*)?없/,
  /쫓겨나|쫓아내|내쫓/,
  /(갈|잘)\s*(데|곳)(가|이)?\s*없/,
  /노숙|길에서\s*자/,
  /(전기|가스|물)(가|이)?\s*끊/,
];

const EN: RegExp[] = [
  /\b(kill|hurt)\s+myself\b/,
  /\bsuicid/,
  /\bwant\s+to\s+die\b/,
  /\bend\s+my\s+life\b/,
  /\b(hit|hits|beat|beats|beaten|abus\w*|attack\w*)\s+(me|by)\b/,
  /\b(domestic\s+)?violence\b/,
  /\bthreaten\w*\s+to\s+kill\b/,
  /\b(starving|no\s+food|haven'?t\s+eaten|nothing\s+to\s+eat)\b/,
  /\b(evicted|kicked\s+out|thrown\s+out)\b/,
  /\b(homeless|nowhere\s+to\s+(go|sleep|stay|live))\b/,
];

const VI: RegExp[] = [
  /muốn\s+chết/,
  /tự\s+(tử|sát)/,
  /không\s+muốn\s+sống/,
  /bị\s+.{0,15}đánh|đánh\s+tôi/,
  /bạo\s+hành|bạo\s+lực|xâm\s+hại/,
  /dọa\s+giết/,
  /(nhịn\s+đói|không\s+có\s+gì\s+(để\s+)?ăn|chưa\s+ăn\s+gì)/,
  /bị\s+đuổi(\s+ra)?(\s+khỏi)?\s+nhà|đuổi\s+tôi/,
  /không\s+có\s+(chỗ|nơi)\s+(ở|ngủ)|vô\s+gia\s+cư/,
];

const ALL = [...KO, ...EN, ...VI];

/** 위기 키워드가 있으면 true. 언어 구분 없이 모두 검사한다. */
export function detectCrisisKeywords(text: string): boolean {
  if (!text) return false;
  const t = text.normalize('NFC').toLowerCase();
  return ALL.some((re) => re.test(t));
}
