import { useMemo, useState } from 'react';
import type { MouseEventHandler } from 'react';
import type { ResultEnvelope } from '../../lib/types';
import {
  buildClinicianSummary,
  buildConfidenceLevel,
  buildPatientFriendlySummary,
  buildPatientInputSummary,
  buildReviewStatus,
  buildVariantExplanationRows,
  buildWorkspaceFactors,
  getTimepointProbability,
  getWorkspaceSurvivalCurve,
} from '../../lib/workspace';

type ResultTab = 'overview' | 'evidence' | 'patient' | 'export';

type ResultWorkspaceProps = {
  result: ResultEnvelope;
  onBackToUpload: MouseEventHandler<HTMLButtonElement>;
  onSavePdf: MouseEventHandler<HTMLButtonElement>;
  onSaveImage: MouseEventHandler<HTMLButtonElement>;
  onDownloadJson: MouseEventHandler<HTMLButtonElement>;
  onDownloadClinicianSummary: MouseEventHandler<HTMLButtonElement>;
  onOpenExplanation: MouseEventHandler<HTMLButtonElement>;
  onOpenReport: MouseEventHandler<HTMLButtonElement>;
};

const tabLabels: Record<ResultTab, string> = {
  overview: '요약',
  evidence: '상세 근거',
  patient: '환자 설명용',
  export: '리포트/내보내기',
};

