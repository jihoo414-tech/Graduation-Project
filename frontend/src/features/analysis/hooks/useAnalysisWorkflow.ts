import { useState, type FormEvent } from 'react';
import { normalizeUnknownError } from '../../../shared/api/errors';
import { uploadModelFiles } from '../api/inference';
import { emptyClinicalDraft, isValidClinicalDraft, toBirthDate, type ClinicalDraft } from '../model/clinicalInput';
import type { ResultEnvelope } from '../model/result';

type Phase = 'dashboard' | 'input' | 'analyzing' | 'result';
type ResultBackTarget = 'analysis' | 'dashboard';
type AppErrorMessage = ReturnType<typeof normalizeUnknownError>;

export function useAnalysisWorkflow(accessToken: string | undefined) {
  const [phase, setPhase] = useState<Phase>('dashboard');
  const [mutationFile, setMutationFile] = useState<File | null>(null);
  const [expressionFile, setExpressionFile] = useState<File | null>(null);
  const [inputStep, setInputStep] = useState<1 | 2 | 3>(1);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [clinicalDraft, setClinicalDraft] = useState<ClinicalDraft>(emptyClinicalDraft);
  const [result, setResult] = useState<ResultEnvelope | null>(null);
  const [resultBackTarget, setResultBackTarget] = useState<ResultBackTarget>('analysis');
  const [error, setError] = useState<AppErrorMessage | null>(null);

  const resetAnalysis = () => {
    setPhase('input');
    setMutationFile(null);
    setExpressionFile(null);
    setInputStep(1);
    setSelectedPatientId('');
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

  const startAnalysis = (patientId = '') => {
    resetAnalysis();
    setSelectedPatientId(patientId);
  };

  const continueToClinical = () => {
    if (!selectedPatientId) {
      setError({ message: '분석 결과를 등록할 환자를 선택해 주세요.' });
      return;
    }
    setError(null);
    setInputStep(2);
  };

  const continueToFiles = () => {
    if (!isValidClinicalDraft(clinicalDraft)) {
      setError({ message: '입력값을 다시 확인해 주세요.' });
      return;
    }

    setError(null);
    setInputStep(3);
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
    if (!selectedPatientId) {
      setError({ message: '분석 결과를 등록할 환자를 선택해 주세요.' });
      setInputStep(1);
      return;
    }

    try {
      setError(null);
      setPhase('analyzing');
      const response = await uploadModelFiles(
        mutationFile,
        expressionFile,
        {
          patientId: selectedPatientId,
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
    phase, result, resultBackTarget, resetAnalysis, startAnalysis, showDashboard, openSavedResult,
    inputProps: {
      accessToken: accessToken ?? '',
      mutationFile, expressionFile, inputStep, clinicalDraft, error, selectedPatientId,
      onPatientSelect: setSelectedPatientId,
      onPatientContinue: continueToClinical,
      onMutationFileChange: setMutationFile,
      onExpressionFileChange: setExpressionFile,
      onClinicalChange: updateClinicalDraft,
      onContinue: continueToFiles,
      onBack: () => setInputStep((step) => (step === 3 ? 2 : 1)),
      onSubmit: submit,
      onDismissError: () => setError(null),
    },
  };
}
