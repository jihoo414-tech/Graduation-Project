import { requestJson } from '../../../shared/api/client';
import type { CurrentUser } from '../../../shared/types/auth';

export function fetchCurrentUser(accessToken: string): Promise<CurrentUser> {
  return requestJson<CurrentUser>(
    '/api/v1/auth/me',
    { headers: { Authorization: `Bearer ${accessToken}` } },
    '계정 권한을 확인하지 못했습니다. 다시 로그인해 주세요.',
  );
}
