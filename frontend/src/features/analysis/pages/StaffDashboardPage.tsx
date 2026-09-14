import { ResultItem } from '../components/ResultItem';
import { SummaryTile } from '../components/SummaryTile';
import { useAnalysisResults } from '../hooks/useAnalysisResults';
import { usePatients } from '../hooks/usePatients';
import type { ResultEnvelope } from '../model/result';

type StaffDashboardPageProps = {
  accessToken: string;
  onOpenResult: (result: ResultEnvelope) => void;
  onStartAnalysis: (patientId?: string) => void;
};

const formatDate = (value: string | null) =>
  value ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value)) : '없음';

export function StaffDashboardPage({
  accessToken,
  onOpenResult,
  onStartAnalysis,
}: StaffDashboardPageProps) {
  const patients = usePatients(accessToken);
  const results = useAnalysisResults(accessToken);

  return (
    <main className="product-shell authenticated-content">
      <section className="workspace-page-shell staff-dashboard">
        <header className="workspace-page-header">
          <div>
            <p className="workspace-page-kicker">Clinical workspace</p>
            <h1>관리자 대시보드</h1>
            <p>등록된 환자와 분석 결과를 관리합니다.</p>
          </div>
          <div className="dashboard-panel-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={patients.loading || results.loading}
              onClick={() => { void patients.loadPatients(); void results.loadResults(); }}
            >
              새로고침
            </button>
            <button className="primary-button" type="button" onClick={() => onStartAnalysis()}>
              새 분석
            </button>
          </div>
        </header>

        <section className="dashboard-summary-strip" aria-label="관리자 대시보드 요약">
          <SummaryTile label="등록 환자" value={patients.items.length} description="환자 계정" />
          <SummaryTile label="전체 분석" value={results.items.length} description="저장된 결과" />
          <SummaryTile label="High risk" value={results.highRiskCount} description="고위험 결과" />
        </section>

        <section className="dashboard-main-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="workspace-page-kicker">Patients</p>
              <h2>등록 환자</h2>
            </div>
            <input
              className="search-input"
              aria-label="환자 검색"
              placeholder="환자 ID 검색"
              value={patients.query}
              onChange={(event) => patients.setQuery(event.target.value)}
            />
          </div>
          {patients.loading ? <p className="workspace-inline-output">등록된 환자를 불러오는 중입니다.</p> : null}
          {patients.error ? (
            <div className="workspace-inline-output" role="alert">
              <p>{patients.error}</p>
              <button className="secondary-button" type="button" onClick={patients.loadPatients}>다시 시도</button>
            </div>
          ) : null}
          {!patients.loading && !patients.error && patients.filteredItems.length === 0 ? (
            <p className="workspace-inline-output">등록된 환자가 없습니다.</p>
          ) : null}
          {!patients.loading && !patients.error && patients.filteredItems.length > 0 ? (
            <div className="staff-patient-list">
              {patients.filteredItems.map((patient) => {
                const latestResult = results.items.find((item) => item.patientId === patient.id);
                return (
                  <article className="staff-patient-row" key={patient.id}>
                    <div>
                      <code title={patient.id}>{patient.id}</code>
                      <p>최근 분석 {formatDate(patient.lastAnalysisAt)} · 결과 {patient.resultCount}건</p>
                    </div>
                    <span className={`status-badge status-${patient.latestRiskGroup?.toLowerCase() ?? 'unknown'}`}>
                      {patient.latestRiskGroup ?? '결과 없음'}
                    </span>
                    <div className="staff-patient-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={!latestResult?.resultPayload}
                        onClick={() => latestResult?.resultPayload && onOpenResult(latestResult.resultPayload)}
                      >
                        결과 보기
                      </button>
                      <button className="primary-button" type="button" onClick={() => onStartAnalysis(patient.id)}>
                        분석 시작
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="dashboard-main-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="workspace-page-kicker">Recent analyses</p>
              <h2>최근 분석 결과</h2>
            </div>
          </div>
          {results.loading ? <p className="workspace-inline-output">분석 결과를 불러오는 중입니다.</p> : null}
          {results.error ? <p className="workspace-inline-output">{results.error}</p> : null}
          {!results.loading && !results.error && results.items.length === 0 ? (
            <p className="workspace-inline-output">저장된 분석 결과가 없습니다.</p>
          ) : null}
          {!results.loading && !results.error && results.items.length > 0 ? (
            <div className="case-list">
              {results.items.slice(0, 10).map((item) => (
                <ResultItem key={item.id} item={item} onOpenResult={onOpenResult} />
              ))}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
