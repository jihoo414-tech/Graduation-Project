import type { ResultEnvelope } from './types';

export type ViewState = 'idle' | 'loading' | 'success' | 'error';

export type CaseStatus =
  | '입력 구성 중'
  | '업로드 준비'
  | '분석 완료'
  | '의사 검토 필요'
  | '설명 준비 완료'
  | '추가 입력 확인 필요';

export type SupportedInputMethod = 'CSV/JSON 업로드' | '샘플 데이터로 테스트';

export type CaseDraft = {
  caseId: string;
  cancerType: string;
  diagnosisDate: string;
  stage: string;
  age: string;
  gender: string;
  inputMethod: SupportedInputMethod;
  genomicSource: string;
  biomarkerSummary: string;
  pathologySummary: string;
  analysisMode: string;
  includeExplanation: boolean;
};

export type RecentCase = {
  id: string;
  cancerType: string;
  updatedAt: string;
  status: CaseStatus;
};

export type DemoSession = {
  clinicianName: string;
  organization: string;
  specialty: string;
  email: string;
  requestGoal: string;
  note: string;
  entryPoint: 'landing' | 'demo-request';
};

export type DemoRequestFormValues = {
  clinicianName: string;
  organization: string;
  specialty: string;
  email: string;
  requestGoal: string;
  note: string;
};

export type DemoStage =
  | 'dashboard'
  | 'case-builder'
  | 'upload'
  | 'analyzing'
  | 'result'
  | 'explanation'
  | 'report'
  | 'settings';

export type JourneyChecklistItem = {
  label: string;
  detail: string;
  complete: boolean;
};

export type ActionFeedback = {
  tone: 'success' | 'info';
  message: string;
};

export type JourneyContext = {
  caseId: string;
  cancerType: string;
  stageText: string;
  analysisMode: string;
  inputMethod: SupportedInputMethod;
  stage: DemoStage;
  stageLabel: string;
  stageSummary: string;
  statusLabel: CaseStatus;
  sessionLabel: string;
  clinicianLabel: string;
  organization: string;
  nextStepLabel: string;
};

export const DEFAULT_CASE_ID = 'LUAD-2026-001';

export const ANALYSIS_STEP_INTERVAL_MS = 160;

export const analysisSteps = [
  '데이터 검증 중',
  '필수 변수 확인 중',
  '예측 모델 실행 중',
  '해석 문장 생성 중',
  '리포트 구성 중',
];

export const supportedInputMethods: readonly SupportedInputMethod[] = [
  'CSV/JSON 업로드',
  '샘플 데이터로 테스트',
];

export const futureInputMethodCards = [
  {
    label: '수동 입력',
    note: '상담실 현장 입력용 structured form은 다음 단계에서 확장합니다.',
  },
  {
    label: '유전체 결과 파일 업로드',
    note: 'VCF/패널 원본 정규화는 후속 통합 범위로 분리했습니다.',
  },
] as const;

export const defaultCaseDraft: CaseDraft = {
  caseId: DEFAULT_CASE_ID,
  cancerType: 'LUAD',
  diagnosisDate: '2026-03-01',
  stage: 'IIA',
  age: '67',
  gender: 'female',
  inputMethod: 'CSV/JSON 업로드',
  genomicSource: 'Targeted panel result',
  biomarkerSummary: 'TP53 mutation, EGFR status pending',
  pathologySummary: 'Residual tumor with moderate differentiation',
  analysisMode: '재발 위험 예측',
  includeExplanation: true,
};

export const initialRecentCases: RecentCase[] = [];

export const defaultDemoSession: DemoSession = {
  clinicianName: '김메드',
  organization: 'Seoul Medical Center',
  specialty: '종양내과',
  email: 'doctor@example.com',
  requestGoal: '암 진단 결과 해석 및 환자 설명 지원',
  note: '재발 위험 해석과 환자 설명 생성 데모를 확인하고 싶습니다.',
  entryPoint: 'landing',
};

export const normalizePathname = (pathname: string) => {
  const trimmedPathname = pathname.trim();

  if (trimmedPathname === '' || trimmedPathname === '/') {
    return '/dashboard';
  }

  return trimmedPathname;
};

export const buildCasePaths = (caseId: string) => ({
  upload: `/cases/${caseId}/upload`,
  analyzing: `/cases/${caseId}/analyzing`,
  result: `/cases/${caseId}/result`,
  explanation: `/cases/${caseId}/explanation`,
  report: `/cases/${caseId}/report`,
});

