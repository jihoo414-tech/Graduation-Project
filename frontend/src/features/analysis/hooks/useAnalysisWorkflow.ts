import { useState, type FormEvent } from 'react';
import { normalizeUnknownError } from '../../../shared/api/errors';
import { uploadModelFiles } from '../api/inference';
import { emptyClinicalDraft, isValidClinicalDraft, toBirthDate, type ClinicalDraft } from '../model/clinicalInput';
import type { ResultEnvelope } from '../model/result';

type Phase = 'dashboard' | 'input' | 'analyzing' | 'result';
type ResultBackTarget = 'analysis' | 'dashboard';
type AppErrorMessage = ReturnType<typeof normalizeUnknownError>;

export function useAnalysisWorkflow(accessToken: string | undefined) {
  const [phase, setPhase] = useState<Phase>('input');
  const [mutationFile, setMutationFile] = useState<File | null>(null);
  const [expressionFile, setExpressionFile] = useState<File | null>(null);
  const [inputStep, setInputStep] = useState<1 | 2>(1);
  const [clinicalDraft, setClinicalDraft] = useState<ClinicalDraft>(emptyClinicalDraft);
  const [result, setResult] = useState<ResultEnvelope | null>(null);
  const [resultBackTarget, setResultBackTarget] = useState<ResultBackTarget>('analysis');
  const [error, setError] = useState<AppErrorMessage | null>(null);

  const resetAnalysis = () => {
    setPhase('input');
    setMutationFile(null);
    setExpressionFile(null);
    setInputStep(1);
    setClinicalDraft(emptyClinicalDraft);
    setResult(null);
    setResultBackTarget('analysis');
    setError(null);
  };

  const showDashboard = () => {
    setPhase('dashboard');
    setError(null);
  };

  const openSavedResult = (savedResult: ResultEnvelope) => {
    setResult(savedResult);
    setResultBackTarget('dashboard');
    setError(null);
    setPhase('result');
  };

  const updateClinicalDraft = (patch: Partial<ClinicalDraft>) => {
    setClinicalDraft((draft) => ({ ...draft, ...patch }));
  };

  const continueToFiles = () => {
    if (!isValidClinicalDraft(clinicalDraft)) {
      setError({ message: '입력값을 다시 확인해 주세요.' });
      return;
    }

    setError(null);
    setInputStep(2);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) {
      setError({ message: '분석 결과 저장을 위해 먼저 로그인해 주세요.' });
      return;
    }
    if (!mutationFile || !expressionFile) {
      setError({ message: '돌연변이 CSV와 RNA-seq CSV를 모두 선택해 주세요.' });
      return;
    }

    try {
      setError(null);
      setPhase('analyzing');
      const response = await uploadModelFiles(
        mutationFile,
        expressionFile,
        {
          birthDate: toBirthDate(clinicalDraft),
          gender: clinicalDraft.gender,
          stage: clinicalDraft.stage,
        },
        accessToken,
      );
      setResult(response);
      setResultBackTarget('analysis');
      setPhase('result');
    } catch (unknownError) {
      setError(normalizeUnknownError(unknownError));
      setPhase('input');
    }
  };


  return {
    phase, result, resultBackTarget, resetAnalysis, showDashboard, openSavedResult,
    inputProps: {
      mutationFile, expressionFile, inputStep, clinicalDraft, error,
      onMutationFileChange: setMutationFile,
      onExpressionFileChange: setExpressionFile,
      onClinicalChange: updateClinicalDraft,
      onContinue: continueToFiles,
      onBack: () => setInputStep(1),
      onSubmit: submit,
      onDismissError: () => setError(null),
    },
  };
}
