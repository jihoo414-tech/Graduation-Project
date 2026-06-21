from __future__ import annotations

from collections import defaultdict

from app.schemas import SurvivalCurveArtifact, SurvivalCurvePoint


def build_km_curve(rows: list[dict[str, str]], *, risk_group: str) -> SurvivalCurveArtifact:
    parsed = [_parse_row(row) for row in rows if row.get("risk_group") == risk_group]
    group_rows = [row for row in parsed if row is not None]
    events, censored = defaultdict(int), defaultdict(int)
    for time, event in group_rows:
        (events if event else censored)[time] += 1
    at_risk, survival = len(group_rows), 1.0
    points = [SurvivalCurvePoint(time=0, survival_probability=1.0)]
    for time in sorted(set(events) | set(censored)):
        if at_risk and events[time]:
            survival *= 1 - events[time] / at_risk
            points.append(SurvivalCurvePoint(time=time, survival_probability=round(survival, 3)))
        at_risk -= events[time] + censored[time]
    return SurvivalCurveArtifact(label=f"{risk_group} risk Kaplan-Meier reference", points=points)


def _parse_row(row: dict[str, str]) -> tuple[float, bool] | None:
    try:
        return float(row["time"]), (row.get("event") or "").strip().lower() == "true"
    except (KeyError, TypeError, ValueError):
        return None
