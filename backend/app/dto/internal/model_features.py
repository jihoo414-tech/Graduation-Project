from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class ModelFeatures(BaseModel):
    model_config = ConfigDict(extra="forbid")

    contract_version: str = "feature-contract-v1"
    values: list[float]
    stromal_score: float
    immune_score: float
