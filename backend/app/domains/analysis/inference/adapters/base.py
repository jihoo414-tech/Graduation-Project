from __future__ import annotations

from typing import Protocol

from app.domains.analysis.schemas.inference_response import InferenceSuccessResponse
from app.domains.analysis.schemas.patient import NormalizedPatientInput


class InferenceAdapter(Protocol):
    name: str

    def run(self, patient: NormalizedPatientInput) -> InferenceSuccessResponse:
        """Return a v1 inference envelope for an already-normalized patient input."""
