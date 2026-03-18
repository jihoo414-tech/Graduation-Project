from __future__ import annotations

from typing import Any, Literal

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


class NormalizedPatientInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    deidentified_patient_id: str
    gene_variants: list[GeneVariant]
    clinical: ClinicalInfo


class PatientReference(BaseModel):
    model_config = ConfigDict(extra="forbid")

    deidentified_patient_id: str


class Summary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    risk_level: str
    risk_score: float
    text: str


class ExplanationArtifact(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    detail: str


class SurvivalCurvePoint(BaseModel):
    model_config = ConfigDict(extra="forbid")

    time: float
    survival_probability: float


class SurvivalCurveArtifact(BaseModel):
    label: str
    points: list[SurvivalCurvePoint]


class ResultArtifacts(BaseModel):
    survival_curve: SurvivalCurveArtifact | None = None
    explanations: list[ExplanationArtifact] = Field(default_factory=list)


class InferenceResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    adapter: str
    summary: Summary
    artifacts: ResultArtifacts


class InferenceSuccessResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    result_version: Literal["v1"]
    patient: PatientReference
    normalized_input: NormalizedPatientInput
    result: InferenceResult
    warnings: list[str] = Field(default_factory=list)


class ContractExamplesResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    csv_example: str
    json_example: dict[str, Any]
    envelope_example: InferenceSuccessResponse


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok"]
    adapter: str
