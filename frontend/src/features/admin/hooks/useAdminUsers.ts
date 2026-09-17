import { useEffect, useState } from 'react';
import { normalizeUnknownError } from '../../../shared/api/errors';
import type { UserRole } from '../../../shared/types/auth';
import { fetchAdminUsers, updateAdminUserRole } from '../api/users';
import type { AdminUserListItem } from '../model/users';

export function useAdminUsers(accessToken: string, enabled: boolean) {
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    if (!enabled) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetchAdminUsers(accessToken);
      setItems(response.items);
    } catch (unknownError) {
      setError(normalizeUnknownError(unknownError).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [accessToken, enabled]);

  const updateRole = async (userId: string, role: UserRole) => {
    setError('');
    try {
      await updateAdminUserRole(accessToken, userId, role);
      await loadUsers();
    } catch (unknownError) {
      setError(normalizeUnknownError(unknownError).message);
    }
  };

  return { items, loading, error, loadUsers, updateRole };
}
