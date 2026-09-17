export type UserRole = 'patient' | 'doctor' | 'admin';

export type AuthPortal = 'patient' | 'staff';

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
};

export const isStaffRole = (role: UserRole): boolean =>
  role === 'doctor' || role === 'admin';

export const portalAcceptsRole = (portal: AuthPortal, role: UserRole): boolean =>
  portal === 'patient' ? role === 'patient' : isStaffRole(role);
