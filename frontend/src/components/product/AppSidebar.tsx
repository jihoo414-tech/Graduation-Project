type AppSidebarProps = {
  active: 'dashboard' | 'list' | 'analysis';
  userEmail?: string;
  onStartAnalysis: () => void;
  onDashboard: () => void;
  onList: () => void;
  onSignOut: () => void;
};

export function AppSidebar({ active, userEmail, onStartAnalysis, onDashboard, onList, onSignOut }: AppSidebarProps) {
  return (
    <aside className="app-sidebar">
      <button className="app-sidebar-brand-button" type="button" onClick={onStartAnalysis} aria-label="분석 화면으로 이동">
        <div className="reference-brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div>
          <p className="marketing-kicker">LUAD AI</p>
          <h2>Clinical Workspace</h2>
        </div>
      </button>

      <nav className="app-sidebar-nav" aria-label="주요 메뉴">
        <button className={`app-sidebar-link ${active === 'dashboard' ? 'is-active' : ''}`} type="button" onClick={onDashboard}>
          대시보드
        </button>
        <button className={`app-sidebar-link ${active === 'list' ? 'is-active' : ''}`} type="button" onClick={onList}>
          목록
        </button>
        <button className={`app-sidebar-link ${active === 'analysis' ? 'is-active' : ''}`} type="button" onClick={onStartAnalysis}>
          분석
        </button>
      </nav>

      <footer className="app-sidebar-footer">
        {userEmail && <p className="muted-text sidebar-email">{userEmail}</p>}
        <button className="secondary-button" type="button" onClick={onSignOut}>
          로그아웃
        </button>
      </footer>
    </aside>
  );
}
