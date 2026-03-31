import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from './App';

const mockPatientId = 'P-001';
const mockVariant = { gene: 'TP53', variant_classification: 'Missense_Mutation' };

const buildMockJsonExample = () => ({
  deidentified_patient_id: mockPatientId,
  gene_variants: [mockVariant],
  age: 67,
  pathologic_stage: 'IIA',
  gender: 'female',
});

const buildMockResultResponse = () => {
  const mockJsonExample = buildMockJsonExample();

  return {
    result_version: 'v1' as const,
    patient: { deidentified_patient_id: mockJsonExample.deidentified_patient_id },
    normalized_input: {
      deidentified_patient_id: mockJsonExample.deidentified_patient_id,
      gene_variants: mockJsonExample.gene_variants,
      clinical: {
        age: mockJsonExample.age,
        pathologic_stage: mockJsonExample.pathologic_stage,
        gender: mockJsonExample.gender,
      },
    },
    result: {
      adapter: 'mock',
      summary: {
        risk_level: '중간 위험',
        risk_score: 0.62,
        text: '프로토타입용 mock 추론 결과입니다.',
      },
      artifacts: {
        survival_curve: null,
        explanations: [],
      },
    },
    warnings: [],
  };
};

const buildMockContractExamples = () => {
  const mockResultResponse = buildMockResultResponse();

  return {
    csv_example: `deidentified_patient_id,gene,variant_classification\n${mockPatientId},${mockVariant.gene},${mockVariant.variant_classification}`,
    json_example: buildMockJsonExample(),
    envelope_example: mockResultResponse,
  };
};

