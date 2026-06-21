from __future__ import annotations

from typing import Protocol

from app.schemas import InferenceSuccessResponse, NormalizedPatientInput


class InferenceAdapter(Protocol):
    name: str

    def run(self, patient: NormalizedPatientInput) -> InferenceSuccessResponse:
        """Return a v1 inference envelope for an already-normalized patient input."""
