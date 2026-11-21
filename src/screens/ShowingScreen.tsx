import { useState, type FC } from 'react';
import QRCode from 'react-qr-code';
import { BigButton, AiMayBeWrong } from '../components/index.js';
import { DemoAdapter } from '../demo/index.js';
import { useAppState } from '../state/index.js';

export const ShowingScreen: FC = () => {
  const { state, dispatch } = useAppState();
  const [showQR, setShowQR] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const card = state.currentCard || DemoAdapter.getSummaryCard('pension');
  const contacts = state.contacts.length > 0 ? state.contacts : DemoAdapter.getContacts('pension');

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // QR 코드에 담길 요약 텍스트 자체 생성
  const qrText = [
    `[찰떡 민원 요약]`,
    `1. 대상: ${card.who}`,
    `2. 상황: ${card.situation}`,
    `3. 요청: ${card.request}`,
    card.unknowns.length > 0 ? `4. 미확인: ${card.unknowns.join(', ')}` : '',
    card.to_ask.length > 0 ? `5. 문의: ${card.to_ask.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div className="flex flex-col justify-between flex-1 py-2">
      <div>
        {/* 상단 컨트롤 바 */}
        <div className="flex items-center justify-between mb-4 border-b pb-3">
          <button
            type="button"
            onClick={() => dispatch({ type: 'NAVIGATE', screen: 'summary' })}
            className="text-sm font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1"
          >
            ‹ 수정하기
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-3 py-1.5 rounded-lg border border-gray-300"
            >
              {isFullscreen ? '창모드' : '전체화면 ⛶'}
            </button>
            <button
              type="button"
              onClick={() => setShowQR(!showQR)}
              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-lg border border-blue-200"
            >
              {showQR ? '카드 보기' : 'QR 코드 보기'}
            </button>
          </div>
        </div>

        {/* 창구 담당자 안내 문구 */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 text-center mb-5 shadow-md">
          <span className="text-xs tracking-wider text-slate-300 block mb-0.5">
            주민센터 창구 담당자용
          </span>
          <p className="text-xl md:text-2xl font-black text-amber-300">
            "이 화면을 담당 직원에게 보여주세요"
          </p>
          <span className="text-xs text-slate-400 mt-1 block">
            가로로 돌리시면 더 큰 글씨로 보실 수 있습니다.
          </span>
        </div>

        {/* QR 코드 모달/뷰 */}
        {showQR ? (
          <div className="bg-white border-2 border-gray-300 rounded-2xl p-6 text-center my-4 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-gray-700 mb-3 block">
              스캔 시 요약 텍스트가 바로 복사됩니다:
            </span>
            <div className="p-3 bg-white border rounded-xl shadow-sm">
              <QRCode value={qrText} size={220} />
            </div>
            <p className="text-xs text-gray-500 mt-3">
              * URL 연결 없이 텍스트 자체를 담고 있습니다.
            </p>
          </div>
        ) : (
          /* 5줄 이내 굵은 고딕 22px+ 핵심 카드 */
          <div className="space-y-4 mb-6">
            <article className="border-2 border-slate-300 bg-white rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <span className="text-xs font-bold text-gray-500 tracking-wide uppercase block mb-1">
                  ① 누구의 일인지
                </span>
                <p className="text-[22px] md:text-[24px] font-black text-gray-950 leading-snug">
                  {card.who}
                </p>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <span className="text-xs font-bold text-gray-500 tracking-wide uppercase block mb-1">
                  ② 현재 상황
                </span>
                <p className="text-[20px] md:text-[22px] font-bold text-gray-900 leading-snug">
                  {card.situation}
                </p>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <span className="text-xs font-bold text-blue-700 tracking-wide uppercase block mb-1">
                  ③ 요청 사항
                </span>
                <p className="text-[22px] md:text-[24px] font-black text-blue-900 leading-snug">
                  {card.request}
                </p>
              </div>

              {card.unknowns.length > 0 && (
                <div className="border-t border-gray-200 pt-3">
                  <span className="text-xs font-bold text-amber-700 tracking-wide uppercase block mb-1">
                    ④ 미확인 사항 (방문 시 확인 요망)
                  </span>
                  <ul className="list-disc list-inside text-[18px] md:text-[20px] font-semibold text-amber-950">
                    {card.unknowns.map((u, i) => (
                      <li key={i}>{u}</li>
                    ))}
                  </ul>
                </div>
              )}

              {card.to_ask.length > 0 && (
                <div className="border-t border-gray-200 pt-3">
                  <span className="text-xs font-bold text-slate-700 tracking-wide uppercase block mb-1">
                    ⑤ 문의 사항
                  </span>
                  <ul className="list-disc list-inside text-[18px] md:text-[20px] font-semibold text-slate-900">
                    {card.to_ask.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          </div>
        )}

        {/* 참고 연락처 안내 섹션 */}
        {contacts.length > 0 && (
          <section aria-labelledby="contacts-heading" className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
            <h2 id="contacts-heading" className="text-sm font-bold text-gray-700 mb-2 flex items-center justify-between">
              <span>📞 관련 기관 참고 연락처</span>
              <span className="text-xs font-normal text-gray-500">직접 문의 가능</span>
            </h2>
            <div className="space-y-2">
              {contacts.map((contact, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-base text-gray-900 block">{contact.name}</span>
                    <span className="text-xs text-gray-500">{contact.scope}</span>
                  </div>
                  {contact.phone ? (
                    <a
                      href={`tel:${contact.phone}`}
                      className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm px-3.5 py-2 rounded-xl flex items-center gap-1 shadow-sm"
                    >
                      <span>전화</span>
                      <span className="font-extrabold">{contact.phone}</span>
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                      방문 상담
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              * 자세한 자격 심사 및 구비 서류는 위 관할 기관에 상담하세요.
            </p>
          </section>
        )}

        <AiMayBeWrong variant="subtle" className="mb-4" />
      </div>

      <div className="pt-2">
        <BigButton
          variant="secondary"
          onClick={() => dispatch({ type: 'RESET_FLOW' })}
          className="text-base py-3"
        >
          처음 화면으로 돌아가기
        </BigButton>
      </div>
    </div>
  );
};
