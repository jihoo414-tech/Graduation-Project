from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class InferenceUploadRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    birth_date: str
    gender: str
    stage: int
