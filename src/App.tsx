import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { AppLayout } from './components/index.js';
import {
  ConsentScreen,
  HomeScreen,
  ListeningScreen,
  AskingScreen,
  SummaryScreen,
  ShowingScreen,
  CrisisScreen,
  ErrorScreen,
} from './screens/index.js';
import { StateProvider, useAppState, useLiveActions } from './state/index.js';

// 임시 라우트: /mic-test → B의 실기기 녹음·STT·TTS 확인용
const micTestModules = import.meta.glob<Record<string, unknown>>('./voice/MicTest.tsx');
const loadMicTest = micTestModules['./voice/MicTest.tsx'];
const MicTest = loadMicTest
  ? lazy(async () => {
      const mod = await loadMicTest();
      return { default: (mod.default ?? mod.MicTest) as ComponentType };
    })
  : null;

function MainRouter() {
  const { state } = useAppState();
  const live = useLiveActions();

  // 앱 시작 시 한 번: 만료된 요약 정리, 이전 동의 복원, 저장 목록 불러오기
  useEffect(() => {
    void live.startup();
  }, [live]);

  const renderScreen = () => {
    switch (state.screen) {
      case 'consent':
        return <ConsentScreen />;
      case 'home':
        return <HomeScreen />;
      case 'listening':
        return <ListeningScreen />;
      case 'asking':
        return <AskingScreen />;
      case 'summary':
        return <SummaryScreen />;
      case 'showing':
        return <ShowingScreen />;
      case 'crisis':
        return <CrisisScreen />;
      case 'error':
        return <ErrorScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return <AppLayout>{renderScreen()}</AppLayout>;
}

export default function App() {
  if (typeof window !== 'undefined' && window.location.pathname === '/mic-test') {
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
    <StateProvider>
      <MainRouter />
    </StateProvider>
  );
}
