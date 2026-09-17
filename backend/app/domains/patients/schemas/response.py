from typing import Literal

from pydantic import BaseModel, ConfigDict


class PatientListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    fullName: str | None = None
    createdAt: str
    lastAnalysisAt: str | None = None
    latestRiskGroup: Literal["High", "Low"] | None = None
    resultCount: int = 0


class PatientListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[PatientListItem]
