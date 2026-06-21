type AppSidebarProps = { onStartAnalysis: () => void; onHome: () => void };

export function AppSidebar({ onStartAnalysis, onHome }: AppSidebarProps) {
  return <aside className="app-sidebar">
    <button className="app-sidebar-brand-button" type="button" onClick={onHome} aria-label="홈으로 이동">
      <div className="reference-brand-mark" aria-hidden="true"><span /><span /><span /><span /></div>
      <div><p className="marketing-kicker">LUAD AI</p><h2>Clinical Workspace</h2></div>
    </button>
    <nav className="app-sidebar-nav" aria-label="주요 메뉴">
      <button className="app-sidebar-link" type="button" onClick={onHome}>소개</button>
      <button className="app-sidebar-link" type="button" onClick={onStartAnalysis}>분석 시작</button>
    </nav>
  </aside>;
}
