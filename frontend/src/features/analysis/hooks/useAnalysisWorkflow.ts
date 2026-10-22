import { useRef, useState, type FormEvent } from 'react';
import { useBrowserHistoryState } from '../../../shared/hooks/useBrowserHistoryState';
import { normalizeUnknownError } from '../../../shared/api/errors';
import { uploadModelFiles } from '../api/inference';
import { emptyClinicalDraft, isValidClinicalDraft, toBirthDate, type ClinicalDraft } from '../model/clinicalInput';
import type { ResultEnvelope } from '../model/result';

type Phase = 'dashboard' | 'input' | 'analyzing' | 'result';
type ResultBackTarget = 'analysis' | 'dashboard';
type AppErrorMessage = ReturnType<typeof normalizeUnknownError>;
type NavigationState = {
  draftId: string;
  phase: Phase;
  inputStep: 1 | 2 | 3;
  result: ResultEnvelope | null;
  resultBackTarget: ResultBackTarget;
};
const initialNavigation: NavigationState = {
  draftId: '', phase: 'dashboard', inputStep: 1, result: null, resultBackTarget: 'dashboard',
};
type AnalysisDraft = {
  mutationFile: File | null;
  expressionFile: File | null;
  selectedPatientId: string;
  clinicalDraft: ClinicalDraft;
};
const emptyDraft: AnalysisDraft = {
  mutationFile: null, expressionFile: null, selectedPatientId: '', clinicalDraft: emptyClinicalDraft,
};

export function useAnalysisWorkflow(accessToken: string | undefined) {
  const { value: navigation, navigate, replaceEntry, hasEntry } = useBrowserHistoryState(initialNavigation, !!accessToken);
  const { phase, inputStep, result, resultBackTarget } = navigation;
  const pending = useRef('');
  const go = (patch: Partial<NavigationState>) => {
    const next = { ...navigation, ...patch };
    if (next.phase === phase && next.inputStep === inputStep && next.result === result
      && next.resultBackTarget === resultBackTarget && next.draftId === navigation.draftId) return '';
    return navigate(next);
  };
  const [drafts, setDrafts] = useState<Record<string, AnalysisDraft>>({});
  const { mutationFile, expressionFile, selectedPatientId, clinicalDraft } = drafts[navigation.draftId] ?? emptyDraft;
  const updateDraft = (patch: Partial<AnalysisDraft>) => {
    setDrafts((previous) => ({
      ...previous,
      [navigation.draftId]: { ...(previous[navigation.draftId] ?? emptyDraft), ...patch },
    }));
  };
  const [error, setError] = useState<AppErrorMessage | null>(null);

  const resetAnalysis = () => {
    setDrafts({});
    setError(null);
  };

  const showDashboard = () => {
    go({ phase: 'dashboard', result: null, resultBackTarget: 'dashboard' });
    setError(null);
  };

  const openSavedResult = (savedResult: ResultEnvelope) => {
    setError(null);
    go({ phase: 'result', result: savedResult, resultBackTarget: 'dashboard' });
  };

  const updateClinicalDraft = (patch: Partial<ClinicalDraft>) => {
    updateDraft({ clinicalDraft: { ...clinicalDraft, ...patch } });
  };

  const startAnalysis = (patientId = '') => {
    const draftId = crypto.randomUUID();
    setDrafts((previous) => ({ ...previous, [draftId]: { ...emptyDraft, selectedPatientId: patientId } }));
    setError(null);
    go({ draftId, phase: 'input', inputStep: 1, result: null, resultBackTarget: 'analysis' });
  };

  const continueToClinical = () => {
    if (!selectedPatientId) {
      setError({ message: '분석 결과를 등록할 환자를 선택해 주세요.' });
      return;
    }
    setError(null);
    go({ inputStep: 2 });
  };

  const continueToFiles = () => {
    if (!isValidClinicalDraft(clinicalDraft)) {
      setError({ message: '입력값을 다시 확인해 주세요.' });
      return;
    }

    setError(null);
    go({ inputStep: 3 });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current && hasEntry(pending.current)) {
      setError({ message: '분석이 이미 진행 중입니다. 완료될 때까지 기다려 주세요.' });
      return;
    }
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
      go({ inputStep: 1 });
      return;
    }
    // Browser forward navigation must not bypass validation after editing an earlier step.
    if (!isValidClinicalDraft(clinicalDraft)) {
      setError({ message: '입력값을 다시 확인해 주세요.' });
      go({ inputStep: 2 });
      return;
    }

    setError(null);
    const entryId = go({ phase: 'analyzing' });
    pending.current = entryId;
    try {
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
      // Resolve the pending entry even if the user has navigated away from it.
      replaceEntry(entryId, { ...navigation, phase: 'result', result: response, resultBackTarget: 'analysis' });
    } catch (unknownError) {
      if (replaceEntry(entryId, { ...navigation, phase: 'input' })) {
        setError(normalizeUnknownError(unknownError));
      }
    } finally {
      if (pending.current === entryId) pending.current = '';
    }
  };


  return {
    phase, result, resultBackTarget, resetAnalysis, startAnalysis, showDashboard, openSavedResult,
    inputProps: {
      accessToken: accessToken ?? '',
      mutationFile, expressionFile, inputStep, clinicalDraft, error, selectedPatientId,
      onPatientSelect: (selectedPatientId: string) => updateDraft({ selectedPatientId }),
      onPatientContinue: continueToClinical,
      onMutationFileChange: (mutationFile: File | null) => updateDraft({ mutationFile }),
      onExpressionFileChange: (expressionFile: File | null) => updateDraft({ expressionFile }),
      onClinicalChange: updateClinicalDraft,
      onContinue: continueToFiles,
      onBack: () => go({ inputStep: inputStep === 3 ? 2 : 1 }),
      onSubmit: submit,
      onDismissError: () => setError(null),
    },
  };
}
