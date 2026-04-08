import type { MouseEventHandler } from 'react';
import type { CaseListItem } from '../../lib/cases';

type DashboardPageProps = {
  cases: CaseListItem[];
  onStartCase: MouseEventHandler<HTMLButtonElement>;
  onRunSampleCase: MouseEventHandler<HTMLButtonElement>;
};

export function DashboardPage({
  cases,
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
          <h2>로그인 후 첫 화면: 바로 업무를 시작하는 대시보드</h2>
          <p>핵심 현황과 다음 액션만 남겨 바로 새 케이스 생성이나 샘플 실행으로 이어지게 구성했습니다.</p>
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
      </section>

      <div className="dashboard-grid dashboard-grid-compact">
        <aside className="dashboard-side-panel dashboard-side-panel-dual-actions">
          <article className="dashboard-side-card">
            <p className="marketing-kicker">Start new</p>
            <h3>새 케이스 시작</h3>
            <p>이전 케이스 관리는 Cases 탭에서 확인하고, 대시보드에서는 새 작업 시작에 집중합니다.</p>
            <button type="button" className="secondary-button" onClick={onStartCase}>
              새 케이스 생성
            </button>
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
