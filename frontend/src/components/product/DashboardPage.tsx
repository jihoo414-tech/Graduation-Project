import type { MouseEventHandler } from 'react';

type CaseStatus = '입력 중' | '분석 완료' | '검토 필요' | '환자 설명 생성 완료';

type CaseItem = {
  id: string;
  cancerType: string;
  updatedAt: string;
  status: CaseStatus;
};

type DashboardPageProps = {
  cases: CaseItem[];
  onStartCase: MouseEventHandler<HTMLButtonElement>;
  onRunSampleCase: MouseEventHandler<HTMLButtonElement>;
};

const statusClassByLabel: Record<CaseStatus, string> = {
  '입력 중': 'draft',
  '분석 완료': 'done',
  '검토 필요': 'review',
  '환자 설명 생성 완료': 'explained',
};

const summaryCards = [
  { label: 'Open cases', value: '12', meta: '오늘 업데이트 3건' },
  { label: 'Review queue', value: '04', meta: '의사 검토 필요' },
  { label: 'Explanation ready', value: '07', meta: '상담 문장 생성 완료' },
];

export function DashboardPage({ cases, onStartCase, onRunSampleCase }: DashboardPageProps) {
  return (
    <main className="product-shell">
      <div className="product-page-header">
        <div>
          <p className="workspace-page-kicker">Dashboard</p>
          <h1>로그인 후 첫 화면: 바로 업무를 시작하는 대시보드</h1>
          <p>최근 케이스, 빠른 시작, 샘플 실행을 한 시선 안에 묶어 바로 업무를 시작하게 구성했습니다.</p>
        </div>
        <button type="button" className="primary-button" onClick={onStartCase}>
          새 케이스 시작
        </button>
      </div>

      <section className="dashboard-topbar">
        <input
          className="search-input"
          type="search"
          placeholder="최근 케이스 검색"
          aria-label="최근 케이스 검색"
        />
      </section>

      <section className="dashboard-summary-strip">
        {summaryCards.map((card) => (
          <article key={card.label} className="dashboard-summary-tile">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.meta}</p>
          </article>
        ))}
      </section>

      <div className="dashboard-grid">
        <section className="dashboard-main-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="marketing-kicker">Recent cases</p>
              <h2>최근 분석한 케이스</h2>
            </div>
            <button type="button" className="secondary-button" onClick={onRunSampleCase}>
              샘플 케이스 실행
            </button>
          </div>

          <div className="case-list">
            {cases.map((caseItem) => (
              <article key={caseItem.id} className="case-list-item">
                <div>
                  <strong>{caseItem.id}</strong>
                  <p>{caseItem.cancerType}</p>
                </div>
                <div className="case-list-meta">
                  <span className={`status-badge status-${statusClassByLabel[caseItem.status]}`}>
                    {caseItem.status}
                  </span>
                  <small>{caseItem.updatedAt}</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="dashboard-side-panel">
          <article className="dashboard-side-card">
            <p className="marketing-kicker">Quick guide</p>
            <h3>업무 시작 흐름</h3>
            <ul className="detail-list">
              <li>새 케이스 시작 → 환자/검사 정보 입력 → 분석 실행</li>
              <li>결과 탭에서 요약 / 근거 / 환자 설명 / 리포트를 확인합니다.</li>
            </ul>
          </article>

          <article className="dashboard-side-card">
            <p className="marketing-kicker">Sample run</p>
            <h3>샘플 케이스</h3>
            <p>실제 업로드 전 전체 플로우를 빠르게 체험할 수 있는 진입점입니다.</p>
            <button type="button" className="primary-button" onClick={onRunSampleCase}>
              샘플 케이스 실행
            </button>
          </article>

          <article className="dashboard-side-card caution-card">
            <p className="marketing-kicker">Safety note</p>
            <h3>주의 문구</h3>
            <p>이 서비스는 의료진의 임상 판단을 보조하기 위한 목적으로 설계되었습니다.</p>
          </article>
        </aside>
      </div>
    </main>
  );
}
