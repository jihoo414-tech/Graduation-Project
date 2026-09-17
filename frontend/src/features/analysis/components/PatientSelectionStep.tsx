import { usePatients } from '../../patients/hooks/usePatients';

type PatientSelectionStepProps = {
  accessToken: string;
  selectedPatientId: string;
  onSelect: (patientId: string) => void;
  onContinue: () => void;
  onDashboard: () => void;
};

const formatDate = (value: string | null) =>
  value ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value)) : '없음';

export function PatientSelectionStep({
  accessToken,
  selectedPatientId,
  onSelect,
  onContinue,
  onDashboard,
}: PatientSelectionStepProps) {
  const { filteredItems, query, setQuery, loading, error, loadPatients } = usePatients(accessToken);

  return (
    <>
      <div className="analysis-step-banner">
        <span>01</span>
        <div>
          <strong>환자 선택</strong>
          <p>분석 결과를 등록할 환자 계정을 선택합니다.</p>
        </div>
      </div>
      <div className="patient-selection-toolbar">
        <label>
          <span>환자 검색</span>
          <input
            className="search-input"
            placeholder="환자 이름 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      {loading ? <p className="workspace-inline-output">등록된 환자를 불러오는 중입니다.</p> : null}
      {error ? (
        <div className="workspace-inline-output" role="alert">
          <p>{error}</p>
          <button className="secondary-button" type="button" onClick={loadPatients}>다시 시도</button>
        </div>
      ) : null}
      {!loading && !error && filteredItems.length === 0 ? (
        <p className="workspace-inline-output">등록된 환자가 없습니다.</p>
      ) : null}
      {!loading && !error && filteredItems.length > 0 ? (
        <div className="patient-selection-list" role="radiogroup" aria-label="등록된 환자">
          {filteredItems.map((patient) => (
            <label
              className={`patient-selection-row ${selectedPatientId === patient.id ? 'is-selected' : ''}`}
              key={patient.id}
            >
              <input
                type="radio"
                name="patient"
                value={patient.id}
                checked={selectedPatientId === patient.id}
                onChange={() => onSelect(patient.id)}
              />
              <div className="patient-identity">
                <strong>{patient.fullName ?? '이름 미등록'}</strong>
              </div>
              <span>최근 분석 {formatDate(patient.lastAnalysisAt)}</span>
              <span>{patient.resultCount}건</span>
            </label>
          ))}
        </div>
      ) : null}
      <div className="button-row analysis-actions">
        <button className="secondary-button" type="button" onClick={onDashboard}>대시보드</button>
        <button className="primary-button" type="button" onClick={onContinue} disabled={!selectedPatientId}>
          다음 단계
        </button>
      </div>
    </>
  );
}
