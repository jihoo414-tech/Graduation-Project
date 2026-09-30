import type { SurvivalCurve } from '../model/result';

export function SurvivalCurveChart({ curve }: { curve: SurvivalCurve | null }) {
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
