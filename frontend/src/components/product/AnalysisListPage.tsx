import { useEffect, useMemo, useState } from 'react';
import {
  fetchAnalysisResults,
  filterAnalysisResults,
  type AnalysisResultListItem,
} from '../../lib/analysisResults';
import type { ResultEnvelope } from '../../lib/types';

type AnalysisListPageProps = {
  onOpenResult: (result: ResultEnvelope) => void;
  onStartAnalysis: () => void;
};

const formatRiskGroup = (riskGroup: AnalysisResultListItem['riskGroup']) =>
  riskGroup === 'High' ? 'High Risk' : riskGroup === 'Low' ? 'Low Risk' : '미분류';

const formatGender = (gender: string | null) =>
  gender === 'male' ? '남성' : gender === 'female' ? '여성' : '미입력';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const formatScore = (value: number | null) => (typeof value === 'number' ? value.toFixed(4) : '계산되지 않음');

export function AnalysisListPage({ onOpenResult, onStartAnalysis }: AnalysisListPageProps) {
  const [items, setItems] = useState<AnalysisResultListItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadResults = async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await fetchAnalysisResults());
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : '분석 결과 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadResults();
  }, []);

  const filteredItems = useMemo(() => filterAnalysisResults(items, query), [items, query]);
  const highRiskCount = items.filter((item) => item.riskGroup === 'High').length;
  const lowRiskCount = items.filter((item) => item.riskGroup === 'Low').length;

  return (
    <main className="product-shell authenticated-content">
      <section className="workspace-page-shell">
        <header className="workspace-page-header">
          <div>
            <p className="workspace-page-kicker">Saved results</p>
            <h1>분석 결과 목록</h1>
            <p>Supabase에 저장된 내 분석 결과를 최신순으로 조회하고 다시 열람합니다.</p>
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
          <article className="dashboard-summary-tile">
            <span>전체</span>
            <strong>{items.length}</strong>
            <p>저장된 분석 결과</p>
          </article>
          <article className="dashboard-summary-tile">
            <span>High risk</span>
            <strong>{highRiskCount}</strong>
            <p>고위험 분류</p>
          </article>
          <article className="dashboard-summary-tile">
            <span>Low risk</span>
            <strong>{lowRiskCount}</strong>
            <p>저위험 분류</p>
          </article>
        </section>

        <section className="dashboard-main-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="workspace-page-kicker">List</p>
              <h2>목록</h2>
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
                <button
                  key={item.id}
                  className="case-list-item case-list-item-button"
                  type="button"
                  onClick={() => item.resultPayload && onOpenResult(item.resultPayload)}
                  disabled={!item.resultPayload}
                >
                  <div>
                    <p className="workspace-page-kicker">{formatDate(item.createdAt)}</p>
                    <strong>{item.patientId}</strong>
                    <p>
                      {formatGender(item.gender)} · {item.age ? `${item.age}세` : '나이 미입력'} ·{' '}
                      {item.stage ? `Stage ${item.stage}` : '병기 미입력'} · 점수 {formatScore(item.riskScore)}
                    </p>
                  </div>
                  <div className="case-list-meta">
                    <span className={`status-badge status-${item.riskGroup?.toLowerCase() ?? 'unknown'}`}>
                      {formatRiskGroup(item.riskGroup)}
                    </span>
                    <span className="case-list-action-label">결과 보기</span>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
