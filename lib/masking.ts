/**
 * OpenAI로 보내기 전에 주민등록번호·전화번호를 가린다.
 * 공공기관 대표번호(129, 110, 1355 같은 3~4자리)와 1588-xxxx 같은 기관 대표번호는 가리지 않는다.
 */
export const MASK = '******';

const SEP = '[-\\s.]?';

// 주민등록번호·외국인등록번호: 생년월일 6자리 + (구분자) + 성별 1~8 + 6자리
const RRN = new RegExp(`(?<!\\d)\\d{6}${SEP}[1-8]\\d{6}(?!\\d)`, 'g');

// 휴대폰: 010·011·016·017·018·019
const MOBILE = new RegExp(`(?<!\\d)01[016789]${SEP}\\d{3,4}${SEP}\\d{4}(?!\\d)`, 'g');

// 일반 전화(02, 031 등)와 050·070 인터넷 전화. 지역번호는 괄호를 쓸 수도 있다: (02) 123-4567
const LANDLINE = new RegExp(
  `(?<!\\d)(?:\\(0\\d{1,2}\\)\\s?|0\\d{1,2}${SEP})\\d{3,4}${SEP}\\d{4}(?!\\d)`,
  'g',
);

export function maskPII(text: string): string {
  return text.replace(RRN, MASK).replace(MOBILE, MASK).replace(LANDLINE, MASK);
}
