type AppSidebarProps = {
  active: 'dashboard' | 'analysis';
  userEmail?: string;
  roleLabel?: string;
  showAnalysis?: boolean;
  onStartAnalysis: () => void;
  onDashboard: () => void;
  onSignOut: () => void;
};

export function AppSidebar({
  active,
  userEmail,
  roleLabel,
  showAnalysis = true,
  onStartAnalysis,
  onDashboard,
  onSignOut,
}: AppSidebarProps) {
  return (
    <aside className="app-sidebar">
      <button
        className="app-sidebar-brand-button"
        type="button"
        onClick={onStartAnalysis}
        aria-label="분석 화면으로 이동"
      >
        <div className="reference-brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div>
          <p className="marketing-kicker">LUAD AI</p>
        </div>
      </button>

      <nav className="app-sidebar-nav" aria-label="주요 메뉴">
        <button
          className={`app-sidebar-link ${active === 'dashboard' ? 'is-active' : ''}`}
          type="button"
          onClick={onDashboard}
        >
          대시보드
        </button>
        {showAnalysis ? (
          <button
            className={`app-sidebar-link ${active === 'analysis' ? 'is-active' : ''}`}
            type="button"
            onClick={onStartAnalysis}
          >
            새 분석
          </button>
        ) : null}
      </nav>

      <footer className="app-sidebar-footer">
        {roleLabel ? <span className="sidebar-role-label">{roleLabel}</span> : null}
        {userEmail && <p className="muted-text sidebar-email">{userEmail}</p>}
        <button className="secondary-button" type="button" onClick={onSignOut}>
          로그아웃
        </button>
      </footer>
    </aside>
  );
}
