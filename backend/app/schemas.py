from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ErrorDetail(BaseModel):
    field: str
    rule: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[ErrorDetail] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    error: ErrorBody


class GeneVariant(BaseModel):
    model_config = ConfigDict(extra="forbid")

    gene: str
    variant_classification: str


class ClinicalInfo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    age: int | None = None
    pathologic_stage: str | None = None
    gender: str | None = None
    stage: int | None = Field(default=None, exclude=True)


class ModelFeatures(BaseModel):
    model_config = ConfigDict(extra="forbid")

    contract_version: str = "feature-contract-v1"
    values: list[float]
    stromal_score: float
    immune_score: float


class NormalizedPatientInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    deidentified_patient_id: str
    gene_variants: list[GeneVariant]
    clinical: ClinicalInfo
    model_features: ModelFeatures | None = Field(default=None, exclude=True)


class PatientReference(BaseModel):
    model_config = ConfigDict(extra="forbid")

    deidentified_patient_id: str


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


class ResultArtifacts(BaseModel):
    survival_curve: SurvivalCurveArtifact | None = None
    model_scores: dict[str, ModelScore] | None = None
    ensemble_score: float | None = None
    risk_group: Literal["High", "Low"] | None = None
    risk_threshold: float | None = None
    expression_scores: ExpressionScoreArtifact | None = None
    artifact_manifest_digest: str | None = None


class ModelScore(BaseModel):
    model_config = ConfigDict(extra="forbid")

    raw: float
    z_score: float


class InferenceResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    adapter: str
    summary: Summary
    artifacts: ResultArtifacts


class InferenceSuccessResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    result_version: Literal["v1", "v2"]
    patient: PatientReference
    normalized_input: NormalizedPatientInput
    result: InferenceResult
    warnings: list[str] = Field(default_factory=list)


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok"]
    adapter: str
