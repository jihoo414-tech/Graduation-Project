from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.dto.internal.model_features import ModelFeatures


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


class NormalizedPatientInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    deidentified_patient_id: str
    gene_variants: list[GeneVariant]
    clinical: ClinicalInfo
    model_features: ModelFeatures | None = Field(default=None, exclude=True)


class PatientReference(BaseModel):
    model_config = ConfigDict(extra="forbid")

    deidentified_patient_id: str
