import type { ComponentProps, ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';

type AuthenticatedLayoutProps = ComponentProps<typeof AppSidebar> & { children: ReactNode };

export function AuthenticatedLayout({ children, ...sidebarProps }: AuthenticatedLayoutProps) {
  return (
    <div className="authenticated-layout app-shell">
      <AppSidebar {...sidebarProps} />
      {children}
    </div>
  );
}
