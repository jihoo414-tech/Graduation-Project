import type { FormEvent } from 'react';
import { ErrorAlert } from '../../../shared/ui/ErrorAlert';
import type { BackendError } from '../../../shared/api/errors';
import { ClinicalStep } from '../components/ClinicalStep';
import { FileUploadStep } from '../components/FileUploadStep';
import type { ClinicalDraft } from '../model/clinicalInput';

type AnalysisInputPageProps = {
  mutationFile: File | null;
  expressionFile: File | null;
  inputStep: 1 | 2;
  clinicalDraft: ClinicalDraft;
  error: BackendError | null;
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
  mutationFile, expressionFile, inputStep, clinicalDraft, error,
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

        <form className="upload-form" onSubmit={onSubmit}>
          {inputStep === 1 ? (
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
