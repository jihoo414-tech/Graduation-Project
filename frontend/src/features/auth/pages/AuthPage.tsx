import { useAuthForm } from '../hooks/useAuthForm';

type AuthPageProps = {
  initialMessage?: string;
};

export function AuthPage({
  initialMessage = '',
}: AuthPageProps) {
  const {
    mode,
    email,
    setEmail,
    fullName,
    setFullName,
    password,
    setPassword,
    message,
    submitting,
    submit,
    switchMode,
  } = useAuthForm(initialMessage);
  return (
    <main className="app-shell auth-shell">
      <section className="workspace-page-shell auth-panel">
        <header className="auth-brand">
          <p className="workspace-page-kicker">LUAD AI</p>
        </header>
        <div className="auth-heading">
          <h1>{mode === 'login' ? '로그인' : '환자 계정 생성'}</h1>
          <p>로그인하면 계정 유형을 확인해 환자 또는 의료진·관리자 화면으로 안내합니다.</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' ? (
            <label>
              <span>이름</span>
              <input
                aria-label="이름"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                minLength={2}
                maxLength={50}
                required
              />
            </label>
          ) : null}
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

        <button className="secondary-button auth-switch" type="button" onClick={switchMode}>
          {mode === 'login' ? '새 계정 만들기' : '로그인으로 돌아가기'}
        </button>
        <p className="auth-helper-text">
          환자 계정은 여기서 만들 수 있습니다. 의료진·관리자는 사전에 등록된 계정으로 로그인해 주세요.
        </p>
      </section>
    </main>
  );
}
