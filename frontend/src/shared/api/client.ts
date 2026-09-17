import { ApiError, isBackendError } from './errors';

const DEFAULT_API_BASE_URL = 'http://localhost:8000';

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL
).replace(/\/$/, '');


export async function requestJson<T>(
  path: string,
  options: RequestInit,
  fallbackMessage: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch {
    throw new ApiError(0, '서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 잠시 후 다시 시도해 주세요.');
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const localized = isBackendError(body) && /[가-힣]/.test(body.message);
    throw new ApiError(response.status, localized ? body.message : fallbackMessage);
  }
  if (body === null) {
    throw new ApiError(response.status, '서버 응답을 읽을 수 없습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.');
  }
  return body as T;
}

export async function requestNoContent(
  path: string,
  options: RequestInit,
  fallbackMessage: string,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch {
    throw new ApiError(0, '서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 잠시 후 다시 시도해 주세요.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const localized = isBackendError(body) && /[가-힣]/.test(body.message);
    throw new ApiError(response.status, localized ? body.message : fallbackMessage);
  }
}
