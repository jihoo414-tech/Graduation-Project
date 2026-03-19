import type { ChangeEventHandler, MouseEventHandler } from 'react';
import type { CaseDraft, JourneyContext, SupportedInputMethod } from '../../lib/demoJourney';

type CaseBuilderPageProps = {
  draft: CaseDraft;
  journeyContext: JourneyContext;
  activeStep: number;
  supportedInputMethods: readonly SupportedInputMethod[];
  futureInputMethods: readonly { label: string; note: string }[];
  onFieldChange: ChangeEventHandler<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
  onToggleExplanation: MouseEventHandler<HTMLButtonElement>;
  onSelectStep: (step: number) => void;
  onSaveAndExit: MouseEventHandler<HTMLButtonElement>;
  onContinueToUpload: MouseEventHandler<HTMLButtonElement>;
};

const steps = ['기본 정보', '데이터 입력 방식 선택', '유전체/검사 정보', '분석 옵션'];

const stepNotes = [
  '케이스 식별과 기본 임상 정보를 먼저 정리합니다.',
  '입력 방식은 수동 입력, CSV, 유전체 파일, 샘플 테스트로 구분합니다.',
  '설명에 직접 영향을 주는 유전체 및 병리 요약을 배치합니다.',
  '재발 위험 분석과 설명 생성 여부를 마지막에 확정합니다.',
];

export function CaseBuilderPage({
  draft,
  journeyContext,
  activeStep,
  supportedInputMethods,
  futureInputMethods,
  onFieldChange,
  onToggleExplanation,
  onSelectStep,
  onSaveAndExit,
  onContinueToUpload,
}: CaseBuilderPageProps) {
  return (
    <main className="product-shell">
      <div className="product-page-header">
        <div>
          <p className="workspace-page-kicker">New Case</p>
          <h1>새 케이스 생성</h1>
          <p>한 번에 긴 폼을 몰아넣지 않고, 단계별로 필요한 정보만 채우는 intake 구조입니다.</p>
        </div>
        <div className="workspace-page-status">
          <span>현재 워크플로우</span>
          <strong>{journeyContext.nextStepLabel}</strong>
        </div>
      </div>

      <div className="builder-layout">
        <aside className="builder-step-nav">
          {steps.map((stepLabel, index) => (
            <button
              key={stepLabel}
              type="button"
              className={`builder-step-link ${index === activeStep ? 'is-active' : ''}`}
              onClick={() => onSelectStep(index)}
            >
              <span>Step {index + 1}</span>
              <strong>{stepLabel}</strong>
            </button>
          ))}

          <article className="builder-progress-card">
            <p className="marketing-kicker">Active step</p>
            <h3>{steps[activeStep]}</h3>
            <p>{stepNotes[activeStep]}</p>
            <ul className="detail-list compact-list">
              <li>케이스 ID: {draft.caseId}</li>
              <li>암종: {draft.cancerType}</li>
              <li>분석 옵션: {draft.analysisMode}</li>
            </ul>
          </article>
        </aside>

        <section className="builder-form-panel">
          {activeStep === 0 ? (
            <div className="builder-form-grid">
              <label>
                <span>케이스 ID</span>
                <input name="caseId" value={draft.caseId} onChange={onFieldChange} />
              </label>
              <label>
                <span>암종</span>
                <input name="cancerType" value={draft.cancerType} onChange={onFieldChange} />
              </label>
              <label>
                <span>진단 시점</span>
                <input name="diagnosisDate" type="date" value={draft.diagnosisDate} onChange={onFieldChange} />
              </label>
              <label>
                <span>병기</span>
                <input name="stage" value={draft.stage} onChange={onFieldChange} />
              </label>
              <label>
                <span>환자 연령</span>
                <input name="age" value={draft.age} onChange={onFieldChange} />
              </label>
              <label>
                <span>성별</span>
                <input name="gender" value={draft.gender} onChange={onFieldChange} />
              </label>
            </div>
          ) : null}

          {activeStep === 1 ? (
            <div className="builder-form-grid">
              <label>
                <span>데이터 입력 방식</span>
                <select name="inputMethod" value={draft.inputMethod} onChange={onFieldChange}>
                  {supportedInputMethods.map((inputMethod) => (
                    <option key={inputMethod} value={inputMethod}>
                      {inputMethod}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>유전체 결과 파일 유형</span>
                <input name="genomicSource" value={draft.genomicSource} onChange={onFieldChange} />
              </label>
              <article className="workspace-info-card builder-future-card">
                <h2>다음 단계에서 확장할 입력 경로</h2>
                <ul className="detail-list">
                  {futureInputMethods.map((item) => (
                    <li key={item.label}>
                      <strong>{item.label}</strong> — {item.note}
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          ) : null}

          {activeStep === 2 ? (
            <div className="builder-form-grid">
              <label>
                <span>주요 변이 / 발현 / 패널 결과</span>
                <textarea
                  name="genomicSource"
                  rows={4}
                  value={draft.genomicSource}
                  onChange={onFieldChange}
                />
              </label>
              <label>
                <span>바이오마커</span>
                <textarea
                  name="biomarkerSummary"
                  rows={4}
                  value={draft.biomarkerSummary}
                  onChange={onFieldChange}
                />
              </label>
              <label>
                <span>병리 소견 요약</span>
                <textarea
                  name="pathologySummary"
                  rows={4}
                  value={draft.pathologySummary}
                  onChange={onFieldChange}
                />
              </label>
            </div>
          ) : null}

          {activeStep === 3 ? (
            <div className="builder-form-grid">
              <label>
                <span>분석 옵션</span>
                <select name="analysisMode" value={draft.analysisMode} onChange={onFieldChange}>
                  <option value="기본 분석">기본 분석</option>
                  <option value="재발 위험 예측">재발 위험 예측</option>
                </select>
              </label>
              <div className="builder-toggle-card">
                <span>설명 생성 포함 여부</span>
                <button
                  type="button"
                  className={`workspace-tab ${draft.includeExplanation ? 'is-active' : ''}`}
                  onClick={onToggleExplanation}
                >
                  {draft.includeExplanation ? '포함' : '미포함'}
                </button>
              </div>
            </div>
          ) : null}

          <div className="button-row">
            <button type="button" className="secondary-button" onClick={onSaveAndExit}>
              저장 후 나가기
            </button>
            <button type="button" className="primary-button" onClick={onContinueToUpload}>
              {activeStep < steps.length - 1 ? '다음 단계' : '분석 시작'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
