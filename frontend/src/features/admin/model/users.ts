import type { UserRole } from '../../../shared/types/auth';

export type AdminUserListItem = {
  id: string;
  fullName: string | null;
  role: UserRole;
};

export type AdminUsersResponse = {
  items: AdminUserListItem[];
};
