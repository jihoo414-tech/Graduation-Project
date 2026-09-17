import { requestJson, requestNoContent } from '../../../shared/api/client';
import type { UserRole } from '../../../shared/types/auth';
import type { AdminUsersResponse } from '../model/users';

export function fetchAdminUsers(accessToken: string): Promise<AdminUsersResponse> {
  return requestJson<AdminUsersResponse>(
    '/api/v1/admin/users',
    { headers: { Authorization: `Bearer ${accessToken}` } },
    '사용자 목록을 불러오지 못했습니다.',
  );
}

export function updateAdminUserRole(
  accessToken: string,
  userId: string,
  role: UserRole,
): Promise<void> {
  return requestNoContent(
    `/api/v1/admin/users/${userId}/role`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role }),
    },
    '사용자 역할을 변경하지 못했습니다.',
  );
}
