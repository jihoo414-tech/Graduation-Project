from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict


class Summary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    risk_level: str
    risk_score: float
    text: str


class SurvivalCurvePoint(BaseModel):
    model_config = ConfigDict(extra="forbid")

    time: float
    survival_probability: float


class SurvivalCurveArtifact(BaseModel):
    kind: Literal["cohort_reference"] = "cohort_reference"
    label: str
    points: list[SurvivalCurvePoint]


class ExpressionScoreArtifact(BaseModel):
    model_config = ConfigDict(extra="forbid")

    stromal: float
    immune: float


class ModelScore(BaseModel):
    model_config = ConfigDict(extra="forbid")

    raw: float
    z_score: float


class ResultArtifacts(BaseModel):
    survival_curve: SurvivalCurveArtifact | None = None
    model_scores: dict[str, ModelScore] | None = None
    ensemble_score: float | None = None
    risk_group: Literal["High", "Low"] | None = None
    risk_threshold: float | None = None
    expression_scores: ExpressionScoreArtifact | None = None
    artifact_manifest_digest: str | None = None


class InferenceResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    adapter: str
    summary: Summary
    artifacts: ResultArtifacts
