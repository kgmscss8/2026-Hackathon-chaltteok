// 임시 화면 (Phase 0 뼈대). 파트 D가 교체한다.
import { lazy, Suspense, type ComponentType } from 'react';

// 임시 라우트: /mic-test → B의 src/voice/MicTest.tsx (실기기 녹음·STT·TTS 확인용, 확인 후 삭제)
// 파일이 아직 없어도 빌드가 깨지지 않도록 glob으로 찾는다.
const micTestModules = import.meta.glob<Record<string, unknown>>('./voice/MicTest.tsx');
const loadMicTest = micTestModules['./voice/MicTest.tsx'];
const MicTest = loadMicTest
  ? lazy(async () => {
      const mod = await loadMicTest();
      return { default: (mod.default ?? mod.MicTest) as ComponentType };
    })
  : null;

export default function App() {
  if (window.location.pathname === '/mic-test') {
    return (
      <main className="min-h-screen bg-white p-6 text-[17px] text-gray-900">
        {MicTest ? (
          <Suspense fallback={<p>불러오는 중…</p>}>
            <MicTest />
          </Suspense>
        ) : (
          <p>아직 src/voice/MicTest.tsx가 없습니다. B의 브랜치 미리보기에서 열어 주세요.</p>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white p-6 text-[17px] text-gray-900">
      <h1 className="text-2xl font-bold">찰떡</h1>
      <p className="mt-2">개떡같이 말해도 찰떡같이 알아듣는다.</p>
    </main>
  );
}
