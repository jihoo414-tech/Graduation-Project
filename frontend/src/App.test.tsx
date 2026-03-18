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
      risk_level: 'intermediate',
      risk_score: 0.62,
      text: 'Prototype mock inference result',
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

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders backend success results after upload', async () => {
    mockFetch();

    render(<App />);

    expect(await screen.findByText(/sample contract preview/i)).toBeInTheDocument();

    const fileInput = screen.getByLabelText(/select csv or json/i);
    const file = new File(['patient'], 'patient.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /upload and run inference/i }));

    expect(await screen.findByText(/inference result/i)).toBeInTheDocument();
    expect(screen.getByText('P-001')).toBeInTheDocument();
    expect(screen.getByText('Prototype mock inference result')).toBeInTheDocument();
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

    expect(await screen.findByText(/sample contract preview/i)).toBeInTheDocument();

    const fileInput = screen.getByLabelText(/select csv or json/i);
    const file = new File(['patient'], 'patient.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /upload and run inference/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/missing_required_field/i)).toBeInTheDocument();
    expect(screen.getByText(/gene_variants\[0\]\.gene/i)).toBeInTheDocument();
  });

  it('blocks submit when no file is selected', async () => {
    mockFetch();

    render(<App />);

    expect(await screen.findByText(/sample contract preview/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /upload and run inference/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText(/choose a csv or json file/i)).toBeInTheDocument();
  });
});
