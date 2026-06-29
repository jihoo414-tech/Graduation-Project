import type { ResultEnvelope, SurvivalCurve } from '../../lib/types';

type ResultPageProps = {
  result: ResultEnvelope;
  onBackToCases: () => void;
};

const formatScore = (value: number | undefined, digits = 4) =>
  typeof value === 'number' ? value.toFixed(digits) : '계산되지 않음';

const formatRiskGroup = (riskGroup: 'High' | 'Low' | undefined) =>
  riskGroup === 'High' ? 'High Risk' : riskGroup === 'Low' ? 'Low Risk' : '위험군 미분류';

function SurvivalCurveChart({ curve }: { curve: SurvivalCurve | null }) {
  if (!curve || curve.points.length === 0) {
    return <p className="muted-text">표시할 Kaplan-Meier 기준 곡선이 없습니다.</p>;
  }

  const points = [...curve.points].sort((left, right) => left.time - right.time);
  const maxTime = Math.max(...points.map((point) => point.time), 1);
  const width = 680;
  const height = 260;
  const padding = { top: 18, right: 20, bottom: 38, left: 46 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const toX = (time: number) => padding.left + (time / maxTime) * chartWidth;
  const toY = (probability: number) => padding.top + (1 - probability) * chartHeight;
  const xTicks = Array.from({ length: Math.floor(maxTime / 500) + 1 }, (_, index) => index * 500);
  if (xTicks.at(-1) !== maxTime) {
    xTicks.push(Math.round(maxTime));
  }
  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(point.time)} ${toY(point.survival_probability)}`)
    .join(' ');

  return (
    <div className="survival-chart" role="img" aria-label={`${curve.label} Kaplan-Meier curve`}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {[0, 0.25, 0.5, 0.75, 1].map((value) => (
          <g key={value}>
            <line x1={padding.left} x2={width - padding.right} y1={toY(value)} y2={toY(value)} />
            <text x={padding.left - 8} y={toY(value) + 4} textAnchor="end">
              {Math.round(value * 100)}%
            </text>
          </g>
        ))}
        <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} />
        {xTicks.map((time) => (
          <g key={time}>
            <line x1={toX(time)} x2={toX(time)} y1={height - padding.bottom} y2={height - padding.bottom + 5} />
            <text x={toX(time)} y={height - padding.bottom + 19} textAnchor="middle">
              {time}일
            </text>
          </g>
        ))}
        <path d={path} />
        {points.map((point) => (
          <circle key={`${point.time}-${point.survival_probability}`} cx={toX(point.time)} cy={toY(point.survival_probability)} r="3" />
        ))}
        <text x={width / 2} y={height - 8} textAnchor="middle">
          Disease-Free Survival Time (days)
        </text>
      </svg>
      <p className="muted-text">{curve.label}</p>
    </div>
  );
}

export function ResultPage({ result, onBackToCases }: ResultPageProps) {
  const { artifacts, summary } = result.result;
  const clinical = result.normalized_input.clinical;
  const expressionScores = artifacts.expression_scores;

  return (
    <main className="product-shell authenticated-content">
      <section className="workspace-page-shell result-page-shell">
        <header className="workspace-page-header result-page-header">
          <div>
            <p className="workspace-page-kicker">Dashboard</p>
            <h1>분석 결과 대시보드</h1>
            <p>환자별 앙상블 위험도와 생존 분석 정보를 한 화면에서 확인합니다.</p>
          </div>
          <button type="button" className="secondary-button" onClick={onBackToCases}>
            새 분석
          </button>
        </header>

        <section className="result-hero-grid" aria-label="분석 결과 요약">
          <article className="result-hero-card">
            <span>비식별 환자 ID</span>
            <strong>{result.patient.deidentified_patient_id}</strong>
          </article>
          <article className={`result-hero-card risk-${artifacts.risk_group?.toLowerCase() ?? 'unknown'}`}>
            <span>앙상블 위험군</span>
            <strong>{formatRiskGroup(artifacts.risk_group)}</strong>
          </article>
          <article className="result-hero-card">
            <span>앙상블 점수</span>
            <strong>{formatScore(artifacts.ensemble_score ?? summary.risk_score)}</strong>
          </article>
        </section>

        <p className="clinical-disclaimer">
          이 결과는 임상 의사결정 보조용 위험 예측 정보이며, 진단 또는 치료 결정을 대체하지 않습니다.
        </p>

        <section className="result-section result-section-grid dashboard-chart-grid">
          <div>
            <div className="section-heading">
              <p className="workspace-page-kicker">Survival analysis</p>
              <h2>Kaplan-Meier 생존 분석</h2>
            </div>
            <SurvivalCurveChart curve={artifacts.survival_curve} />
          </div>
          <article className="threshold-card">
            <h3>위험군 기준</h3>
            {typeof artifacts.risk_threshold === 'number' ? (
              <p>
                앙상블 점수가 <strong>{artifacts.risk_threshold.toFixed(4)}</strong> 이상이면 High Risk, 미만이면 Low
                Risk로 분류합니다.
              </p>
            ) : (
              <p>현재 결과는 위험군 기준값을 제공하지 않습니다.</p>
            )}
            <p className="muted-text">
              곡선은 현재 환자의 개인 생존확률이 아니라, 동일 위험군 참조 코호트의 Kaplan-Meier 곡선입니다.
            </p>
          </article>
        </section>

        <section className="result-section">
          <div className="section-heading">
            <p className="workspace-page-kicker">Input summary</p>
            <h2>모델 입력 요약</h2>
          </div>
          <div className="input-summary-grid">
            <article className="workspace-summary-card">
              <h3>나이</h3>
              <strong>{clinical.age ? `${clinical.age}세` : '미입력'}</strong>
            </article>
            <article className="workspace-summary-card">
              <h3>성별</h3>
              <strong>{clinical.gender === 'male' ? '남성' : clinical.gender === 'female' ? '여성' : '미입력'}</strong>
            </article>
            <article className="workspace-summary-card">
              <h3>병기</h3>
              <strong>{clinical.pathologic_stage ? `Stage ${clinical.pathologic_stage}` : '미입력'}</strong>
            </article>
            <article className="workspace-summary-card">
              <h3>변이 유전자 수</h3>
              <strong>{result.normalized_input.gene_variants.length}개</strong>
            </article>
            <article className="workspace-summary-card">
              <h3>Stromal score</h3>
              <strong>{formatScore(expressionScores?.stromal)}</strong>
            </article>
            <article className="workspace-summary-card">
              <h3>Immune score</h3>
              <strong>{formatScore(expressionScores?.immune)}</strong>
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}
