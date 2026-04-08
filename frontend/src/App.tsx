import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ErrorAlert } from './components/ErrorAlert';
import { AppSidebar } from './components/product/AppSidebar';
import { AnalyzingPage } from './components/product/AnalyzingPage';
import { CaseBuilderPage } from './components/product/CaseBuilderPage';
import { CasesPage } from './components/product/CasesPage';
import { DashboardPage } from './components/product/DashboardPage';
import { ExplanationPage } from './components/product/ExplanationPage';
import { ReportPage } from './components/product/ReportPage';
import { ResultWorkspace } from './components/workspace/ResultWorkspace';
import { UploadPage } from './components/workspace/UploadPage';
import {
  fetchContractExamples,
  normalizeUnknownError,
  uploadPatientFile,
} from './lib/api';
import {
  ANALYSIS_STEP_INTERVAL_MS,
  analysisSteps,
  buildCasePaths,
  buildJourneyContext,
  defaultReportStage,
  defaultCaseDraft,
  defaultDemoSession,
  deriveCaseStatus,
  FIXED_CANCER_TYPE,
  futureInputMethodCards,
  initialRecentCases,
  normalizePathname,
  supportedInputMethods,
  upsertRecentCase,
  type ActionFeedback,
  type CaseDraft,
  type ReportStage,
  type ViewState,
} from './lib/demoJourney';
import {
  clearPersistedWorkspaceState,
  loadPersistedWorkspaceState,
  persistWorkspaceState,
} from './lib/persistence';
import type { ContractExamplesResponse, ResultEnvelope } from './lib/types';
import { buildClinicianSummary } from './lib/workspace';

const supportedUploadExtensions = ['.csv', '.json'];

const getClientUploadError = (file: File) => {
  const lowerName = file.name.toLowerCase();
  const hasSupportedExtension = supportedUploadExtensions.some((extension) => lowerName.endsWith(extension));
  const isSupportedType =
    file.type === '' ||
    file.type === 'text/csv' ||
    file.type === 'application/csv' ||
    file.type === 'application/json';

  if (!hasSupportedExtension || !isSupportedType) {
    return {
      code: 'UNSUPPORTED_FILE_TYPE',
      message: '지원되는 파일 형식은 CSV와 JSON입니다.',
      details: [{ field: 'file', rule: 'content_type' }],
    };
  }

  if (file.size === 0) {
    return {
      code: 'MALFORMED_FILE',
      message: '비어 있는 파일은 업로드할 수 없습니다.',
      details: [{ field: 'file', rule: 'non_empty' }],
    };
  }

  return null;
};

const buildSamplePatientFile = (contractExamples: ContractExamplesResponse) =>
  new File([JSON.stringify(contractExamples.json_example, null, 2)], 'sample-patient.json', {
    type: 'application/json',
  });

