import type { AuthPortal } from '../../../shared/types/auth';

type RoleSelectionPageProps = {
  onSelect: (portal: AuthPortal) => void;
};

export function RoleSelectionPage({ onSelect }: RoleSelectionPageProps) {
  return (
    <main className="app-shell auth-shell">
      <section className="workspace-page-shell auth-panel role-selection-panel">
        <header className="auth-brand">
          <p className="workspace-page-kicker">LUAD AI</p>
        </header>
        <div className="auth-heading">
          <h1>사용자 유형 선택</h1>
          <p>이용할 계정 유형을 선택해 주세요.</p>
        </div>

        <div className="role-selection-grid">
          <button className="role-selection-option" type="button" onClick={() => onSelect('patient')}>
            <span className="role-option-icon" aria-hidden="true">P</span>
            <span className="role-option-copy">
              <strong>환자</strong>
              <span>담당 의료진이 등록한 분석 결과를 확인합니다.</span>
            </span>
            <span className="role-option-arrow" aria-hidden="true">→</span>
          </button>
          <button className="role-selection-option" type="button" onClick={() => onSelect('staff')}>
            <span className="role-option-icon is-staff" aria-hidden="true">A</span>
            <span className="role-option-copy">
              <strong>관리자</strong>
              <span>승인된 의료진 또는 관리자 계정으로 전체 결과를 확인합니다.</span>
            </span>
            <span className="role-option-arrow" aria-hidden="true">→</span>
          </button>
        </div>
        <p className="role-selection-notice">
          관리자 계정은 사전 승인이 필요하며, 화면 선택만으로 권한이 부여되지 않습니다.
        </p>
      </section>
    </main>
  );
}