const stageMeta: Record<DemoStage, { label: string; summary: string; nextStepLabel: string }> = {
  dashboard: {
    label: '대시보드',
    summary: '현재 세션과 최근 케이스를 확인하고 바로 다음 작업으로 이동합니다.',
    nextStepLabel: '활성 케이스 이어서 보기',
  },
  'case-builder': {
    label: '케이스 구성',
    summary: '환자/검사 정보를 정리하고 업로드에 필요한 정보를 확정합니다.',
    nextStepLabel: '업로드 준비하기',
  },
  upload: {
    label: '입력 검토',
    summary: '선택한 파일과 케이스 메타데이터를 함께 검토한 뒤 분석을 시작합니다.',
    nextStepLabel: '분석 실행',
  },
  analyzing: {
    label: '분석 진행',
    summary: '입력 검증과 결과 생성 단계를 순차적으로 진행합니다.',
    nextStepLabel: '결과 대시보드 확인',
  },
  result: {
    label: '결과 검토',
    summary: '위험도, 근거, 환자 설명, 리포트까지 한 흐름으로 이어집니다.',
    nextStepLabel: '설명 또는 리포트 열기',
  },
  explanation: {
    label: '환자 설명',
    summary: '전문의용 요약과 환자용 설명을 전환하며 상담 문장을 마감합니다.',
    nextStepLabel: '상담 메모 저장',
  },
  report: {
    label: '리포트 출력',
    summary: '케이스 요약과 결과를 문서형 레이아웃으로 정리합니다.',
    nextStepLabel: 'PDF 저장 / 공유',
  },
  settings: {
    label: '설정',
    summary: '기관/협업 설정은 후속 범위로 유지합니다.',
    nextStepLabel: '대시보드로 복귀',
  },
};

export const resolveDemoStage = (
  pathname: string,
  casePaths: ReturnType<typeof buildCasePaths>,
): DemoStage => {
  if (pathname === '/dashboard') {
    return 'dashboard';
  }

  if (pathname === '/cases/new') {
    return 'case-builder';
  }

  if (pathname === casePaths.upload) {
    return 'upload';
  }

  if (pathname === casePaths.analyzing) {
    return 'analyzing';
  }

  if (pathname === casePaths.result) {
    return 'result';
  }

  if (pathname === casePaths.explanation) {
    return 'explanation';
  }

  if (pathname === casePaths.report) {
    return 'report';
  }

  return 'settings';
};

export const deriveCaseStatus = (stage: DemoStage, result: ResultEnvelope | null): CaseStatus => {
  if (stage === 'case-builder') {
    return '입력 구성 중';
  }

  if (stage === 'upload' || stage === 'analyzing') {
    return '업로드 준비';
  }

  if (stage === 'explanation' || stage === 'report') {
    return '설명 준비 완료';
  }

  if (!result) {
    return '업로드 준비';
  }

  if (result.warnings.length > 0) {
    return '추가 입력 확인 필요';
  }

  if (/고/i.test(result.result.summary.risk_level)) {
    return '의사 검토 필요';
  }

  return '분석 완료';
};

export const buildJourneyContext = ({
  draft,
  session,
  pathname,
  casePaths,
  result,
}: {
  draft: CaseDraft;
  session: DemoSession;
  pathname: string;
  casePaths: ReturnType<typeof buildCasePaths>;
  result: ResultEnvelope | null;
}): JourneyContext => {
  const stage = resolveDemoStage(pathname, casePaths);
  const stageInfo = stageMeta[stage];
  const caseId = draft.caseId.trim() || DEFAULT_CASE_ID;
  const cancerType = draft.cancerType.trim() || '암종 미지정';
  const stageText = draft.stage.trim() || '병기 미입력';

  return {
    caseId,
    cancerType,
    stageText,
    analysisMode: draft.analysisMode,
    inputMethod: draft.inputMethod,
    stage,
    stageLabel: stageInfo.label,
    stageSummary: stageInfo.summary,
    statusLabel: deriveCaseStatus(stage, result),
    sessionLabel: `${session.organization} · ${session.specialty}`,
    clinicianLabel: `${session.clinicianName} 의료진`,
    organization: session.organization,
    nextStepLabel: stageInfo.nextStepLabel,
  };
};

export const buildUploadChecklist = ({
  draft,
  selectedFile,
  result,
}: {
  draft: CaseDraft;
  selectedFile: File | null;
  result: ResultEnvelope | null;
}): JourneyChecklistItem[] => [
  {
    label: '케이스 기본 정보 확인',
    detail: `${draft.caseId} · ${draft.cancerType} · ${draft.stage}`,
    complete: Boolean(draft.caseId && draft.cancerType && draft.stage),
  },
  {
    label: '지원되는 입력 경로 선택',
    detail: draft.inputMethod,
    complete: supportedInputMethods.includes(draft.inputMethod),
  },
  {
    label: '분석 파일 또는 샘플 데이터 준비',
    detail: selectedFile ? selectedFile.name : '아직 파일이 선택되지 않았습니다.',
    complete: Boolean(selectedFile),
  },
  {
    label: '모델 입력 전 검토 패널 확인',
    detail: result ? '입력 요약과 경고를 검토할 준비가 되었습니다.' : '업로드 후 자동으로 열립니다.',
    complete: Boolean(result),
  },
];

export const upsertRecentCase = (cases: RecentCase[], nextCase: RecentCase) =>
  [nextCase, ...cases.filter((caseItem) => caseItem.id !== nextCase.id)].slice(0, 5);