const downloadText = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const saveWorkspaceSnapshotAsImage = (result: ResultEnvelope) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 900;
  const context = canvas.getContext('2d');

  if (!context) {
    return false;
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#111111';
  context.fillRect(60, 60, 1280, 180);

  context.fillStyle = '#ffffff';
  context.font = 'bold 56px Inter, system-ui, sans-serif';
  context.fillText('결과 대시보드 스냅샷', 96, 140);
  context.font = '28px Inter, system-ui, sans-serif';
  context.fillText(`환자 ID ${result.patient.deidentified_patient_id}`, 96, 190);

  context.fillStyle = '#111111';
  context.font = 'bold 34px Inter, system-ui, sans-serif';
  context.fillText(`위험군: ${result.result.summary.risk_level}`, 96, 320);
  context.fillText(`위험 점수: ${result.result.summary.risk_score.toFixed(2)}`, 96, 372);

  context.font = '28px Inter, system-ui, sans-serif';
  context.fillText(result.result.summary.text, 96, 444, 1180);

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${result.patient.deidentified_patient_id}-result-dashboard.png`;
  link.click();

  return true;
};

function App() {
  const persistedWorkspaceState = useMemo(() => loadPersistedWorkspaceState(), []);
  const [pathname, setPathname] = useState(() => normalizePathname(window.location.pathname));
  const [session, setSession] = useState(persistedWorkspaceState.session ?? defaultDemoSession);
  const [caseDraft, setCaseDraft] = useState<CaseDraft>(() => ({
    ...defaultCaseDraft,
    ...persistedWorkspaceState.caseDraft,
    cancerType: FIXED_CANCER_TYPE,
    stage: '',
  }));
  const [caseBuilderStep, setCaseBuilderStep] = useState(persistedWorkspaceState.caseBuilderStep ?? 0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [result, setResult] = useState<ResultEnvelope | null>(persistedWorkspaceState.result ?? null);
  const [error, setError] = useState<ReturnType<typeof normalizeUnknownError> | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [contractExamples, setContractExamples] = useState<ContractExamplesResponse | null>(null);
  const [contractExamplesError, setContractExamplesError] = useState<string | null>(null);
  const [recentCases, setRecentCases] = useState(() =>
    (persistedWorkspaceState.recentCases ?? initialRecentCases).map((caseItem) => ({
      ...caseItem,
      cancerType: FIXED_CANCER_TYPE,
    })),
  );
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [reportStage, setReportStage] = useState<ReportStage>(
    persistedWorkspaceState.reportStage ?? defaultReportStage,
  );
  const [shouldAutoUploadSample, setShouldAutoUploadSample] = useState(false);

  const activeCaseId = caseDraft.caseId.trim() || defaultCaseDraft.caseId;
  const casePaths = useMemo(() => buildCasePaths(activeCaseId), [activeCaseId]);
  const journeyContext = useMemo(
    () =>
      buildJourneyContext({
        draft: caseDraft,
        session,
        pathname,
        casePaths,
        result,
      }),
    [caseDraft, session, pathname, casePaths, result],
  );

  const navigate = (nextPath: string, options?: { replace?: boolean }) => {
    const normalizedPath = normalizePathname(nextPath);

    if (options?.replace) {
      window.history.replaceState({}, '', normalizedPath);
    } else {
      window.history.pushState({}, '', normalizedPath);
    }

    setPathname(normalizedPath);
  };

  const notifyAction = (message: string, tone: ActionFeedback['tone'] = 'success') => {
    setActionFeedback({ tone, message });
  };

  const dismissError = () => {
    setError(null);
    setViewState('idle');
  };

  useEffect(() => {
    const normalizedPath = normalizePathname(window.location.pathname);

    if (normalizedPath !== window.location.pathname) {
      window.history.replaceState({}, '', normalizedPath);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(normalizePathname(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!actionFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActionFeedback(null);
    }, 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [actionFeedback]);

  useEffect(() => {
    let active = true;

    void fetchContractExamples()
      .then((payload) => {
        if (active) {
          setContractExamples(payload);
          setContractExamplesError(null);
        }
      })
      .catch(() => {
        if (active) {
          setContractExamplesError('샘플 파일은 백엔드가 실행 중일 때 내려받을 수 있습니다.');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    persistWorkspaceState({
      session,
      caseDraft,
      caseBuilderStep,
      recentCases,
      result,
      reportStage,
    });
  }, [session, caseDraft, caseBuilderStep, recentCases, result, reportStage]);

  useEffect(() => {
    if (pathname !== casePaths.analyzing || !result) {
      return;
    }

    setAnalysisStepIndex(0);
    const intervalId = window.setInterval(() => {
      setAnalysisStepIndex((currentIndex) => {
        if (currentIndex >= analysisSteps.length - 1) {
          window.clearInterval(intervalId);
          return currentIndex;
        }

        return currentIndex + 1;
      });
    }, ANALYSIS_STEP_INTERVAL_MS);

    const timeoutId = window.setTimeout(() => {
      navigate(casePaths.result, { replace: true });
      setRecentCases((currentCases) =>
        upsertRecentCase(currentCases, {
          id: activeCaseId,
          cancerType: FIXED_CANCER_TYPE,
          updatedAt: '방금',
          status: deriveCaseStatus('result', result),
        }),
      );
      notifyAction('분석이 완료되어 결과 대시보드가 최신 상태로 업데이트되었습니다.');
    }, analysisSteps.length * ANALYSIS_STEP_INTERVAL_MS + 150);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [pathname, result, casePaths.analyzing, casePaths.result, activeCaseId]);

  useEffect(() => {
    if (
      pathname !== casePaths.upload ||
      caseDraft.inputMethod !== '샘플 데이터로 테스트' ||
      !shouldAutoUploadSample ||
      !contractExamples ||
      viewState !== 'idle' ||
      result
    ) {
      return;
    }

    const sampleFile = buildSamplePatientFile(contractExamples);

    setShouldAutoUploadSample(false);
    void performUpload(sampleFile, '샘플 환자 데이터를 자동으로 업로드해 입력 검토 패널까지 준비했습니다.');
  }, [
    pathname,
    casePaths.upload,
    caseDraft.inputMethod,
    shouldAutoUploadSample,
    contractExamples,
    viewState,
    result,
  ]);

  const assignSelectedFile = (file: File | null) => {
    setIsDragActive(false);
    if (file) {
      const clientUploadError = getClientUploadError(file);

      if (clientUploadError) {
        setSelectedFile(null);
        setError(clientUploadError);
        setViewState('error');
        return;
      }
    }

    setSelectedFile(file);

    if (viewState === 'error') {
      setViewState('idle');
      setError(null);
    }
  };

  const resetCaseFlow = () => {
    setSelectedFile(null);
    setViewState('idle');
    setResult(null);
    setError(null);
    setIsDragActive(false);
    setAnalysisStepIndex(0);
    setActionFeedback(null);
    setReportStage(defaultReportStage);
    setShouldAutoUploadSample(false);
  };

  const resetToDashboard = () => {
    clearPersistedWorkspaceState();
    resetCaseFlow();
    setCaseBuilderStep(0);
    setCaseDraft(defaultCaseDraft);
    setSession(defaultDemoSession);
    setRecentCases(initialRecentCases);
    setSearchQuery('');
    navigate('/dashboard');
  };

  const selectedFileLabel = useMemo(() => {
    if (!selectedFile) {
      return '아직 선택한 파일이 없습니다.';
    }

    return `${selectedFile.name} · ${Math.max(selectedFile.size / 1024, 0.1).toFixed(1)} KB`;
  }, [selectedFile]);

  const performUpload = async (file: File, successMessage: string) => {
    setSelectedFile(file);
    setViewState('loading');
    setError(null);
    setResult(null);
    setActionFeedback(null);

    try {
      const response = await uploadPatientFile(file);
      setResult(response);
      setViewState('success');
      notifyAction(successMessage);
    } catch (unknownError) {
      setError(normalizeUnknownError(unknownError));
      setViewState('error');
    }
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      setError({
        code: 'FILE_REQUIRED',
        message: '업로드할 CSV 또는 JSON 파일을 먼저 선택해주세요.',
        details: [{ field: 'file', rule: 'required' }],
      });
      setViewState('error');
      setResult(null);
      return;
    }

    await performUpload(selectedFile, '입력 검토 패널이 준비되었습니다. 내용을 확인한 뒤 분석을 실행하세요.');
  };

  const handleCaseDraftFieldChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;

    setCaseDraft((currentDraft) => ({
      ...currentDraft,
      [name]: value,
    } as CaseDraft));
  };

  const openCaseBuilder = () => {
    setCaseBuilderStep(0);
    setCaseDraft((currentDraft) => ({
      ...currentDraft,
      cancerType: FIXED_CANCER_TYPE,
      stage: '',
      inputMethod: 'CSV/JSON 업로드',
    }));
    navigate('/cases/new');
  };

  const openCasesHome = () => {
    if (recentCases.length > 0) {
      navigate('/cases');
      return;
    }

    openCaseBuilder();
  };

  const sidebarItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Cases', path: '/cases', activePath: '/cases', onClick: openCasesHome },
    { label: 'Reports', path: casePaths.report, activePath: casePaths.report, disabled: !result },
    { label: 'Settings', path: '/settings' },
  ];

  const activeSidebarPath =
    pathname === '/dashboard'
      ? '/dashboard'
      : pathname === '/settings'
        ? '/settings'
        : pathname === casePaths.report
          ? casePaths.report
          : '/cases';

  const resumeCasePath =
    pathname.startsWith('/cases/') && pathname !== '/cases/new'
      ? pathname
      : result
        ? casePaths.result
        : selectedFile || viewState !== 'idle'
          ? casePaths.upload
          : '/cases/new';

  const renderSettingsPage = () => (
    <main className="product-shell">
      <section className="workspace-page-shell">
        <div className="workspace-page-header">
          <div>
            <p className="workspace-page-kicker">Settings</p>
            <h1>설정</h1>
            <p>기관별 관리자 기능, 협업 코멘트, 외부 연동은 이후 단계에서 확장할 수 있습니다.</p>
          </div>
        </div>
      </section>
    </main>
  );

  const renderAuthenticatedPage = () => {
    if (pathname === '/dashboard') {
      return (
        <DashboardPage
          cases={recentCases}
          onStartCase={openCaseBuilder}
          onRunSampleCase={() => {
            resetCaseFlow();
            setCaseDraft((currentDraft) => ({ ...currentDraft, inputMethod: '샘플 데이터로 테스트' }));
            setShouldAutoUploadSample(true);
            navigate(casePaths.upload);
          }}
        />
      );
    }

    if (pathname === '/cases' && recentCases.length > 0) {
      return (
        <CasesPage
          cases={recentCases}
          searchQuery={searchQuery}
          onSearchChange={(event) => {
            setSearchQuery(event.target.value);
          }}
          onResumeActiveCase={() => {
            navigate(resumeCasePath);
          }}
          onCreateNewCase={openCaseBuilder}
        />
      );
    }

    if (pathname === '/cases/new' || (pathname === '/cases' && recentCases.length === 0)) {
      return (
        <CaseBuilderPage
          draft={caseDraft}
          activeStep={caseBuilderStep}
          supportedInputMethods={supportedInputMethods}
          futureInputMethods={futureInputMethodCards}
          onFieldChange={handleCaseDraftFieldChange}
          onToggleExplanation={() => {
            setCaseDraft((currentDraft) => ({
              ...currentDraft,
              includeExplanation: !currentDraft.includeExplanation,
            }));
          }}
          onPreviousStep={() => {
            setCaseBuilderStep((currentStep) => Math.max(currentStep - 1, 0));
          }}
          onSaveAndExit={() => {
            setRecentCases((currentCases) =>
              upsertRecentCase(currentCases, {
                id: activeCaseId,
                cancerType: FIXED_CANCER_TYPE,
                updatedAt: '방금',
                status: '입력 구성 중',
              }),
            );
            navigate('/dashboard');
          }}
          onContinueToUpload={() => {
            if (caseBuilderStep < 3) {
              setCaseBuilderStep((currentStep) => currentStep + 1);
              return;
            }

            resetCaseFlow();
            const isSampleFlow = caseDraft.inputMethod === '샘플 데이터로 테스트';
            setRecentCases((currentCases) =>
              upsertRecentCase(currentCases, {
                id: activeCaseId,
                cancerType: FIXED_CANCER_TYPE,
                updatedAt: '방금',
                status: '업로드 준비',
              }),
            );
            setShouldAutoUploadSample(isSampleFlow);
            navigate(casePaths.upload);
          }}
        />
      );
    }

    if (pathname === casePaths.upload) {
      return (
        <UploadPage
          caseId={activeCaseId}
          journeyContext={journeyContext}
          viewState={viewState}
          selectedFileLabel={selectedFileLabel}
          isDragActive={isDragActive}
          contractExamples={contractExamples}
          contractExamplesError={contractExamplesError}
          result={result}
          actionFeedback={actionFeedback}
          onSubmit={handleUpload}
          onFileChange={(event) => {
            assignSelectedFile(event.target.files?.[0] ?? null);
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (event.currentTarget === event.target) {
              setIsDragActive(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragActive(false);
            assignSelectedFile(event.dataTransfer.files?.[0] ?? null);
          }}
          onDownloadCsv={() => {
            if (!contractExamples) {
              return;
            }

            downloadText('patient-example.csv', contractExamples.csv_example, 'text/csv');
            notifyAction('CSV 예시 파일을 내려받았습니다.');
          }}
          onDownloadJson={() => {
            if (!contractExamples) {
              return;
            }

            downloadText(
              'patient-example.json',
              JSON.stringify(contractExamples.json_example, null, 2),
              'application/json',
            );
            notifyAction('JSON 예시 파일을 내려받았습니다.');
          }}
          onUseSampleData={() => {
            if (!contractExamples) {
              return;
            }

            const sampleFile = buildSamplePatientFile(contractExamples);
            void performUpload(sampleFile, '샘플 환자 데이터를 업로드해 입력 검토 패널까지 준비했습니다.');
          }}
          onResetInput={() => {
            resetCaseFlow();
          }}
          onConfirmAnalysis={() => {
            if (result) {
              navigate(casePaths.analyzing);
            }
          }}
        />
      );
    }

    if (pathname === casePaths.analyzing) {
      return <AnalyzingPage steps={analysisSteps} activeIndex={analysisStepIndex} />;
    }

    if (pathname === casePaths.result && result) {
      return (
        <ResultWorkspace
          result={result}
          journeyContext={journeyContext}
          actionFeedback={actionFeedback}
          reportStage={reportStage}
          onBackToUpload={() => {
            navigate(casePaths.upload);
          }}
          onSavePdf={() => {
            window.print();
            notifyAction('인쇄 대화상자를 열어 결과 요약을 저장할 준비를 마쳤습니다.');
          }}
          onSaveImage={() => {
            if (saveWorkspaceSnapshotAsImage(result)) {
              notifyAction('결과 대시보드 스냅샷을 이미지로 저장했습니다.');
              return;
            }

            notifyAction('이미지 저장을 지원하지 않는 환경입니다.', 'info');
          }}
          onDownloadJson={() => {
            downloadText(
              `${result.patient.deidentified_patient_id}-result.json`,
              JSON.stringify(result, null, 2),
              'application/json',
            );
            notifyAction('결과 JSON을 내려받았습니다.');
          }}
          onDownloadClinicianSummary={() => {
            downloadText(
              `${result.patient.deidentified_patient_id}-clinician-summary.txt`,
              buildClinicianSummary(result),
              'text/plain;charset=utf-8',
            );
            notifyAction('의료진 요약 메모를 저장했습니다.');
          }}
          onOpenExplanation={() => {
            navigate(casePaths.explanation);
          }}
          onOpenReport={() => {
            navigate(casePaths.report);
          }}
        />
      );
    }

    if (pathname === casePaths.explanation && result) {
      return (
        <ExplanationPage
          result={result}
          journeyContext={journeyContext}
          actionFeedback={actionFeedback}
          onBackToResult={() => {
            navigate(casePaths.result);
          }}
          onCopy={(content) => {
            void navigator.clipboard
              ?.writeText(content)
              .then(() => {
                notifyAction('환자 설명 문장을 클립보드에 복사했습니다.');
              })
              .catch(() => {
                notifyAction('클립보드 권한을 확인해주세요. 상담 메모 저장은 계속 사용할 수 있습니다.', 'info');
              });
          }}
          onPrint={() => {
            window.print();
            notifyAction('상담용 요약을 인쇄할 준비를 마쳤습니다.');
          }}
          onAddNote={(content) => {
            downloadText(
              `${result.patient.deidentified_patient_id}-counseling-note.txt`,
              content,
              'text/plain;charset=utf-8',
            );
            notifyAction('상담 메모 파일을 저장했습니다.');
          }}
        />
      );
    }

    if (pathname === casePaths.report && result) {
      return (
        <ReportPage
          result={result}
          journeyContext={journeyContext}
          actionFeedback={actionFeedback}
          reportStage={reportStage}
          onSetReportStage={(nextStage) => {
            setReportStage(nextStage);
            notifyAction(`리포트 상태를 ${nextStage} 단계로 업데이트했습니다.`, 'info');
          }}
          onBack={() => {
            navigate(casePaths.result);
          }}
          onPrint={() => {
            window.print();
            notifyAction('리포트 인쇄 대화상자를 열었습니다.');
          }}
        />
      );
    }

    return renderSettingsPage();
  };

  return (
    <div className="app-shell">
      <div className="authenticated-layout">
        <AppSidebar
          activePath={activeSidebarPath}
          items={sidebarItems}
          journeyContext={journeyContext}
          clinicianName={session.clinicianName}
          onNavigate={(nextPath) => {
            navigate(nextPath);
          }}
          onLogout={() => {
            resetToDashboard();
          }}
        />
        <div className="authenticated-content">{renderAuthenticatedPage()}</div>
      </div>

      {viewState === 'error' && error ? (
        <ErrorAlert code={error.code} message={error.message} details={error.details} onDismiss={dismissError} />
      ) : null}
    </div>
  );
}

export default App;
