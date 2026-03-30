import type { MouseEventHandler } from 'react';
import type { CaseStatus, DemoSession, JourneyContext } from '../../lib/demoJourney';

type CaseItem = {
  id: string;
  cancerType: string;
  updatedAt: string;
  status: CaseStatus;
};

type DashboardPageProps = {
  cases: CaseItem[];
  session: DemoSession;
  journeyContext: JourneyContext;
  onStartCase: MouseEventHandler<HTMLButtonElement>;
  onRunSampleCase: MouseEventHandler<HTMLButtonElement>;
};

const statusClassByLabel: Record<CaseStatus, string> = {
  '입력 구성 중': 'draft',
  '업로드 준비': 'draft',
  '분석 완료': 'done',
  '의사 검토 필요': 'review',
  '설명 준비 완료': 'explained',
  '추가 입력 확인 필요': 'review',
};

export function DashboardPage({
  cases,
  session,
  journeyContext,
  onStartCase,
  onRunSampleCase,
}: DashboardPageProps) {
  const reviewQueueCount = cases.filter(
    (caseItem) => caseItem.status === '의사 검토 필요' || caseItem.status === '추가 입력 확인 필요',
  ).length;
  const explanationReadyCount = cases.filter((caseItem) => caseItem.status === '설명 준비 완료').length;
  const summaryCards = [
    { label: 'Open cases', value: String(cases.length), meta: `최근 목록 기준 ${cases.length}건` },
    { label: 'Review queue', value: String(reviewQueueCount), meta: '의사 검토 필요' },
    { label: 'Explanation ready', value: String(explanationReadyCount), meta: '상담 문장 생성 완료' },
  ];

  return (
    <main className="product-shell">
      <div className="product-page-header">
        <div>
          <p className="workspace-page-kicker">Dashboard</p>
          <h1>로그인 후 첫 화면: 바로 업무를 시작하는 대시보드</h1>
          <p>최근 케이스, 빠른 시작, 샘플 실행을 한 시선 안에 묶어 바로 업무를 시작하게 구성했습니다.</p>
        </div>
      </div>

      <section className="dashboard-summary-strip">
        {summaryCards.map((card) => (
          <article key={card.label} className="dashboard-summary-tile">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.meta}</p>
          </article>
        ))}
        <article className="dashboard-summary-tile">
          <span>Current session</span>
          <strong>{session.organization}</strong>
          <p>{session.specialty} · {journeyContext.caseId}</p>
        </article>
      </section>

      <div className="dashboard-grid">
        <section className="dashboard-main-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="marketing-kicker">Recent cases</p>
              <h2>최근 분석한 케이스</h2>
            </div>
            <div className="dashboard-panel-actions">
              <input
                className="search-input"
                type="search"
                placeholder="최근 케이스 검색"
                aria-label="최근 케이스 검색"
              />
              <button type="button" className="secondary-button dashboard-new-case-button" onClick={onStartCase}>
                새 케이스
              </button>
            </div>
          </div>

          {cases.length > 0 ? (
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
          ) : (
            <p className="muted-text">아직 직접 입력하거나 실행한 케이스가 없습니다.</p>
          )}
        </section>

        <aside className="dashboard-side-panel">
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
