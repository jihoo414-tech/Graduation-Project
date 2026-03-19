import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

const mockResultResponse = {
  result_version: 'v1',
  patient: { deidentified_patient_id: 'P-001' },
  normalized_input: {
    deidentified_patient_id: 'P-001',
    gene_variants: [{ gene: 'TP53', variant_classification: 'Missense_Mutation' }],
    clinical: {
      age: 67,
      pathologic_stage: 'IIA',
      gender: 'female',
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

const mockContractExamples = {
  csv_example: 'deidentified_patient_id,gene,variant_classification\nP-001,TP53,Missense_Mutation',
  json_example: {
    deidentified_patient_id: 'P-001',
    gene_variants: [{ gene: 'TP53', variant_classification: 'Missense_Mutation' }],
    age: 67,
    pathologic_stage: 'IIA',
    gender: 'female',
  },
  envelope_example: mockResultResponse,
};

const mockFetch = (options?: {
  uploadStatus?: number;
  uploadBody?: unknown;
}) => {
  const uploadStatus = options?.uploadStatus ?? 200;
  const uploadBody = options?.uploadBody ?? mockResultResponse;

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
  fireEvent.click(screen.getAllByRole('button', { name: /제품 화면 보기/i })[0]);
  expect(await screen.findByRole('heading', { name: /로그인 후 첫 화면/i })).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: /샘플 케이스 실행/i })[0]);
  expect(await screen.findByRole('heading', { name: /데이터 입력 \/ 업로드/i })).toBeInTheDocument();
};

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, '', '/');
  });

  it('renders backend success results after upload', async () => {
    mockFetch();

    render(<App />);

    expect(await screen.findByRole('heading', { name: /암 진단 결과 해석을 더 빠르고 명확하게/i })).toBeInTheDocument();
    await goToUploadPage();

    const fileInput = screen.getByLabelText(/csv 또는 json 선택/i);
    const file = new File(['patient'], 'patient.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /입력 확인 준비/i }));

    expect(await screen.findByText(/모델에 넣기 전 입력 검토/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /분석 실행/i }));

    expect(await screen.findByRole('heading', { name: /결과 대시보드/i })).toBeInTheDocument();
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

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/missing_required_field/i)).toBeInTheDocument();
    expect(screen.getByText(/gene_variants\[0\]\.gene/i)).toBeInTheDocument();
  });

  it('blocks submit when no file is selected', async () => {
    mockFetch();

    render(<App />);
    await goToUploadPage();
    fireEvent.click(screen.getByRole('button', { name: /입력 확인 준비/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText(/업로드할 csv 또는 json 파일을 먼저 선택/i)).toBeInTheDocument();
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

    expect(screen.getByText(/drop-patient\.csv/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /입력 확인 준비/i }));

    expect(await screen.findByText(/모델에 넣기 전 입력 검토/i)).toBeInTheDocument();
  });
});
