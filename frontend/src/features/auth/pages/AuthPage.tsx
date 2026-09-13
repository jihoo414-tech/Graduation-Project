import { useAuthForm } from '../hooks/useAuthForm';

export function AuthPage() {
  const { mode, email, setEmail, password, setPassword, message, submitting, submit, switchMode } = useAuthForm();
  return (
    <main className="app-shell auth-shell">
      <section className="workspace-page-shell auth-panel">
        <div>
          <p className="workspace-page-kicker">LUAD AI</p>
          <h1>{mode === 'login' ? '로그인' : '계정 생성'}</h1>
          <p>분석 결과를 안전하게 저장하려면 Supabase 계정으로 로그인해 주세요.</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>이메일</span>
            <input
              aria-label="이메일"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            <span>비밀번호</span>
            <input
              aria-label="비밀번호"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {message && <p className="auth-message">{message}</p>}

          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? '처리 중...' : mode === 'login' ? '로그인' : '계정 생성'}
          </button>
        </form>

        <button
          className="secondary-button auth-switch"
          type="button"
          onClick={switchMode}
        >
          {mode === 'login' ? '새 계정 만들기' : '로그인으로 돌아가기'}
        </button>
      </section>
    </main>
  );
}
