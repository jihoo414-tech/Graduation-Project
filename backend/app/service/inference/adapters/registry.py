from __future__ import annotations

import os
from functools import lru_cache

from app.common.exceptions import AppError, error_detail
from app.service.inference.adapters.base import InferenceAdapter
from app.service.inference.adapters.real_ensemble import RealEnsembleAdapter

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
        message="서버의 분석 모델 설정에 문제가 있습니다. 관리자에게 문의해 주세요.",
        details=[error_detail(INFERENCE_ADAPTER_ENV, adapter_name or "empty")],
    )


def clear_inference_adapter_cache() -> None:
    get_inference_adapter.cache_clear()
