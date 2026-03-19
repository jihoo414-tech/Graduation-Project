import { useMemo, useState } from 'react';
import type { MouseEventHandler } from 'react';
import type { ResultEnvelope } from '../../lib/types';
import { buildClinicianSummary, buildPatientFriendlySummary } from '../../lib/workspace';

type ExplanationPageProps = {
  result: ResultEnvelope;
  onBackToResult: MouseEventHandler<HTMLButtonElement>;
  onCopy: MouseEventHandler<HTMLButtonElement>;
  onPrint: MouseEventHandler<HTMLButtonElement>;
  onAddNote: MouseEventHandler<HTMLButtonElement>;
};

export function ExplanationPage({
  result,
  onBackToResult,
  onCopy,
  onPrint,
  onAddNote,
}: ExplanationPageProps) {
  const [tone, setTone] = useState<'clinician' | 'patient'>('patient');
  const clinicianSummary = useMemo(() => buildClinicianSummary(result), [result]);
  const patientSummary = useMemo(() => buildPatientFriendlySummary(result), [result]);
  const activeText = tone === 'clinician' ? clinicianSummary : patientSummary;

  return (
    <main className="product-shell">
      <section className="workspace-page-shell">
        <div className="workspace-page-header">
          <div>
            <p className="workspace-page-kicker">Explanation</p>
            <h1>환자 설명용 화면</h1>
            <p>전문의용 요약과 환자용 설명을 전환하며 상담에 바로 쓸 수 있는 표현을 준비합니다.</p>
          </div>
          <button type="button" className="secondary-button" onClick={onBackToResult}>
            결과 화면으로 돌아가기
          </button>
        </div>

        <div className="button-row">
          <button
            type="button"
            className={`workspace-tab ${tone === 'clinician' ? 'is-active' : ''}`}
            onClick={() => setTone('clinician')}
          >
            전문의용 요약
          </button>
          <button
            type="button"
            className={`workspace-tab ${tone === 'patient' ? 'is-active' : ''}`}
            onClick={() => setTone('patient')}
          >
            환자용 설명
          </button>
        </div>

        <article className="workspace-inline-output">
          <h3>{tone === 'clinician' ? '전문의용 요약' : '환자용 설명'}</h3>
          <p>{activeText}</p>
          <p className="muted-text">
            <abbr title="확정적인 결과가 아니라 추정치입니다.">불확실성</abbr>을 함께 설명하고, 담당 전문의의
            판단과 함께 전달해야 합니다.
          </p>
        </article>

        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onCopy}>
            복사
          </button>
          <button type="button" className="secondary-button" onClick={onPrint}>
            인쇄용 요약 생성
          </button>
          <button type="button" className="primary-button" onClick={onAddNote}>
            상담 메모에 추가
          </button>
        </div>
      </section>
    </main>
  );
}
