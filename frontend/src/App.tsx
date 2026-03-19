import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ErrorAlert } from './components/ErrorAlert';
import { DemoRequestPage } from './components/marketing/DemoRequestPage';
import { LandingPage } from './components/marketing/LandingPage';
import { AppSidebar } from './components/product/AppSidebar';
import { AnalyzingPage } from './components/product/AnalyzingPage';
import { CaseBuilderPage } from './components/product/CaseBuilderPage';
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
import type { ContractExamplesResponse, ResultEnvelope } from './lib/types';
import { buildClinicianSummary, buildPatientFriendlySummary } from './lib/workspace';

type ViewState = 'idle' | 'loading' | 'success' | 'error';

type CaseDraft = {
  caseId: string;
  cancerType: string;
  diagnosisDate: string;
  stage: string;
  age: string;
  gender: string;
  inputMethod: string;
  genomicSource: string;
  biomarkerSummary: string;
  pathologySummary: string;
  analysisMode: string;
  includeExplanation: boolean;
};

type RecentCase = {
  id: string;
  cancerType: string;
  updatedAt: string;
  status: '입력 중' | '분석 완료' | '검토 필요' | '환자 설명 생성 완료';
};

const DEFAULT_CASE_ID = 'LUAD-2026-001';
const ANALYSIS_STEP_INTERVAL_MS = 160;
const analysisSteps = [
  '데이터 검증 중',
  '필수 변수 확인 중',
  '예측 모델 실행 중',
  '해석 문장 생성 중',
  '리포트 구성 중',
];

const defaultCaseDraft: CaseDraft = {
  caseId: DEFAULT_CASE_ID,
  cancerType: 'LUAD',
  diagnosisDate: '2026-03-01',
  stage: 'IIA',
  age: '67',
  gender: 'female',
  inputMethod: 'CSV 업로드',
  genomicSource: 'Targeted panel result',
  biomarkerSummary: 'TP53 mutation, EGFR status pending',
  pathologySummary: 'Residual tumor with moderate differentiation',
  analysisMode: '재발 위험 예측',
  includeExplanation: true,
};

const initialRecentCases: RecentCase[] = [
  {
    id: 'LUAD-2026-0008',
    cancerType: 'LUAD',
    updatedAt: '오늘 14:10',
    status: '분석 완료',
  },
  {
    id: 'LUAD-2026-0007',
    cancerType: 'LUAD',
    updatedAt: '오늘 11:20',
    status: '검토 필요',
  },
  {
    id: 'LUAD-2026-0006',
    cancerType: 'LUAD',
    updatedAt: '어제 17:40',
    status: '환자 설명 생성 완료',
  },
];

