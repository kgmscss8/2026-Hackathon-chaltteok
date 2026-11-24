import { useState } from 'react';
import { SLOT_KEYS, type SlotKey } from '@lib/schema';
import {
  AiNotice,
  BigButton,
  PushToTalkButton,
  ScreenTitle,
  TextComposer,
} from '../components/index.js';
import { slotLabel } from '../i18n/index.js';
import { useT } from '../i18n/useT.js';
import { useAppState, useFlow } from '../state/context.js';

/**
 * 화면 4: 요약 확인(F4·F5). 항목별로 크게 보여 주고 읽어 준다.
 * 틀린 항목만 눌러 말로·글로 고친다(그 항목만 다시 정리, 처음부터 다시 하지 않음).
 * "내가 한 말 보기"로 원문과 각 항목의 근거를 확인한다.
 */
export function SummaryScreen() {
  const state = useAppState();
  const flow = useFlow();
  const tr = useT();
  const [showWords, setShowWords] = useState(false);
  const busy = state.phase !== 'idle';
  const lang = state.uiLanguage;
  const editing = state.editSlot;
  const unknown = tr('summary.unknown');

  const rows = SLOT_KEYS.map((key) => ({
    key,
    label: slotLabel(lang, key),
    value: state.slots[key].value,
    evidence: state.slots[key].evidence,
  }));
  const speakText = [
    tr('summary.readAll'),
    ...rows.map((r) => `${r.label}: ${r.value ?? unknown}`),
  ].join(' ');

  const openEdit = (key: SlotKey) => flow.startEdit(editing === key ? null : key);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <ScreenTitle
        title={tr('summary.title')}
        subtitle={tr('summary.subtitle')}
        speakText={speakText}
      />
      <AiNotice />

      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.key}>
            <button
              type="button"
              onClick={() => openEdit(r.key)}
              aria-expanded={editing === r.key}
              disabled={busy}
              className={`w-full rounded-2xl border-2 p-4 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 ${
                editing === r.key
                  ? 'border-blue-700 bg-blue-50'
                  : 'border-gray-300 bg-white hover:border-blue-500'
              }`}
            >
              <span className="flex items-center justify-between text-base font-bold text-gray-700">
                <span>{r.label}</span>
                <span className="text-blue-800">✎ {tr('summary.fix')}</span>
              </span>
              <span
                className={`mt-1 block text-[22px] font-black leading-snug ${r.value ? 'text-gray-950' : 'text-gray-500'}`}
              >
                {r.value ?? `— ${unknown}`}
              </span>
              {(showWords || state.language !== 'ko') && r.evidence && (
                <span className="mt-2 block rounded-lg bg-gray-100 px-3 py-2 text-base text-gray-800">
                  {tr('summary.evidence')}: “{r.evidence}”
                </span>
              )}
            </button>

            {editing === r.key && (
              <div className="mt-2 space-y-3 rounded-2xl border-2 border-blue-300 p-3">
                <p className="text-lg font-bold">{tr('summary.fixTitle', { label: r.label })}</p>
                {state.mode === 'live' && (
                  <PushToTalkButton label={tr('ptt.fix')} size="lg" disabled={busy} />
                )}
                <TextComposer
                  label={tr('summary.fixWrite')}
                  multiline={false}
                  initial={r.value ?? ''}
                  submitLabel={tr('summary.fixSave')}
                  disabled={busy}
                  onSubmit={(text) => void flow.submitText(text, 'text', { editSlot: r.key })}
                  onCancel={() => flow.startEdit(null)}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      <section>
        <BigButton
          variant="ghost"
          aria-expanded={showWords}
          onClick={() => setShowWords((v) => !v)}
        >
          {showWords ? tr('summary.hideWords') : tr('summary.myWords')}
        </BigButton>
        {showWords && (
          <ol className="mt-2 space-y-2 rounded-2xl border-2 border-gray-200 bg-gray-50 p-4">
            {state.history
              .filter((m) => m.role === 'user')
              .map((m, i) => (
                <li key={i} className="text-lg">
                  <span className="font-bold text-blue-800">{tr('summary.me')}:</span> {m.text}
                </li>
              ))}
          </ol>
        )}
      </section>

      <div className="mt-auto space-y-3 pt-2">
        <BigButton
          variant="confirm"
          icon="✅"
          subtitle={tr('summary.confirmHint')}
          disabled={busy || !!editing}
          className="min-h-[88px] text-2xl"
          onClick={() => void flow.confirm()}
        >
          {tr('summary.confirm')}
        </BigButton>
        <BigButton variant="ghost" disabled={busy} onClick={() => flow.goHome()}>
          {tr('summary.restart')}
        </BigButton>
      </div>
    </div>
  );
}
