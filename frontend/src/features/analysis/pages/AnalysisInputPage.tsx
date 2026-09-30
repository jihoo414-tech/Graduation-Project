import type { FormEvent } from 'react';
import { ErrorAlert } from '../../../shared/ui/ErrorAlert';
import type { BackendError } from '../../../shared/api/errors';
import { ClinicalStep } from '../components/ClinicalStep';
import { FileUploadStep } from '../components/FileUploadStep';
import { PatientSelectionStep } from '../components/PatientSelectionStep';
import type { ClinicalDraft } from '../model/clinicalInput';

type AnalysisInputPageProps = {
  accessToken: string;
  mutationFile: File | null;
  expressionFile: File | null;
  inputStep: 1 | 2 | 3;
  selectedPatientId: string;
  clinicalDraft: ClinicalDraft;
  error: BackendError | null;
  onPatientSelect: (patientId: string) => void;
  onPatientContinue: () => void;
  onMutationFileChange: (file: File | null) => void;
  onExpressionFileChange: (file: File | null) => void;
  onClinicalChange: (patch: Partial<ClinicalDraft>) => void;
  onContinue: () => void;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDismissError: () => void;
  onDashboard: () => void;
};

export function AnalysisInputPage({
  accessToken, mutationFile, expressionFile, inputStep, clinicalDraft, error, selectedPatientId,
  onPatientSelect, onPatientContinue,
  onMutationFileChange, onExpressionFileChange, onClinicalChange,
  onContinue, onBack, onSubmit, onDismissError, onDashboard,
}: AnalysisInputPageProps) {
  return (
    <main className="product-shell authenticated-content analysis-page">
      <section className="workspace-page-shell analysis-page-shell">
        <header className="workspace-page-header">
          <div>
            <p className="workspace-page-kicker">Analysis</p>
            <h1>새 분석</h1>
            <p>임상 정보와 CSV 파일을 입력하면 Cox, RSF, DeepSurv 앙상블 결과를 계산하고 저장합니다.</p>
          </div>
        </header>

        <ol className="analysis-progress-steps" aria-label="분석 입력 단계">
          <li className={inputStep === 1 ? 'is-active' : 'is-complete'}>
            <span>1</span>
            <strong>환자 선택</strong>
          </li>
          <li className={inputStep === 2 ? 'is-active' : inputStep === 3 ? 'is-complete' : ''}>
            <span>2</span>
            <strong>임상 정보</strong>
          </li>
          <li className={inputStep === 3 ? 'is-active' : ''}>
            <span>3</span>
            <strong>파일 업로드</strong>
          </li>
        </ol>

        <form className="upload-form" onSubmit={onSubmit}>
          {inputStep === 1 ? (
            <PatientSelectionStep
              accessToken={accessToken}
              selectedPatientId={selectedPatientId}
              onSelect={onPatientSelect}
              onContinue={onPatientContinue}
              onDashboard={onDashboard}
            />
          ) : inputStep === 2 ? (
            <ClinicalStep
              draft={clinicalDraft}
              onChange={onClinicalChange}
              onContinue={onContinue}
              onDashboard={onDashboard}
            />
          ) : (
            <FileUploadStep
              mutationFile={mutationFile}
              expressionFile={expressionFile}
              onMutationFileChange={onMutationFileChange}
              onExpressionFileChange={onExpressionFileChange}
              onBack={onBack}
            />
          )}
        </form>
      </section>
      {error && <ErrorAlert message={error.message} onDismiss={onDismissError} />}
    </main>
  );
}
