import { useState } from 'react';
import { useRecorder } from './useRecorder';
import { transcribe } from '../api/transcribe';
import { speak, stopSpeaking, unlockAudio } from './speak';
import { Language } from '@lib/schema';
import { ApiFailure } from '@lib/errors';

export function MicTest() {
  const { start, stop, recording, error, supported } = useRecorder();
  const [status, setStatus] = useState<string>('대기 중 (버튼을 꾹 누르고 말하세요)');
  const [transcript, setTranscript] = useState<string>('');
  const [detectedLang, setDetectedLang] = useState<Language>('ko');
  const [ttsInput, setTtsInput] = useState<string>(
    '안녕하세요. 어떤 민원 때문에 방문하셨나요? 천천히 말씀해 주세요.'
  );

  const handlePointerDown = () => {
    unlockAudio();
    stopSpeaking();
    setStatus('듣는 중... (손을 떼면 인식합니다)');
    start();
  };

  const handlePointerUp = async () => {
    if (!recording) return;
    try {
      setStatus('음성을 글자로 바꾸는 중...');
      const blob = await stop();
      const res = await transcribe(blob);
      setTranscript(res.text);
      setDetectedLang(res.language);
      setStatus(`인식 완료! (${Math.round(blob.size / 1024)}KB / 언어: ${res.language})`);
    } catch (err) {
      if (err instanceof ApiFailure) {
        setStatus(`API 오류 [${err.error.code}]: ${err.error.message_ko}`);
      } else if (err instanceof Error) {
        setStatus(`안내: ${err.message}`);
      } else {
        setStatus('알 수 없는 오류가 발생했습니다.');
      }
    }
  };

  const handleSpeakTest = async () => {
    unlockAudio();
    setStatus('음성 출력 중...');
    await speak(ttsInput, detectedLang);
    setStatus('음성 출력 완료');
  };

  return (
    <div style={{ maxWidth: 480, margin: '24px auto', padding: 20, fontFamily: 'sans-serif' }}>
      <h2 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
        🎤 파트 B 실기기 음성 테스트 (MicTest)
      </h2>

      <div style={{ padding: 12, background: '#f3f4f6', borderRadius: 8, marginBottom: 16 }}>
        <div>브라우저 녹음 지원 여부: <strong>{supported ? '지원됨 ✅' : '미지원 ❌'}</strong></div>
        <div style={{ marginTop: 4 }}>현재 상태: <strong>{status}</strong></div>
        {error && <div style={{ color: '#dc2626', marginTop: 6 }}>오류: {error}</div>}
      </div>

      {/* 1. Push-to-Talk 녹음 & STT 테스트 */}
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          width: '100%',
          padding: '24px 16px',
          fontSize: 18,
          fontWeight: 'bold',
          borderRadius: 12,
          border: 'none',
          cursor: 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          backgroundColor: recording ? '#ef4444' : '#2563eb',
          color: '#ffffff',
        }}
      >
        {recording ? '🔴 듣는 중... (손을 떼세요)' : '🎙️ 꾹 눌러서 말하기'}
      </button>

      {transcript && (
        <div style={{ marginTop: 16, padding: 14, border: '1px solid #d1d5db', borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>인식된 텍스트 ({detectedLang}):</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{transcript}</div>
        </div>
      )}

      {/* 2. TTS 음성 출력 테스트 */}
      <div style={{ marginTop: 28, borderTop: '1px solid #e5e7eb', paddingTop: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>🔊 TTS 읽어주기 테스트</h3>
        <textarea
          rows={3}
          value={ttsInput}
          onChange={(e) => setTtsInput(e.target.value)}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            type="button"
            onClick={handleSpeakTest}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#059669',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 'bold',
            }}
          >
            ▶️ 읽어주기 실행
          </button>
          <button
            type="button"
            onClick={stopSpeaking}
            style={{
              padding: '12px 16px',
              backgroundColor: '#6b7280',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
            }}
          >
            ⏹️ 중지
          </button>
        </div>
      </div>
    </div>
  );
}
