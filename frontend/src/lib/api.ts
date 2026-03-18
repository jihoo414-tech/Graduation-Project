import type { BackendError, ContractExamplesResponse, ResultEnvelope } from './types';

const DEFAULT_API_BASE_URL = 'http://localhost:8000';

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL
).replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  backend: BackendError['error'];

  constructor(status: number, backend: BackendError['error']) {
    super(backend.message);
    this.name = 'ApiError';
    this.status = status;
    this.backend = backend;
  }
}

const isBackendError = (value: unknown): value is BackendError => {
  if (!value || typeof value !== 'object' || !('error' in value)) {
    return false;
  }

  const error = (value as { error?: unknown }).error;
  return !!error && typeof error === 'object' && 'code' in error && 'message' in error;
};

export const normalizeUnknownError = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.backend;
  }

  return {
    code: 'REQUEST_FAILED',
    message: 'Unable to complete the upload. Please try again.',
    details: [],
  };
};

export const uploadPatientFile = async (file: File): Promise<ResultEnvelope> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/v1/inference/upload`, {
    method: 'POST',
    body: formData,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    if (isBackendError(body)) {
      throw new ApiError(response.status, body.error);
    }

    throw new ApiError(response.status, {
      code: 'REQUEST_FAILED',
      message: 'Upload failed with an unexpected response.',
      details: [],
    });
  }

  return body as ResultEnvelope;
};

export const fetchContractExamples = async (): Promise<ContractExamplesResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/contracts/patient-example`);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    if (isBackendError(body)) {
      throw new ApiError(response.status, body.error);
    }

    throw new ApiError(response.status, {
      code: 'REQUEST_FAILED',
      message: 'Unable to load contract examples.',
      details: [],
    });
  }

  return body as ContractExamplesResponse;
};
