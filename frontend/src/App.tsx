import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ErrorAlert } from './components/ErrorAlert';
import { AppSidebar } from './components/product/AppSidebar';
import { AnalyzingPage } from './components/product/AnalyzingPage';
import { CaseBuilderPage } from './components/product/CaseBuilderPage';
import { CasesPage } from './components/product/CasesPage';
import { DashboardPage } from './components/product/DashboardPage';
import { UploadPage } from './components/workspace/UploadPage';
import {
  fetchContractExamples,
  normalizeUnknownError,
  uploadPatientFile,
} from './lib/api';
import {
  ANALYSIS_DURATION_MS,
  buildCasePaths,
  buildJourneyContext,
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
  type ViewState,
} from './lib/demoJourney';
import {
  clearPersistedWorkspaceState,
  loadPersistedWorkspaceState,
  persistWorkspaceState,
} from './lib/persistence';
import type { ContractExamplesResponse, ResultEnvelope } from './lib/types';

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
      status: (caseItem.status as string) === '설명 준비 완료' ? '분석 완료' : caseItem.status,
    })),
  );
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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
    });
  }, [session, caseDraft, caseBuilderStep, recentCases, result]);

  useEffect(() => {
    if (pathname !== casePaths.analyzing || !result) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRecentCases((currentCases) =>
        upsertRecentCase(currentCases, {
          id: activeCaseId,
          cancerType: FIXED_CANCER_TYPE,
          updatedAt: '방금',
          status: deriveCaseStatus('dashboard', result),
        }),
      );
      navigate('/cases', { replace: true });
    }, ANALYSIS_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pathname, result, casePaths.analyzing, activeCaseId]);

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
    setActionFeedback(null);
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

  const deleteCase = (caseId: string) => {
    if (!window.confirm(`정말 ${caseId} 케이스를 삭제하시겠습니까?`)) {
      return;
    }

    setRecentCases((currentCases) => currentCases.filter((caseItem) => caseItem.id !== caseId));

    if (activeCaseId === caseId) {
      resetCaseFlow();
      setCaseBuilderStep(0);
      setCaseDraft({
        ...defaultCaseDraft,
        caseId: '',
      });
    }
  };

  const sidebarItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Cases', path: '/cases', activePath: '/cases', onClick: openCasesHome },
    { label: 'Settings', path: '/settings' },
  ];

  const activeSidebarPath =
    pathname === '/dashboard'
      ? '/dashboard'
      : pathname === '/settings'
        ? '/settings'
        : '/cases';

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
          onDeleteCase={deleteCase}
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
            if (caseBuilderStep < 2) {
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
      return <AnalyzingPage />;
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
          onGoHome={() => {
            navigate('/dashboard');
          }}
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
