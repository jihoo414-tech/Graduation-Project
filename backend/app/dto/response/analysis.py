from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

from app.domain.user import UserRole


class AnalysisResultListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    createdAt: str
    patientId: str | None = None
    riskGroup: Literal["High", "Low"] | None = None
    riskScore: float | None = None
    age: int | None = None
    gender: str | None = None
    stage: str | None = None
    variantCount: int | None = None
    resultPayload: dict[str, Any] | None = None


class AnalysisResultsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    viewerRole: UserRole
    items: list[AnalysisResultListItem]


class PatientListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    createdAt: str
    lastAnalysisAt: str | None = None
    latestRiskGroup: Literal["High", "Low"] | None = None
    resultCount: int = 0


class PatientListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[PatientListItem]
