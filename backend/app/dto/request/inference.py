from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict


class InferenceUploadRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    patient_id: UUID
    birth_date: str
    gender: str
    stage: int
