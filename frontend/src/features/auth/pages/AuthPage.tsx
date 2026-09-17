import { useAuthForm } from '../hooks/useAuthForm';
import type { AuthPortal } from '../../../shared/types/auth';

type AuthPageProps = {
  portal?: AuthPortal;
  initialMessage?: string;
  onBack?: () => void;
};

export function AuthPage({
  portal = 'patient',
  initialMessage = '',
  onBack,
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
  } = useAuthForm(portal, initialMessage);
  const portalLabel = portal === 'staff' ? '관리자' : '환자';
  return (
    <main className="app-shell auth-shell">
      <section className="workspace-page-shell auth-panel">
        <header className="auth-brand">
          <p className="workspace-page-kicker">LUAD AI</p>
        </header>
        <div className="auth-heading">
          <h1>{portalLabel} {mode === 'login' ? '로그인' : '계정 생성'}</h1>
          <p>
            {portal === 'staff'
              ? '사전에 승인된 의료진 또는 관리자 계정으로 로그인해 주세요.'
              : '분석 결과를 안전하게 저장하려면 환자 계정으로 로그인해 주세요.'}
          </p>
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

        {portal === 'patient' ? (
          <button className="secondary-button auth-switch" type="button" onClick={switchMode}>
            {mode === 'login' ? '새 계정 만들기' : '로그인으로 돌아가기'}
          </button>
        ) : (
          <p className="auth-helper-text">관리자 계정은 서비스 관리자가 사전에 등록합니다.</p>
        )}
        {onBack ? (
          <button className="auth-back-button" type="button" onClick={onBack}>
            ← 사용자 유형 다시 선택
          </button>
        ) : null}
      </section>
    </main>
  );
}
