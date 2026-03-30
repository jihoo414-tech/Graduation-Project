import type { MouseEventHandler } from 'react';
import type { JourneyContext } from '../../lib/demoJourney';
import { PRODUCT_BRAND_NAME, PRODUCT_WORKSPACE_NAME } from '../../lib/productContent';

type SidebarItem = {
  label: string;
  path: string;
  activePath?: string;
  disabled?: boolean;
  onClick?: () => void;
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
          <p className="marketing-kicker">{PRODUCT_BRAND_NAME}</p>
          <h2>{PRODUCT_WORKSPACE_NAME}</h2>
          <p className="muted-text">{journeyContext.sessionLabel} · {journeyContext.stageLabel}</p>
        </div>
      </div>

      <nav className="app-sidebar-nav" aria-label="주요 메뉴">
        {items.map((item) => {
          const isActive = activePath === (item.activePath ?? item.path);

          return (
            <button
              key={`${item.label}-${item.path}`}
              type="button"
              className={`app-sidebar-link ${isActive ? 'is-active' : ''}`}
              disabled={item.disabled}
              onClick={() => {
                if (item.onClick) {
                  item.onClick();
                  return;
                }

                onNavigate(item.path);
              }}
            >
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="app-sidebar-footer">
        <strong>{clinicianName}</strong>
        <span>{journeyContext.caseId}</span>
        <button type="button" className="secondary-button" onClick={onLogout}>
          세션 초기화
        </button>
      </div>
    </aside>
  );
}
