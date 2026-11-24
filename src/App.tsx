import { lazy, Suspense, useEffect } from 'react';
import { AppShell, Mascot, VoiceProvider, type MascotMood } from './components/index.js';
import {
  AskingScreen,
  ConsentScreen,
  CrisisScreen,
  ErrorScreen,
  HomeScreen,
  SelectScreen,
  ShowingScreen,
  SummaryScreen,
} from './screens/index.js';
import { AppProvider, useAppState, useFlow } from './state/context.js';

// 임시 점검 화면: /mic-test → 실기기 녹음·STT·TTS 확인(파트 B). 시연 전 삭제
const MicTest = lazy(() => import('./voice/MicTest.js'));

function Screens() {
  const state = useAppState();
  const flow = useFlow();

  // 앱 시작 시 한 번: 만료 요약 정리, 영구 저장 요청, 이전 동의·화면 언어 복원, 저장 목록
  useEffect(() => {
    void flow.startup();
  }, [flow]);

  if (!state.ready) return null;
  switch (state.screen) {
    case 'consent':
      return <ConsentScreen />;
    case 'home':
      // 보기에서 고르기(디자인 2번)는 홈의 한 단계로 보여 준다
      return state.homePanel === 'pick' ? <SelectScreen /> : <HomeScreen />;
    case 'asking':
      // 질문이 바뀌면 "직접 말할게요" 입력 상태를 새로 시작
      return <AskingScreen key={state.nextQuestion ?? ''} />;
    case 'summary':
      return <SummaryScreen />;
    case 'showing':
      return <ShowingScreen />;
    case 'crisis':
      return <CrisisScreen />;
    case 'error':
      return <ErrorScreen />;
  }
}

/** 개발 중에만: /mascot 에서 찰떡이 5가지 표정 확인 */
function MascotGallery() {
  const moods: MascotMood[] = ['hello', 'listening', 'writing', 'done', 'puzzled'];
  return (
    <main className="flex min-h-screen flex-wrap items-center justify-center gap-6 bg-paper p-6">
      {moods.map((m) => (
        <figure
          key={m}
          className="m-0 flex flex-col items-center gap-2 rounded-[22px] border-2 border-line bg-white p-4"
        >
          <Mascot mood={m} size={200} />
          <figcaption className="text-[17px] font-bold">{m}</figcaption>
        </figure>
      ))}
    </main>
  );
}

export default function App() {
  if (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.location.pathname === '/mascot'
  ) {
    return <MascotGallery />;
  }
  if (typeof window !== 'undefined' && window.location.pathname === '/mic-test') {
    return (
      <main className="min-h-screen bg-white p-5 text-[18px]">
        <Suspense fallback={<p>…</p>}>
          <MicTest />
        </Suspense>
      </main>
    );
  }
  return (
    <AppProvider>
      <VoiceProvider>
        <AppShell>
          <Screens />
        </AppShell>
      </VoiceProvider>
    </AppProvider>
  );
}