const mockFetch = (options?: {
  uploadStatus?: number;
  uploadBody?: unknown;
}) => {
  const uploadStatus = options?.uploadStatus ?? 200;
  const uploadBody = options?.uploadBody ?? buildMockResultResponse();
  const mockContractExamples = buildMockContractExamples();

  return vi.spyOn(window, 'fetch').mockImplementation((input) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (url.includes('/api/v1/contracts/patient-example')) {
      return Promise.resolve(
        new Response(JSON.stringify(mockContractExamples), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }

    if (url.includes('/api/v1/inference/upload')) {
      return Promise.resolve(
        new Response(JSON.stringify(uploadBody), {
          status: uploadStatus,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }

    return Promise.reject(new Error(`Unhandled fetch call: ${url}`));
  });
};

const goToUploadPage = async () => {
  expect(await screen.findByRole('heading', { name: /로그인 후 첫 화면/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /cases/i }));
  fireEvent.click(await screen.findByRole('button', { name: /다음 단계/i }));
  fireEvent.change(screen.getByLabelText(/데이터 입력 방식/i), {
    target: { value: 'CSV/JSON 업로드' },
  });
  fireEvent.click(screen.getByRole('button', { name: /다음 단계/i }));
  fireEvent.click(screen.getByRole('button', { name: /다음 단계/i }));
  fireEvent.click(screen.getByRole('button', { name: /분석 시작/i }));
  expect(await screen.findByRole('heading', { name: /데이터 입력 \/ 업로드/i })).toBeInTheDocument();
};

const goToDashboardFromDemoRequest = async () => {
  expect(await screen.findByRole('heading', { name: /데모 요청/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /데모 요청 보내기/i }));
  expect(await screen.findByRole('button', { name: /데모 계정으로 계속/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /데모 계정으로 계속/i }));
  expect(await screen.findByRole('heading', { name: /대시보드/i })).toBeInTheDocument();
};

const uploadPatientFileAndReachResult = async (file = new File(['patient'], 'patient.csv', { type: 'text/csv' })) => {
  await goToUploadPage();

  const fileInput = screen.getByLabelText(/csv 또는 json 선택/i);
  fireEvent.change(fileInput, { target: { files: [file] } });
  fireEvent.click(screen.getByRole('button', { name: /입력 확인 준비/i }));

  expect(await screen.findByText(/모델에 넣기 전 입력 검토/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /분석 실행/i }));

  expect(await screen.findByRole('heading', { name: /결과 대시보드/i })).toBeInTheDocument();
};

const expectSummaryCardValue = (label: RegExp, value: string) => {
  const summaryCard = screen.getByText(label).closest('article');

  expect(summaryCard).not.toBeNull();
  expect(within(summaryCard as HTMLElement).getByText(value)).toBeInTheDocument();
};

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('highlights only the dashboard sidebar item on first load', async () => {
    mockFetch();

    render(<App />);

    const dashboardButton = await screen.findByRole('button', { name: /dashboard/i });
    const reportsButton = screen.getByRole('button', { name: /reports/i });

    expect(dashboardButton).toHaveClass('is-active');
    expect(reportsButton).not.toHaveClass('is-active');
    expect(reportsButton).toBeDisabled();
    expect(screen.queryByRole('button', { name: /new case/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/quick guide|업무 시작 흐름/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/active clinical demo session/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/continue active case|활성 케이스 이어서 보기/i)).not.toBeInTheDocument();
  });

  it('starts with an empty recent-case list and only shows cases created in-session', async () => {
    mockFetch();

    render(<App />);

    expect(await screen.findByRole('heading', { name: /로그인 후 첫 화면/i })).toBeInTheDocument();
    expect(screen.getByText(/아직 직접 입력하거나 실행한 케이스가 없습니다/i)).toBeInTheDocument();
    expect(screen.queryByText(/LUAD-2026-0008|LUAD-2026-0007|LUAD-2026-0006/i)).not.toBeInTheDocument();
    expectSummaryCardValue(/open cases/i, '0');
    expectSummaryCardValue(/review queue/i, '0');
    expectSummaryCardValue(/explanation ready/i, '0');

    await uploadPatientFileAndReachResult();
    fireEvent.click(screen.getByRole('button', { name: /dashboard/i }));

    const recentCasesSection = (await screen.findByRole('heading', { name: /최근 분석한 케이스/i })).closest(
      'section',
    );

    expect(recentCasesSection).not.toBeNull();
    expect(within(recentCasesSection as HTMLElement).getByText(/LUAD-2026-001/i)).toBeInTheDocument();
    expect(screen.queryByText(/아직 직접 입력하거나 실행한 케이스가 없습니다/i)).not.toBeInTheDocument();
    expectSummaryCardValue(/open cases/i, '1');
    expectSummaryCardValue(/review queue/i, '0');
    expectSummaryCardValue(/explanation ready/i, '0');
  });

  it('opens the cases list instead of the new-case form when prior cases exist', async () => {
    mockFetch();

    render(<App />);

    await uploadPatientFileAndReachResult();
    fireEvent.click(screen.getByRole('button', { name: /cases/i }));

    expect(await screen.findByRole('heading', { name: /이전에 생성한 케이스/i })).toBeInTheDocument();
    expect(screen.getByText(/최근 생성한 케이스/i)).toBeInTheDocument();
    expect(screen.getAllByText(/LUAD-2026-001/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: /새 케이스 생성/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /현재 케이스 열기/i }));
    expect(await screen.findByRole('heading', { name: /결과 대시보드/i })).toBeInTheDocument();
  });

  it('opens the same case-builder screen from the cases nav and the new-case CTA', async () => {
    mockFetch();

    render(<App />);

    expect(await screen.findByRole('heading', { name: /로그인 후 첫 화면/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cases/i }));
    expect(await screen.findByRole('heading', { name: /새 케이스 생성/i })).toBeInTheDocument();
    expect(screen.queryByText(/한 번에 긴 폼을 몰아넣지 않고/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/현재 워크플로우/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/이전에 작업한 케이스/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/active step/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^step 1$/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /dashboard/i }));
    fireEvent.click(screen.getByRole('button', { name: /^새 케이스$/i }));
    expect(await screen.findByRole('heading', { name: /새 케이스 생성/i })).toBeInTheDocument();
    expect(screen.queryByText(/한 번에 긴 폼을 몰아넣지 않고/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/현재 워크플로우/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/이전에 작업한 케이스/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/active step/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^step 1$/i)).not.toBeInTheDocument();
  });

  it('allows moving back to the previous stage in the cases flow', async () => {
    mockFetch();

    render(<App />);

    expect(await screen.findByRole('heading', { name: /로그인 후 첫 화면/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cases/i }));

    expect(screen.getByLabelText(/케이스 ID/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /이전 단계/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /다음 단계/i }));
    expect(await screen.findByLabelText(/데이터 입력 방식/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /이전 단계/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /이전 단계/i }));
    expect(await screen.findByLabelText(/케이스 ID/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /이전 단계/i })).not.toBeInTheDocument();
  });

  it('renders backend success results after upload', async () => {
    mockFetch();

    render(<App />);

    expect(await screen.findByRole('heading', { name: /로그인 후 첫 화면/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/dashboard');
    await uploadPatientFileAndReachResult();
    expect(screen.getByText(/P-001/)).toBeInTheDocument();
    expect(screen.getAllByText(/중간 위험/i).length).toBeGreaterThan(0);
  });

  it('renders safe backend error details', async () => {
    mockFetch({
      uploadStatus: 422,
      uploadBody: {
        error: {
          code: 'MISSING_REQUIRED_FIELD',
          message: 'Human-readable summary',
          details: [{ field: 'gene_variants[0].gene', rule: 'required' }],
        },
      },
    });

    render(<App />);
    await goToUploadPage();

    const fileInput = screen.getByLabelText(/csv 또는 json 선택/i);
    const file = new File(['patient'], 'patient.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /입력 확인 준비/i }));

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/missing_required_field/i)).toBeInTheDocument();
    expect(screen.getByText(/gene_variants\[0\]\.gene/i)).toBeInTheDocument();
  });

  it('blocks submit when no file is selected', async () => {
    mockFetch();

    render(<App />);
    await goToUploadPage();
    fireEvent.click(screen.getByRole('button', { name: /입력 확인 준비/i }));

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
    expect(screen.getByText(/업로드할 csv 또는 json 파일을 먼저 선택/i)).toBeInTheDocument();
  });

  it('shows a popup error immediately when an unsupported file is selected', async () => {
    mockFetch();

    render(<App />);
    await goToUploadPage();

    const fileInput = screen.getByLabelText(/csv 또는 json 선택/i);
    fireEvent.change(fileInput, { target: { files: [new File(['oops'], 'patient.txt', { type: 'text/plain' })] } });

    const popup = await screen.findByRole('alertdialog');
    expect(within(popup).getByText(/지원되는 파일 형식은 csv와 json/i)).toBeInTheDocument();
    fireEvent.click(within(popup).getByRole('button', { name: /닫기/i }));
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('renders sample download buttons after loading contract examples', async () => {
    mockFetch();

    render(<App />);
    await goToUploadPage();

    expect(screen.getByRole('button', { name: /csv 예시 다운로드/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /json 예시 다운로드/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /샘플 데이터로 테스트/i })).toBeInTheDocument();
  });

  it('supports drag and drop selection before upload', async () => {
    mockFetch();

    render(<App />);
    await goToUploadPage();

    const dropZone = screen.getByText(/또는 이 영역으로 파일을 끌어다 놓으세요/i).closest('label');
    const file = new File(['patient'], 'drop-patient.csv', { type: 'text/csv' });

    expect(dropZone).not.toBeNull();
    fireEvent.drop(dropZone as HTMLLabelElement, {
      dataTransfer: { files: [file] },
    });

    expect(screen.getAllByText(/drop-patient\.csv/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /입력 확인 준비/i }));

    expect(await screen.findByText(/모델에 넣기 전 입력 검토/i)).toBeInTheDocument();
  });

  it('continues from the demo request form into the dashboard workspace', async () => {
    mockFetch();
    window.history.replaceState({}, '', '/demo-request');

    render(<App />);

    await goToDashboardFromDemoRequest();

    expect(screen.getByText(/최근 분석한 케이스/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^새 케이스$/i })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: /최근 케이스 검색/i })).toBeInTheDocument();
    expect(screen.getByText(/아직 직접 입력하거나 실행한 케이스가 없습니다/i)).toBeInTheDocument();
  });

  it('auto-uploads sample data when sample mode is selected from cases flow', async () => {
    mockFetch();

    render(<App />);

    expect(await screen.findByRole('heading', { name: /로그인 후 첫 화면/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cases/i }));

    fireEvent.click(screen.getByRole('button', { name: /다음 단계/i }));
    fireEvent.change(screen.getByLabelText(/데이터 입력 방식/i), {
      target: { value: '샘플 데이터로 테스트' },
    });

    fireEvent.click(screen.getByRole('button', { name: /다음 단계/i }));
    fireEvent.click(screen.getByRole('button', { name: /다음 단계/i }));
    fireEvent.click(screen.getByRole('button', { name: /분석 시작/i }));

    expect(await screen.findByText(/모델에 넣기 전 입력 검토/i)).toBeInTheDocument();
    expect(screen.getByText(/샘플 환자 데이터를 자동으로 업로드해 입력 검토 패널까지 준비했습니다/i)).toBeInTheDocument();
  });

  it('filters recent cases with the dashboard search input', async () => {
    mockFetch();

    render(<App />);
    await uploadPatientFileAndReachResult();
    fireEvent.click(screen.getByRole('button', { name: /dashboard/i }));

    const searchInput = await screen.findByRole('searchbox', { name: /최근 케이스 검색/i });
    fireEvent.change(searchInput, { target: { value: 'NOT-FOUND' } });

    expect(screen.getByText(/검색어와 일치하는 케이스가 없습니다/i)).toBeInTheDocument();
    fireEvent.change(searchInput, { target: { value: 'LUAD-2026-001' } });
    expect(screen.getByRole('searchbox', { name: /최근 케이스 검색/i })).toHaveValue('LUAD-2026-001');
    expect(screen.getAllByText(/LUAD-2026-001/i).length).toBeGreaterThan(0);
  });

  it('restores the latest case context from local storage on a fresh render', async () => {
    mockFetch();

    const firstRender = render(<App />);
    await uploadPatientFileAndReachResult();
    fireEvent.click(screen.getByRole('button', { name: /dashboard/i }));
    expect(await screen.findByRole('heading', { name: /최근 분석한 케이스/i })).toBeInTheDocument();
    expect(screen.getAllByText(/LUAD-2026-001/i).length).toBeGreaterThan(0);

    firstRender.unmount();
    render(<App />);

    expect(await screen.findByRole('heading', { name: /최근 분석한 케이스/i })).toBeInTheDocument();
    expect(screen.getAllByText(/LUAD-2026-001/i).length).toBeGreaterThan(0);
  });

  it('opens the explanation view from result workspace and runs a print finisher action', async () => {
    mockFetch();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);

    render(<App />);

    await uploadPatientFileAndReachResult();

    fireEvent.click(screen.getByRole('button', { name: /환자 설명 생성/i }));
    expect(await screen.findByRole('heading', { name: /환자 설명용 화면/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /불안이 큰 환자용/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /인쇄용 요약 생성/i }));
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it('opens the report view from the export tab and runs a print finisher action', async () => {
    mockFetch();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);

    render(<App />);

    await uploadPatientFileAndReachResult();

    fireEvent.click(screen.getByRole('tab', { name: /리포트\/내보내기/i }));
    fireEvent.click(screen.getByRole('button', { name: /리포트 화면 열기/i }));
    expect(await screen.findByRole('heading', { name: /리포트 출력 화면/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /patient ready/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /pdf 저장 \/ 인쇄/i }));
    expect(printSpy).toHaveBeenCalledTimes(1);
  });
});
