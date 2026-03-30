import { useMemo, useState } from 'react';
import type { MouseEventHandler } from 'react';
import type { ActionFeedback, JourneyContext } from '../../lib/demoJourney';
import type { ResultEnvelope } from '../../lib/types';
import {
  buildCommunicationTips,
  buildCounselingChecklist,
  buildExplanationSummary,
  explanationAudienceLabels,
  type ExplanationAudience,
} from '../../lib/workspace';

type ExplanationPageProps = {
  result: ResultEnvelope;
  journeyContext: JourneyContext;
  actionFeedback: ActionFeedback | null;
  onBackToResult: MouseEventHandler<HTMLButtonElement>;
  onCopy: (content: string) => void;
  onPrint: (content: string) => void;
  onAddNote: (content: string) => void;
};

export function ExplanationPage({
  result,
  journeyContext,
  actionFeedback,
  onBackToResult,
  onCopy,
  onPrint,
  onAddNote,
}: ExplanationPageProps) {
  const [audience, setAudience] = useState<ExplanationAudience>('patient');
  const activeText = useMemo(() => buildExplanationSummary(result, audience), [result, audience]);
  const counselingChecklist = useMemo(() => buildCounselingChecklist(result), [result]);
  const communicationTips = useMemo(() => buildCommunicationTips(audience), [audience]);

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

        <div className="journey-context-card">
          <strong>{journeyContext.caseId}</strong>
          <span>{journeyContext.sessionLabel} · {journeyContext.nextStepLabel}</span>
        </div>

        {actionFeedback ? (
          <div className={`action-feedback-banner action-feedback-${actionFeedback.tone}`} role="status">
            {actionFeedback.message}
          </div>
        ) : null}

        <div className="workspace-tabs" role="tablist" aria-label="설명 대상 전환">
          {(Object.keys(explanationAudienceLabels) as ExplanationAudience[]).map((audienceOption) => (
            <button
              key={audienceOption}
              type="button"
              role="tab"
              aria-selected={audience === audienceOption}
              className={`workspace-tab ${audience === audienceOption ? 'is-active' : ''}`}
              onClick={() => setAudience(audienceOption)}
            >
              {explanationAudienceLabels[audienceOption]}
            </button>
          ))}
        </div>

        <div className="workspace-panel-grid three-col explanation-grid">
          <article className="workspace-inline-output">
            <h3>{explanationAudienceLabels[audience]}</h3>
            <p>{activeText}</p>
            <p className="muted-text">
              <abbr title="확정적인 결과가 아니라 추정치입니다.">불확실성</abbr>을 함께 설명하고, 담당 전문의의
              판단과 함께 전달해야 합니다.
            </p>
          </article>

          <article className="workspace-summary-card">
            <h3>상담 체크리스트</h3>
            <ul className="detail-list">
              {counselingChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="workspace-summary-card">
            <h3>설명 팁</h3>
            <ul className="detail-list">
              {communicationTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </article>
        </div>

        <div className="button-row">
          <button type="button" className="secondary-button" onClick={() => onCopy(activeText)}>
            복사
          </button>
          <button type="button" className="secondary-button" onClick={() => onPrint(activeText)}>
            인쇄용 요약 생성
          </button>
          <button type="button" className="primary-button" onClick={() => onAddNote(activeText)}>
            상담 메모에 추가
          </button>
        </div>
      </section>
    </main>
  );
}
