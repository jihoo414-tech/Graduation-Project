import type { AnalysisResultListItem } from '../model/savedResults';
import type { ResultEnvelope } from '../model/result';

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

type ResultItemProps = {
  item: AnalysisResultListItem;
  onOpenResult: (result: ResultEnvelope) => void;
};

export function ResultItem({ item, onOpenResult }: ResultItemProps) {
  const patientLabel = item.patientId ?? '내 분석 결과';

  return (
    <button
      className="case-list-item case-list-item-button"
      type="button"
      onClick={() => item.resultPayload && onOpenResult(item.resultPayload)}
      disabled={!item.resultPayload}
    >
      <div>
        <p className="workspace-page-kicker">{formatDate(item.createdAt)}</p>
        <strong>{patientLabel}</strong>
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
  );
}
