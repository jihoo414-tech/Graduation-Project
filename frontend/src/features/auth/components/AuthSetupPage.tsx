export function AuthSetupPage() {
  return (
    <main className="app-shell auth-shell">
      <section className="workspace-page-shell auth-panel">
        <p className="workspace-page-kicker">Supabase setup</p>
        <h1>Supabase 연결값이 필요합니다</h1>
        <p>
          `frontend/.env`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 설정하면
          계정 생성과 로그인 기능이 활성화됩니다.
        </p>
      </section>
    </main>
  );
}
