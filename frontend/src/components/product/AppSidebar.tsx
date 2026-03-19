import type { MouseEventHandler } from 'react';
import type { JourneyContext } from '../../lib/demoJourney';

type SidebarItem = {
  label: string;
  path: string;
};

type AppSidebarProps = {
  activePath: string;
  items: SidebarItem[];
  journeyContext: JourneyContext;
  clinicianName: string;
  onNavigate: (path: string) => void;
  onLogout: MouseEventHandler<HTMLButtonElement>;
};

export function AppSidebar({
  activePath,
  items,
  journeyContext,
  clinicianName,
  onNavigate,
  onLogout,
}: AppSidebarProps) {
  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-brand">
        <div className="reference-brand-mark app-sidebar-mark" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div>
          <p className="marketing-kicker">Medical Explain AI</p>
          <h2>Clinical Workspace</h2>
          <p className="muted-text">{journeyContext.sessionLabel} · {journeyContext.stageLabel}</p>
        </div>
      </div>

      <nav className="app-sidebar-nav" aria-label="주요 메뉴">
        {items.map((item) => (
          <button
            key={`${item.label}-${item.path}`}
            type="button"
            className={`app-sidebar-link ${activePath === item.path ? 'is-active' : ''}`}
            onClick={() => onNavigate(item.path)}
          >
            <span>{item.label}</span>
            <small>{activePath === item.path ? 'Current' : 'Open'}</small>
          </button>
        ))}
      </nav>

      <div className="app-sidebar-footer">
        <div className="app-sidebar-status-pill">
          <span className="app-sidebar-status-dot" />
          Active clinical demo session
        </div>
        <strong>{clinicianName}</strong>
        <span>{journeyContext.caseId} · {journeyContext.nextStepLabel}</span>
        <button type="button" className="secondary-button" onClick={onLogout}>
          로그아웃
        </button>
      </div>
    </aside>
  );
}
