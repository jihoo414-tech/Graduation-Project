import type { MouseEventHandler } from 'react';
import type { ActionFeedback, JourneyContext } from '../../lib/demoJourney';
import type { ResultEnvelope } from '../../lib/types';
import { buildClinicianSummary, buildPatientFriendlySummary, buildPatientInputSummary } from '../../lib/workspace';

type ReportPageProps = {
  result: ResultEnvelope;
  journeyContext: JourneyContext;
  actionFeedback: ActionFeedback | null;
  onBack: MouseEventHandler<HTMLButtonElement>;
  onPrint: MouseEventHandler<HTMLButtonElement>;
};

export function ReportPage({ result, journeyContext, actionFeedback, onBack, onPrint }: ReportPageProps) {
  const patientSummary = buildPatientInputSummary(result);
  const clinicianSummary = buildClinicianSummary(result);
  const patientText = buildPatientFriendlySummary(result);

  return (
    <main className="product-shell">
      <section className="report-document-shell">
        <div className="workspace-page-header">
          <div>
            <p className="workspace-page-kicker">Report</p>
            <h1>리포트 출력 화면</h1>
          </div>
          <div className="button-row">
            <button type="button" className="secondary-button" onClick={onBack}>
              결과 화면으로 돌아가기
            </button>
            <button type="button" className="primary-button" onClick={onPrint}>
              PDF 저장 / 인쇄
            </button>
          </div>
        </div>

        <div className="journey-context-card">
          <strong>{journeyContext.caseId}</strong>
          <span>{journeyContext.statusLabel} · {journeyContext.stageSummary}</span>
        </div>

        {actionFeedback ? (
          <div className={`action-feedback-banner action-feedback-${actionFeedback.tone}`} role="status">
            {actionFeedback.message}
          </div>
        ) : null}

        <article className="report-document">
          <section>
            <h2>케이스 개요</h2>
            <p>케이스 ID: {patientSummary.patientId}</p>
            <p>암종: LUAD (prototype)</p>
            <p>입력 데이터 출처: 업로드된 CSV/JSON</p>
          </section>

          <section>
            <h2>입력 데이터 요약</h2>
            <p>변이 개수: {patientSummary.variantCount}</p>
            <p>주요 유전자: {patientSummary.geneNames.join(', ') || '없음'}</p>
            <p>임상정보: {patientSummary.clinicalSummary.join(' · ') || '입력된 임상정보 없음'}</p>
          </section>

          <section>
            <h2>모델 결과</h2>
            <p>위험군: {result.result.summary.risk_level}</p>
            <p>위험 점수: {result.result.summary.risk_score.toFixed(2)}</p>
            <p>{result.result.summary.text}</p>
          </section>

          <section>
            <h2>주요 해석 포인트</h2>
            <p>{clinicianSummary}</p>
          </section>

          <section>
            <h2>환자 설명용 요약</h2>
            <p>{patientText}</p>
          </section>

          <section>
            <h2>면책 / 주의 문구</h2>
            <p>본 결과는 임상 판단을 대체하지 않으며 전문의 검토와 함께 사용해야 합니다.</p>
          </section>
        </article>
      </section>
    </main>
  );
}
