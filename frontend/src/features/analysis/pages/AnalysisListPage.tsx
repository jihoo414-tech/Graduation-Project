import { useAnalysisResults } from '../hooks/useAnalysisResults';
import { SummaryTile } from '../components/SummaryTile';
import { ResultItem } from '../components/ResultItem';
import type { ResultEnvelope } from '../model/result';

type AnalysisListPageProps = {
  accessToken: string;
  onOpenResult: (result: ResultEnvelope) => void;
  onStartAnalysis: () => void;
};


export function AnalysisListPage({ accessToken, onOpenResult, onStartAnalysis }: AnalysisListPageProps) {
  const { items, viewerRole, query, setQuery, loading, error, loadResults, filteredItems, highRiskCount, lowRiskCount } = useAnalysisResults(accessToken);
  return (
    <main className="product-shell authenticated-content">
      <section className="workspace-page-shell">
        <header className="workspace-page-header">
          <div>
            <p className="workspace-page-kicker">Dashboard</p>
            <h1>LUAD 생존 위험 분석</h1>
            <p>새 분석을 시작하면, 데이터베이스에 자동으로 저장됩니다.</p>
          </div>
          <div className="dashboard-panel-actions">
            <button className="secondary-button dashboard-new-case-button" type="button" onClick={loadResults} disabled={loading}>
              새로고침
            </button>
            <button className="primary-button dashboard-new-case-button" type="button" onClick={onStartAnalysis}>
              새 분석
            </button>
          </div>
        </header>

        <section className="dashboard-summary-strip" aria-label="저장된 분석 결과 요약">
          <SummaryTile label="전체" value={items.length} description="저장된 분석 결과" />
          <SummaryTile label="High risk" value={highRiskCount} description="고위험 분류" />
          <SummaryTile label="Low risk" value={lowRiskCount} description="저위험 분류" />
        </section>

        <section className="dashboard-main-panel">
          <div className="dashboard-panel-heading">
            <div>
            <p className="workspace-page-kicker">Saved results</p>
              <h2>{viewerRole === 'admin' ? '전체 환자 분석 결과' : viewerRole === 'doctor' ? '저장된 분석 결과' : '내 분석 결과'}</h2>
            </div>
            <input
              className="search-input"
              aria-label="분석 결과 검색"
              placeholder="환자 ID, 위험군, 병기, 성별 검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {loading ? <p className="muted-text">저장된 분석 결과를 불러오는 중입니다.</p> : null}

          {error ? (
            <div className="workspace-inline-output" role="alert">
              <p>{error}</p>
              <button className="secondary-button" type="button" onClick={loadResults}>
                다시 시도
              </button>
            </div>
          ) : null}

          {!loading && !error && filteredItems.length === 0 ? (
            <div className="workspace-inline-output">
              <p>{items.length === 0 ? '아직 저장된 분석 결과가 없습니다.' : '검색 조건에 맞는 결과가 없습니다.'}</p>
              {items.length === 0 ? (
                <button className="primary-button dashboard-new-case-button" type="button" onClick={onStartAnalysis}>
                  첫 분석 시작
                </button>
              ) : null}
            </div>
          ) : null}

          {!loading && !error && filteredItems.length > 0 ? (
            <div className="case-list" aria-label="저장된 분석 결과">
              {filteredItems.map((item) => (
                <ResultItem key={item.id} item={item} onOpenResult={onOpenResult} />
              ))}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
