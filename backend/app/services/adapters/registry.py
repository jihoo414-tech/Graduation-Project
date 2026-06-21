from __future__ import annotations

import os
from functools import lru_cache

from app.services.adapters.base import InferenceAdapter
from app.services.adapters.real_ensemble import RealEnsembleAdapter
from app.services.errors import AppError, error_detail

INFERENCE_ADAPTER_ENV = "INFERENCE_ADAPTER"
DEFAULT_INFERENCE_ADAPTER = "real_ensemble"


@lru_cache(maxsize=1)
def get_inference_adapter() -> InferenceAdapter:
    adapter_name = os.getenv(INFERENCE_ADAPTER_ENV, DEFAULT_INFERENCE_ADAPTER).strip().lower()

    if adapter_name in {"", "real_ensemble"}:
        return RealEnsembleAdapter()

    raise AppError(
        status_code=500,
        code="INFERENCE_ADAPTER_NOT_SUPPORTED",
        message="Configured inference adapter is not supported.",
        details=[error_detail(INFERENCE_ADAPTER_ENV, adapter_name or "empty")],
    )


def clear_inference_adapter_cache() -> None:
    get_inference_adapter.cache_clear()