const buildCurvePath = (points: { time: number; survival_probability: number }[]) => {
  if (points.length === 0) {
    return '';
  }

  const maxTime = Math.max(...points.map((point) => point.time), 1);
  const width = 100;
  const height = 100;

  return points
    .map((point, index) => {
      const x = (point.time / maxTime) * width;
      const y = height - point.survival_probability * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
};

export function ResultWorkspace({
  result,
  onBackToUpload,
  onSavePdf,
  onSaveImage,
  onDownloadJson,
  onDownloadClinicianSummary,
  onOpenExplanation,
  onOpenReport,
}: ResultWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<ResultTab>('overview');

  const patientSummary = useMemo(() => buildPatientInputSummary(result), [result]);
  const curve = useMemo(() => getWorkspaceSurvivalCurve(result), [result]);
  const curvePath = useMemo(() => buildCurvePath(curve.points), [curve.points]);
  const { increaseFactors, decreaseFactors } = useMemo(() => buildWorkspaceFactors(result), [result]);
  const variantRows = useMemo(() => buildVariantExplanationRows(result), [result]);
  const clinicianSummary = useMemo(() => buildClinicianSummary(result), [result]);
  const patientSummaryText = useMemo(() => buildPatientFriendlySummary(result), [result]);
  const confidenceLevel = useMemo(() => buildConfidenceLevel(result), [result]);
  const reviewStatus = useMemo(() => buildReviewStatus(result), [result]);
  const timepointCards = useMemo(
    () => [
      { label: '1년', value: getTimepointProbability(curve, 1) },
      { label: '3년', value: getTimepointProbability(curve, 3) },
      { label: '5년', value: getTimepointProbability(curve, 5) },
    ],
    [curve],
  );

  return (
    <main className="workspace-main">
      <section className="workspace-page-shell">
        <div className="workspace-page-header">
          <div>
            <p className="workspace-page-kicker">Result</p>
            <h1>결과 대시보드</h1>
            <p>재발 위험도, 근거, 환자 설명, 리포트까지 결과 검토 흐름을 한 곳에 모았습니다.</p>
          </div>
          <button type="button" className="secondary-button" onClick={onBackToUpload}>
            데이터 입력으로 돌아가기
          </button>
        </div>

        <section className="workspace-top-summary four-col">
          <article className="workspace-summary-card emphasis-card">
            <h2>재발 위험도</h2>
            <strong>{result.result.summary.risk_level}</strong>
            <p>위험 점수 {result.result.summary.risk_score.toFixed(2)}</p>
          </article>

          <article className="workspace-summary-card">
            <h2>예측 신뢰 수준</h2>
            <strong>{confidenceLevel}</strong>
            <p>입력 품질과 경고 수를 바탕으로 보조 평가</p>
          </article>

          <article className="workspace-summary-card">
            <h2>주요 영향 요인 수</h2>
            <strong>{increaseFactors.length + decreaseFactors.length}</strong>
            <p>증가/감소 방향의 해석 포인트</p>
          </article>

          <article className="workspace-summary-card caution-card">
            <h2>권장 검토 상태</h2>
            <strong>{reviewStatus}</strong>
            <p>본 결과는 의사 판단을 보조하기 위한 참고정보입니다.</p>
          </article>
        </section>

        <section className="workspace-tabs-shell">
          <div className="workspace-tabs" role="tablist" aria-label="결과 탭">
            {(Object.keys(tabLabels) as ResultTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                className={`workspace-tab ${activeTab === tab ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>

          <div className="workspace-tab-panel">
            {activeTab === 'overview' ? (
              <div className="workspace-panel-grid three-col">
                <article className="workspace-panel-card">
                  <h3>환자 / 케이스 요약</h3>
                  <ul className="detail-list compact-list">
                    <li>암종: LUAD (prototype)</li>
                    <li>병기: {result.normalized_input.clinical.pathologic_stage ?? '미입력'}</li>
                    <li>주요 임상 변수: {patientSummary.clinicalSummary.join(' · ') || '입력된 임상정보 없음'}</li>
                    <li>주요 유전체 포인트: {patientSummary.geneNames.join(', ') || '없음'}</li>
                    <li>입력 데이터 품질 상태: {confidenceLevel}</li>
                  </ul>
                </article>

                <article className="workspace-panel-card">
                  <h3>모델 결과</h3>
                  <div className="summary-list">
                    <div>
                      <dt>위험도 점수</dt>
                      <dd>{result.result.summary.risk_score.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt>구간</dt>
                      <dd>{result.result.summary.risk_level}</dd>
                    </div>
                    <div>
                      <dt>기준선 대비</dt>
                      <dd>
                        {result.result.summary.risk_score >= 0.66
                          ? '기준선 대비 높음'
                          : result.result.summary.risk_score >= 0.33
                            ? '기준선 대비 중간'
                            : '기준선 대비 낮음'}
                      </dd>
                    </div>
                  </div>

                  <div className="survival-curve-card">
                    <svg viewBox="0 0 100 100" className="survival-curve-svg" role="img" aria-label={curve.label}>
                      <line x1="0" y1="50" x2="100" y2="50" className="curve-baseline" />
                      <path d={curvePath} className="curve-path" />
                    </svg>
                  </div>
                </article>

                <article className="workspace-panel-card">
                  <h3>해석 패널</h3>
                  <ul className="detail-list">
                    {increaseFactors.slice(0, 3).map((factor) => (
                      <li key={factor.label}>
                        <strong>{factor.label}</strong> · {factor.note}
                      </li>
                    ))}
                  </ul>
                  <p>{clinicianSummary}</p>
                </article>
              </div>
            ) : null}

            {activeTab === 'evidence' ? (
              <div className="workspace-panel-grid">
                <article className="workspace-panel-card">
                  <h3>영향 변수 상세</h3>
                  <div className="workspace-factor-list">
                    {[...increaseFactors, ...decreaseFactors].map((factor) => (
                      <div key={factor.label} className="workspace-factor-card">
                        <strong>{factor.label}</strong>
                        <span>{factor.direction}</span>
                        <span>상대 중요도 {factor.weight.toFixed(2)}</span>
                        <p>{factor.note}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="workspace-panel-card wide-card">
                  <h3>입력값 상세 / 근거 문장</h3>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>gene</th>
                          <th>variant_classification</th>
                          <th>반영 방향</th>
                          <th>설명 메모</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variantRows.map((row) => (
                          <tr key={`${row.gene}-${row.variant_classification}`}>
                            <td>{row.gene}</td>
                            <td>{row.variant_classification}</td>
                            <td>{row.direction}</td>
                            <td>{row.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              </div>
            ) : null}

            {activeTab === 'patient' ? (
              <div className="workspace-panel-grid">
                <article className="workspace-panel-card">
                  <h3>쉬운 언어로 바꾼 설명</h3>
                  <p>{patientSummaryText}</p>
                </article>

                <article className="workspace-panel-card">
                  <h3>환자용 주의문</h3>
                  <ul className="detail-list">
                    <li>이 결과는 확정 진단이 아니라 위험 예측 보조정보입니다.</li>
                    <li>향후 경과 관찰과 추가 판단이 중요합니다.</li>
                    <li>담당 전문의의 설명과 함께 이해하는 것이 가장 중요합니다.</li>
                  </ul>
                </article>

                <article className="workspace-panel-card">
                  <h3>상담 시 사용 가능한 문장</h3>
                  <p>
                    현재 검사 결과를 종합하면 재발 가능성을 주의 깊게 볼 필요가 있습니다. 이는 확정적인
                    재발을 의미하는 것은 아니며, 향후 경과 관찰과 추가 판단이 중요합니다.
                  </p>
                  <div className="button-row">
                    <button type="button" className="secondary-button" onClick={onDownloadClinicianSummary}>
                      요약 복사/저장
                    </button>
                    <button type="button" className="primary-button" onClick={onOpenExplanation}>
                      환자 설명 화면 열기
                    </button>
                  </div>
                </article>
              </div>
            ) : null}

            {activeTab === 'export' ? (
              <div className="workspace-panel-grid">
                <article className="workspace-panel-card">
                  <h3>리포트 / 내보내기</h3>
                  <ul className="detail-list">
                    <li>PDF 다운로드</li>
                    <li>케이스 저장</li>
                    <li>요약 복사</li>
                    <li>결과 JSON 보기</li>
                  </ul>
                </article>

                <article className="workspace-panel-card">
                  <h3>시점별 예후 요약</h3>
                  <div className="workspace-timepoint-grid">
                    {timepointCards.map((timepoint) => (
                      <div key={timepoint.label} className="workspace-timepoint-card">
                        <span>{timepoint.label}</span>
                        <strong>{Math.round(timepoint.value * 100)}%</strong>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="workspace-panel-card">
                  <h3>다음 액션</h3>
                  <div className="button-row">
                    <button type="button" className="secondary-button" onClick={onSavePdf}>
                      PDF 다운로드
                    </button>
                    <button type="button" className="secondary-button" onClick={onSaveImage}>
                      이미지 저장
                    </button>
                    <button type="button" className="secondary-button" onClick={onDownloadJson}>
                      결과 JSON 보기
                    </button>
                    <button type="button" className="primary-button" onClick={onOpenReport}>
                      리포트 화면 열기
                    </button>
                  </div>
                </article>
              </div>
            ) : null}
          </div>
        </section>

        <section className="workspace-action-bar">
          <button type="button" className="secondary-button" onClick={onBackToUpload}>
            다른 환자 업로드
          </button>
          <button type="button" className="secondary-button" onClick={onSavePdf}>
            결과 요약 PDF 저장
          </button>
          <button type="button" className="secondary-button" onClick={onSaveImage}>
            이미지로 저장
          </button>
          <button type="button" className="secondary-button" onClick={onDownloadJson}>
            결과 JSON 보기
          </button>
          <button type="button" className="primary-button" onClick={onOpenExplanation}>
            환자 설명 생성
          </button>
        </section>
      </section>
    </main>
  );
}
