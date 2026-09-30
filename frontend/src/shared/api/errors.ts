export type BackendError = {
  message: string;
};


export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const DEFAULT_REQUEST_ERROR_MESSAGE = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';

export const isBackendError = (value: unknown): value is BackendError => {
  return !!value && typeof value === 'object' && typeof (value as BackendError).message === 'string';
};

export const normalizeUnknownError = (error: unknown) => {
  if (error instanceof ApiError) {
    return { message: error.message };
  }

  return { message: DEFAULT_REQUEST_ERROR_MESSAGE };
};
