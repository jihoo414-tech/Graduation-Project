import type { ChangeEventHandler, DragEventHandler, FormEventHandler, MouseEventHandler } from 'react';
import type {
  ActionFeedback,
  JourneyContext,
} from '../../lib/demoJourney';
import type { ContractExamplesResponse, ResultEnvelope } from '../../lib/types';
import { buildPatientInputSummary } from '../../lib/workspace';

type UploadPageProps = {
  caseId: string;
  journeyContext: JourneyContext;
  viewState: 'idle' | 'loading' | 'success' | 'error';
  selectedFileLabel: string;
  isDragActive: boolean;
  contractExamples: ContractExamplesResponse | null;
  contractExamplesError: string | null;
  result: ResultEnvelope | null;
  actionFeedback: ActionFeedback | null;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
  onDragEnter: DragEventHandler<HTMLLabelElement>;
  onDragOver: DragEventHandler<HTMLLabelElement>;
  onDragLeave: DragEventHandler<HTMLLabelElement>;
  onDrop: DragEventHandler<HTMLLabelElement>;
  onDownloadCsv: MouseEventHandler<HTMLButtonElement>;
  onDownloadJson: MouseEventHandler<HTMLButtonElement>;
  onUseSampleData: MouseEventHandler<HTMLButtonElement>;
  onResetInput: MouseEventHandler<HTMLButtonElement>;
  onConfirmAnalysis: MouseEventHandler<HTMLButtonElement>;
};

export function UploadPage({
  caseId,
  journeyContext,
  viewState,
  selectedFileLabel,
  isDragActive,
  contractExamples,
  contractExamplesError,
  result,
  actionFeedback,
  onSubmit,
  onFileChange,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onDownloadCsv,
  onDownloadJson,
  onUseSampleData,
  onResetInput,
  onConfirmAnalysis,
}: UploadPageProps) {
  const inputSummary = result ? buildPatientInputSummary(result) : null;

  return (
    <main className="workspace-main">
      <section className="workspace-page-shell">
        <div className="workspace-page-header">
          <div>
            <p className="workspace-page-kicker">PAGE 1</p>
            <h1>데이터 입력 / 업로드</h1>
            <p>
              케이스 {caseId}에 대해 비식별 환자 데이터(CSV/JSON)를 업로드하고 모델 입력 전 내용을 확인합니다.
            </p>
          </div>
          <div className="workspace-page-status">
            <span>현재 단계</span>
            <strong>{journeyContext.statusLabel}</strong>
          </div>
        </div>

        {actionFeedback ? (
          <div className={`action-feedback-banner action-feedback-${actionFeedback.tone}`} role="status">
            {actionFeedback.message}
          </div>
        ) : null}

        <section className="upload-primary-panel">
          <form className="upload-form" onSubmit={onSubmit}>
            <label
              className={`file-picker ${isDragActive ? 'drag-active' : ''}`}
              htmlFor="patient-file"
              onDragEnter={onDragEnter}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <span>CSV 또는 JSON 선택</span>
              <span className="drop-hint">또는 이 영역으로 파일을 끌어다 놓으세요.</span>
              <input
                id="patient-file"
                name="patient-file"
                type="file"
                accept=".csv,application/json,.json,text/csv"
                onChange={onFileChange}
              />
            </label>

            <div className="file-meta">
              <strong>선택한 파일</strong>
              <span>{selectedFileLabel}</span>
            </div>

            <div className="button-row">
              <button
                type="button"
                className="secondary-button"
                onClick={onDownloadCsv}
                disabled={!contractExamples}
              >
                CSV 예시 다운로드
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={onDownloadJson}
                disabled={!contractExamples}
              >
                JSON 예시 다운로드
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={onUseSampleData}
                disabled={!contractExamples}
              >
                샘플 데이터로 테스트
              </button>
              <button type="submit" className="primary-button" disabled={viewState === 'loading'}>
                {viewState === 'loading' ? '업로드 중…' : '입력 확인 준비'}
              </button>
            </div>
          </form>

          {contractExamplesError ? <p className="muted-text">{contractExamplesError}</p> : null}
        </section>

        {inputSummary ? (
          <section className="input-review-panel">
            <div className="input-review-header">
              <div>
                <p className="workspace-page-kicker">입력 확인 패널</p>
                <h2>모델에 넣기 전 입력 검토</h2>
              </div>
              <p>업로드가 완료되어 입력 검토 정보가 자동으로 표시됩니다.</p>
            </div>

            <div className="input-review-grid">
              <article className="workspace-summary-card">
                <h3>비식별 환자 ID</h3>
                <strong>{inputSummary.patientId}</strong>
              </article>

              <article className="workspace-summary-card">
                <h3>변이 개수</h3>
                <strong>{inputSummary.variantCount}</strong>
              </article>

              <article className="workspace-summary-card">
                <h3>주요 유전자 목록</h3>
                <strong>{inputSummary.geneNames.join(', ') || '없음'}</strong>
              </article>

              <article className="workspace-summary-card">
                <h3>임상정보 요약</h3>
                <strong>{inputSummary.clinicalSummary.join(' · ') || '입력된 임상정보 없음'}</strong>
              </article>
            </div>

            <article className="workspace-review-notes">
              <h3>누락값 / 경고</h3>
              {inputSummary.warnings.length > 0 ? (
                <ul className="detail-list">
                  {inputSummary.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted-text">현재 입력 기준으로 별도 경고가 없습니다.</p>
              )}
            </article>

            <div className="button-row">
              <button type="button" className="secondary-button" onClick={onResetInput}>
                입력 다시 선택
              </button>
              <button type="button" className="primary-button" onClick={onConfirmAnalysis}>
                분석 실행
              </button>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