const normalizePathname = (pathname: string) => (pathname.trim() === '' ? '/' : pathname);

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
    return;
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#27272a';
  context.fillRect(60, 60, 1280, 180);

  context.fillStyle = '#ffffff';
  context.font = 'bold 56px Inter, system-ui, sans-serif';
  context.fillText('결과 대시보드 스냅샷', 96, 140);
  context.font = '28px Inter, system-ui, sans-serif';
  context.fillText(`환자 ID ${result.patient.deidentified_patient_id}`, 96, 190);

  context.fillStyle = '#0f172a';
  context.font = 'bold 34px Inter, system-ui, sans-serif';
  context.fillText(`위험군: ${result.result.summary.risk_level}`, 96, 320);
  context.fillText(`위험 점수: ${result.result.summary.risk_score.toFixed(2)}`, 96, 372);

  context.font = '28px Inter, system-ui, sans-serif';
  context.fillText(result.result.summary.text, 96, 444, 1180);

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${result.patient.deidentified_patient_id}-result-dashboard.png`;
  link.click();
};

function App() {
  const [pathname, setPathname] = useState(() => normalizePathname(window.location.pathname));
  const [caseDraft, setCaseDraft] = useState<CaseDraft>(defaultCaseDraft);
  const [caseBuilderStep, setCaseBuilderStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [result, setResult] = useState<ResultEnvelope | null>(null);
  const [error, setError] = useState<ReturnType<typeof normalizeUnknownError> | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [contractExamples, setContractExamples] = useState<ContractExamplesResponse | null>(null);
  const [contractExamplesError, setContractExamplesError] = useState<string | null>(null);
  const [recentCases, setRecentCases] = useState<RecentCase[]>(initialRecentCases);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);

  const activeCaseId = caseDraft.caseId.trim() || DEFAULT_CASE_ID;
  const casePaths = useMemo(
    () => ({
      upload: `/cases/${activeCaseId}/upload`,
      analyzing: `/cases/${activeCaseId}/analyzing`,
      result: `/cases/${activeCaseId}/result`,
      explanation: `/cases/${activeCaseId}/explanation`,
      report: `/cases/${activeCaseId}/report`,
    }),
    [activeCaseId],
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
      setRecentCases((currentCases) => {
        const nextCase: RecentCase = {
          id: activeCaseId,
          cancerType: caseDraft.cancerType,
          updatedAt: '방금',
          status: '분석 완료',
        };

        return [nextCase, ...currentCases.filter((caseItem) => caseItem.id !== activeCaseId)].slice(0, 5);
      });
    }, analysisSteps.length * ANALYSIS_STEP_INTERVAL_MS + 150);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [pathname, result, casePaths.analyzing, casePaths.result, activeCaseId, caseDraft.cancerType]);

  const assignSelectedFile = (file: File | null) => {
    setIsDragActive(false);
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
  };

  const resetToLanding = () => {
    resetCaseFlow();
    setCaseBuilderStep(0);
    setCaseDraft(defaultCaseDraft);
    navigate('/');
  };

  const selectedFileLabel = useMemo(() => {
    if (!selectedFile) {
      return '아직 선택한 파일이 없습니다.';
    }

    return `${selectedFile.name} · ${Math.max(selectedFile.size / 1024, 0.1).toFixed(1)} KB`;
  }, [selectedFile]);

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

    setViewState('loading');
    setError(null);
    setResult(null);

    try {
      const response = await uploadPatientFile(selectedFile);
      setResult(response);
      setViewState('success');
    } catch (unknownError) {
      setError(normalizeUnknownError(unknownError));
      setViewState('error');
    }
  };

  const handleCaseDraftFieldChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setCaseDraft((currentDraft) => ({ ...currentDraft, [name]: value }));
  };

  const sidebarItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'New Case', path: '/cases/new' },
    { label: 'Cases', path: result ? casePaths.result : casePaths.upload },
    { label: 'Reports', path: result ? casePaths.report : '/dashboard' },
    { label: 'Settings', path: '/settings' },
  ];

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
          onStartCase={() => {
            setCaseBuilderStep(0);
            navigate('/cases/new');
          }}
          onRunSampleCase={() => {
            resetCaseFlow();
            navigate(casePaths.upload);
          }}
        />
      );
    }

    if (pathname === '/cases/new') {
      return (
        <CaseBuilderPage
          draft={caseDraft}
          activeStep={caseBuilderStep}
          onFieldChange={handleCaseDraftFieldChange}
          onToggleExplanation={() => {
            setCaseDraft((currentDraft) => ({
              ...currentDraft,
              includeExplanation: !currentDraft.includeExplanation,
            }));
          }}
          onSelectStep={setCaseBuilderStep}
          onSaveAndExit={() => {
            navigate('/dashboard');
          }}
          onContinueToUpload={() => {
            if (caseBuilderStep < 3) {
              setCaseBuilderStep((currentStep) => currentStep + 1);
              return;
            }

            resetCaseFlow();
            navigate(casePaths.upload);
          }}
        />
      );
    }

    if (pathname === casePaths.upload) {
      return (
        <UploadPage
          caseId={activeCaseId}
          viewState={viewState}
          selectedFileLabel={selectedFileLabel}
          isDragActive={isDragActive}
          contractExamples={contractExamples}
          contractExamplesError={contractExamplesError}
          result={result}
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
          }}
          onUseSampleData={() => {
            if (!contractExamples) {
              return;
            }

            const sampleContent = JSON.stringify(contractExamples.json_example, null, 2);
            assignSelectedFile(new File([sampleContent], 'sample-patient.json', { type: 'application/json' }));
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
          onBackToUpload={() => {
            navigate(casePaths.upload);
          }}
          onSavePdf={() => {
            window.print();
          }}
          onSaveImage={() => {
            saveWorkspaceSnapshotAsImage(result);
          }}
          onDownloadJson={() => {
            downloadText(
              `${result.patient.deidentified_patient_id}-result.json`,
              JSON.stringify(result, null, 2),
              'application/json',
            );
          }}
          onDownloadClinicianSummary={() => {
            downloadText(
              `${result.patient.deidentified_patient_id}-clinician-summary.txt`,
              buildClinicianSummary(result),
              'text/plain;charset=utf-8',
            );
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
          onBackToResult={() => {
            navigate(casePaths.result);
          }}
          onCopy={() => {
            void navigator.clipboard?.writeText(buildPatientFriendlySummary(result));
          }}
          onPrint={() => {
            window.print();
          }}
          onAddNote={() => {
            downloadText(
              `${result.patient.deidentified_patient_id}-counseling-note.txt`,
              buildPatientFriendlySummary(result),
              'text/plain;charset=utf-8',
            );
          }}
        />
      );
    }

    if (pathname === casePaths.report && result) {
      return (
        <ReportPage
          result={result}
          onBack={() => {
            navigate(casePaths.result);
          }}
          onPrint={() => {
            window.print();
          }}
        />
      );
    }

    return renderSettingsPage();
  };

  return (
    <div className="app-shell">
      {pathname === '/' ? (
        <LandingPage
          onRequestDemo={() => {
            navigate('/demo-request');
          }}
          onViewProduct={() => {
            navigate('/dashboard');
          }}
        />
      ) : null}

      {pathname === '/demo-request' ? (
        <DemoRequestPage
          onBack={() => {
            navigate('/');
          }}
          onContinueToDashboard={() => {
            navigate('/dashboard');
          }}
        />
      ) : null}

      {pathname !== '/' && pathname !== '/demo-request' ? (
        <div className="authenticated-layout">
          <AppSidebar
            activePath={
              pathname === '/cases/new'
                ? '/cases/new'
                : pathname === '/dashboard'
                  ? '/dashboard'
                  : pathname === '/settings'
                    ? '/settings'
                    : pathname === casePaths.report
                      ? casePaths.report
                      : result
                        ? casePaths.result
                        : casePaths.upload
            }
            items={sidebarItems}
            onNavigate={(nextPath) => {
              navigate(nextPath);
            }}
            onLogout={() => {
              resetToLanding();
            }}
          />
          <div className="authenticated-content">{renderAuthenticatedPage()}</div>
        </div>
      ) : null}

      {viewState === 'error' && error ? (
        <ErrorAlert code={error.code} message={error.message} details={error.details} />
      ) : null}
    </div>
  );
}

export default App;
