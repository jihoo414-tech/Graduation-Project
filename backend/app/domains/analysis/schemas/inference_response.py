from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.domains.analysis.schemas.patient import NormalizedPatientInput, PatientReference
from app.domains.analysis.schemas.prediction import InferenceResult


class InferenceSuccessResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    result_version: Literal["v1", "v2"]
    patient: PatientReference
    normalized_input: NormalizedPatientInput
    result: InferenceResult
    warnings: list[str] = Field(default_factory=list)
