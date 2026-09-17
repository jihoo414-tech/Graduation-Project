import { ResultItem } from '../components/ResultItem';
import { SummaryTile } from '../components/SummaryTile';
import { useAnalysisResults } from '../hooks/useAnalysisResults';
import { usePatients } from '../../patients/hooks/usePatients';
import type { ResultEnvelope } from '../model/result';
import { Pagination } from '../../../shared/ui/Pagination';
import type { UserRole } from '../../../shared/types/auth';
import { UserManagementPanel } from '../../admin/components/UserManagementPanel';

type StaffDashboardPageProps = {
  accessToken: string;
  onOpenResult: (result: ResultEnvelope) => void;
  onStartAnalysis: (patientId?: string) => void;
  currentUserId: string;
  viewerRole: Extract<UserRole, 'doctor' | 'admin'>;
};

const formatDate = (value: string | null) =>
  value ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value)) : '없음';

export function StaffDashboardPage({
  accessToken,
  onOpenResult,
  onStartAnalysis,
  currentUserId,
  viewerRole,
}: StaffDashboardPageProps) {
  const patients = usePatients(accessToken);
  const results = useAnalysisResults(accessToken);
  const confirmResultDelete = (resultId: string) => {
    if (window.confirm('이 분석 결과를 삭제하시겠습니까? 환자 화면에서도 더 이상 표시되지 않습니다.')) {
      void results.removeResult(resultId);
    }
  };
  const confirmPatientDelete = (patientId: string, patientName: string | null) => {
    if (window.confirm(
      `${patientName ?? '이름 미등록'} 환자의 등록을 해제하시겠습니까? 배정된 분석 결과도 목록에서 숨겨집니다.`,
    )) {
      void patients.removePatient(patientId);
    }
  };

  return (
    <main className="product-shell authenticated-content">
      <section className="workspace-page-shell staff-dashboard">
        <header className="workspace-page-header">
          <div>
            <p className="workspace-page-kicker">Clinical workspace</p>
            <h1>{viewerRole === 'admin' ? '관리자 대시보드' : '의사 대시보드'}</h1>
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

        <section className="dashboard-summary-strip staff-summary-strip" aria-label="관리자 대시보드 요약">
          <SummaryTile label="등록 환자" value={patients.items.length} description="환자 계정" />
          <SummaryTile label="전체 분석" value={results.total} description="저장된 결과" />
          <SummaryTile label="High risk" value={results.highRiskCount} description="고위험 결과" />
          <SummaryTile label="Low risk" value={results.lowRiskCount} description="저위험 결과" />
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
              placeholder="환자 이름 검색"
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
                      <strong>{patient.fullName ?? '이름 미등록'}</strong>
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
                      <button
                        className="danger-text-button"
                        type="button"
                        onClick={() => confirmPatientDelete(patient.id, patient.fullName)}
                      >
                        등록 해제
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
              {results.items.map((item) => (
                <ResultItem
                  key={item.id}
                  item={item}
                  onOpenResult={onOpenResult}
                  onDelete={confirmResultDelete}
                />
              ))}
            </div>
          ) : null}
          {!results.loading && !results.error ? (
            <Pagination
              page={results.page}
              totalPages={results.totalPages}
              onPageChange={results.setPage}
            />
          ) : null}
        </section>

        {viewerRole === 'admin' ? (
          <UserManagementPanel accessToken={accessToken} currentUserId={currentUserId} />
        ) : null}
      </section>
    </main>
  );
}
