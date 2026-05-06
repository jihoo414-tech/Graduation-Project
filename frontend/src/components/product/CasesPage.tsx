import type { ChangeEventHandler, MouseEventHandler } from 'react';
import { caseStatusClassByLabel, filterCases, type CaseListItem } from '../../lib/cases';

type CasesPageProps = {
  cases: CaseListItem[];
  searchQuery: string;
  onSearchChange: ChangeEventHandler<HTMLInputElement>;
  onDeleteCase: (caseId: string) => void;
  onCreateNewCase: MouseEventHandler<HTMLButtonElement>;
};

export function CasesPage({
  cases,
  searchQuery,
  onSearchChange,
  onDeleteCase,
  onCreateNewCase,
}: CasesPageProps) {
  const filteredCases = filterCases(cases, searchQuery);

  return (
    <main className="product-shell">
      <div className="product-page-header">
        <div>
          <p className="workspace-page-kicker">Cases</p>
          <h1>이전에 생성한 케이스</h1>
          <p>최근 작업한 케이스를 먼저 확인하고, 필요할 때 새 케이스를 추가할 수 있습니다.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-main-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="marketing-kicker">Existing cases</p>
              <h2>최근 생성한 케이스</h2>
            </div>
            <div className="dashboard-panel-actions">
              <input
                className="search-input"
                type="search"
                placeholder="케이스 검색"
                aria-label="케이스 검색"
                value={searchQuery}
                onChange={onSearchChange}
              />
              <button type="button" className="secondary-button dashboard-new-case-button" onClick={onCreateNewCase}>
                새 케이스
              </button>
            </div>
          </div>

          <div className="case-list">
            {filteredCases.map((caseItem) => (
              <article key={caseItem.id} className="case-list-item">
                <div>
                  <strong>{caseItem.id}</strong>
                  <p>{caseItem.cancerType}</p>
                </div>
                <div className="case-list-meta">
                  <span className={`status-badge status-${caseStatusClassByLabel[caseItem.status]}`}>
                    {caseItem.status}
                  </span>
                  <small>{caseItem.updatedAt}</small>
                  <button
                    type="button"
                    className="secondary-button case-delete-button"
                    onClick={() => onDeleteCase(caseItem.id)}
                  >
                    삭제
                  </button>
                </div>
              </article>
            ))}
          </div>

          {filteredCases.length === 0 ? <p className="muted-text">검색어와 일치하는 케이스가 없습니다.</p> : null}
        </section>

        <aside className="dashboard-side-panel">
          <article className="dashboard-side-card caution-card">
            <p className="marketing-kicker">Create another</p>
            <h3>새 케이스 시작</h3>
            <p>새 케이스를 생성하면 현재 입력 draft가 새로운 흐름으로 전환됩니다.</p>
            <button type="button" className="secondary-button" onClick={onCreateNewCase}>
              새 케이스 생성
            </button>
          </article>
        </aside>
      </div>
    </main>
  );
}
