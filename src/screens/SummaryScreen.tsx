import { useState } from 'react';
import { SLOT_KEYS, type SlotKey } from '@lib/schema';
import {
  AiNotice,
  BigButton,
  Card,
  CheckIcon,
  Mascot,
  PencilIcon,
  PushToTalkButton,
  QuestionIcon,
  RedoIcon,
  SpeakPill,
  TextComposer,
} from '../components/index.js';
import { slotLabel } from '../i18n/index.js';
import { useT } from '../i18n/useT.js';
import { useAppState, useFlow } from '../state/context.js';

/**
 * 화면 4(디자인 5번 "요약 확인", F4·F5). 항목별로 크게 보여 주고 읽어 준다.
 * 틀린 항목만 눌러 말로·글로 고친다(그 항목만 다시 정리). 근거 없는 항목은 "확인 못 함".
 */
export function SummaryScreen() {
  const state = useAppState();
  const flow = useFlow();
  const tr = useT();
  const [showWords, setShowWords] = useState(false);
  const busy = state.phase !== 'idle';
  const lang = state.uiLanguage;
  const editing = state.editSlot;

  const rows = SLOT_KEYS.map((key) => ({
    key,
    label: slotLabel(lang, key),
    value: state.slots[key].value,
    evidence: state.slots[key].evidence,
  }));
  const speakText = [
    tr('summary.readAll'),
    ...rows.map((r) => `${r.label}: ${r.value ?? tr('summary.unconfirmed')}`),
  ].join(' ');
  const openEdit = (key: SlotKey) => flow.startEdit(editing === key ? null : key);
  const showEvidence = showWords || state.language !== 'ko';

  return (
    <div className="flex flex-1 flex-col gap-3.5">
      <div className="flex items-end justify-between gap-2">
        <h1 className="m-0 text-[32px] font-black leading-tight tracking-[-0.5px]">
          {tr('summary.title')}
        </h1>
        <Mascot mood="done" size={92} label={tr('mascot.name')} />
      </div>
      <SpeakPill text={speakText} auto />

      <Card className="px-5 py-1">
        {rows.map((r, i) => (
          <div key={r.key} className={i < rows.length - 1 ? 'border-b-2 border-line-soft' : ''}>
            <button
              type="button"
              onClick={() => openEdit(r.key)}
              aria-expanded={editing === r.key}
              disabled={busy}
              className="flex w-full flex-col gap-1 py-3.5 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
            >
              <span className="flex w-full items-center justify-between text-[15px] font-bold text-ink-3">
                <span>{r.label}</span>
                <span className="flex items-center gap-1 text-accent">
                  <PencilIcon size={16} />
                  {tr('summary.fix')}
                </span>
              </span>
              {r.value ? (
                <span className="text-[21px] font-bold leading-snug">{r.value}</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 self-start rounded-[10px] bg-warn-bg px-3 py-1.5 text-[16px] font-bold text-warn">
                  <QuestionIcon size={18} />
                  {tr('summary.unconfirmed')}
                </span>
              )}
              {showEvidence && r.evidence && (
                <span className="text-[15px] text-ink-3">
                  {tr('summary.evidence')}: “{r.evidence}”
                </span>
              )}
            </button>

            {editing === r.key && (
              <div className="mb-4 flex flex-col gap-3 rounded-[16px] bg-paper p-3">
                <p className="m-0 text-[17px] font-bold">
                  {tr('summary.fixTitle', { label: r.label })}
                </p>
                {state.mode === 'live' && (
                  <PushToTalkButton label={tr('ptt.fix')} shape="pill" disabled={busy} />
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
          </div>
        ))}
      </Card>

      <div className="text-[16px] text-ink-3">{tr('summary.tapToFix')}</div>

      <button
        type="button"
        aria-expanded={showWords}
        onClick={() => setShowWords((v) => !v)}
        className="self-start text-[16px] font-bold text-accent underline underline-offset-4"
      >
        {showWords ? tr('summary.hideWords') : tr('summary.myWords')}
      </button>
      {showWords && (
        <ol className="m-0 flex flex-col gap-2 rounded-[16px] border-2 border-line bg-white p-4 pl-8">
          {state.history
            .filter((m) => m.role === 'user')
            .map((m, i) => (
              <li key={i} className="text-[17px]">
                “{m.text}”
              </li>
            ))}
        </ol>
      )}

      <AiNotice />

      <div className="mt-auto grid grid-cols-2 gap-2.5 pt-2">
        <BigButton
          variant="outline"
          icon={<RedoIcon size={26} />}
          className="!min-h-[76px] !rounded-[20px]"
          disabled={busy}
          onClick={() => flow.goHome()}
        >
          {tr('summary.redo')}
        </BigButton>
        <BigButton
          icon={<CheckIcon size={28} width={2.6} />}
          className="!min-h-[76px] !rounded-[20px] !text-[22px] !font-black"
          disabled={busy || !!editing}
          onClick={() => void flow.confirm()}
        >
          {tr('summary.confirm')}
        </BigButton>
      </div>
    </div>
  );
}
