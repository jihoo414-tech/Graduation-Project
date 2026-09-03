import type { BackendError, ResultEnvelope } from './types';

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

const localizedMessageByCode: Record<string, string> = {
  AUTH_REQUIRED: '로그인이 필요합니다.',
  FILE_REQUIRED: '업로드할 CSV 파일을 선택해 주세요.',
  REQUEST_FAILED: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  SUPABASE_NOT_CONFIGURED: 'Supabase 연결값이 설정되지 않았습니다.',
  RESULT_SAVE_FAILED: '분석 결과를 데이터베이스에 저장하지 못했습니다.',
  UNSUPPORTED_FILE_TYPE: '지원되는 파일 형식은 CSV입니다.',
  MALFORMED_FILE: '업로드한 파일 형식을 해석할 수 없습니다.',
  MULTIPLE_PATIENT_IDS: '한 번의 업로드에는 환자 1명만 포함할 수 있습니다.',
  MISSING_PATIENT_ID: '비식별 환자 ID가 필요합니다.',
  MISSING_GENE_VARIANTS: '유전자 변이 정보가 필요합니다.',
  MISSING_REQUIRED_FIELD: '필수 항목이 누락되었습니다.',
  DISALLOWED_IDENTIFIER_FIELD: '이름, 주민번호, 병원번호 같은 직접 식별정보는 사용할 수 없습니다.',
  VALIDATION_ERROR: '요청 형식이 올바르지 않습니다.',
  INVALID_CLINICAL_VALUE: '입력값을 다시 확인해 주세요.',
};

const localizeMessage = (code: string, fallback: string) => localizedMessageByCode[code] ?? fallback;

const isBackendError = (value: unknown): value is BackendError => {
  if (!value || typeof value !== 'object' || !('error' in value)) {
    return false;
  }

  const error = (value as { error?: unknown }).error;
  return !!error && typeof error === 'object' && 'code' in error && 'message' in error;
};

export const normalizeUnknownError = (error: unknown) => {
  if (error instanceof ApiError) {
    return {
      ...error.backend,
      message: localizeMessage(error.backend.code, error.backend.message),
    };
  }

  return {
    code: 'REQUEST_FAILED',
    message: localizeMessage('REQUEST_FAILED', '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'),
    details: [],
  };
};

export const uploadModelFiles = async (
  mutationFile: File,
  expressionFile: File,
  clinical: { birthDate: string; gender: string; stage: string },
  accessToken: string,
): Promise<ResultEnvelope> => {
  const formData = new FormData();
  formData.append('mutation_file', mutationFile);
  formData.append('expression_file', expressionFile);
  formData.append('birth_date', clinical.birthDate);
  formData.append('gender', clinical.gender);
  formData.append('stage', clinical.stage);

  return postInference(formData, accessToken);
};

const postInference = async (formData: FormData, accessToken: string): Promise<ResultEnvelope> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/inference/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (isBackendError(body)) {
      throw new ApiError(response.status, body.error);
    }
    throw new ApiError(response.status, {
      code: 'REQUEST_FAILED',
      message: '예상하지 못한 응답으로 업로드에 실패했습니다.',
      details: [],
    });
  }
  return body as ResultEnvelope;
};
