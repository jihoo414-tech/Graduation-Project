import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode

from app.common.exceptions import AppError, error_detail
from app.infrastructure import supabase_client


def fetch_patients(access_token: str) -> list[dict[str, Any]]:
    query = urlencode({"select": "id,created_at", "role": "eq.patient", "order": "created_at.desc"})
    try:
        _, raw_payload = supabase_client.request(
            f"/rest/v1/profiles?{query}", method="GET", access_token=access_token
        )
        rows = json.loads(raw_payload.decode("utf-8"))
        return rows if isinstance(rows, list) else []
    except (HTTPError, URLError, TimeoutError) as exc:
        raise AppError(
            status_code=502,
            code="PATIENT_LIST_FAILED",
            message="등록된 환자 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
            details=[error_detail("profiles", "unavailable")],
        ) from exc


def patient_exists(access_token: str, patient_id: str) -> bool:
    query = urlencode(
        {"select": "id", "id": f"eq.{patient_id}", "role": "eq.patient", "limit": "1"}
    )
    try:
        _, raw_payload = supabase_client.request(
            f"/rest/v1/profiles?{query}", method="GET", access_token=access_token
        )
        rows = json.loads(raw_payload.decode("utf-8"))
        return isinstance(rows, list) and bool(rows)
    except (HTTPError, URLError, TimeoutError) as exc:
        raise AppError(
            status_code=502,
            code="PATIENT_LOOKUP_FAILED",
            message="선택한 환자 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
            details=[error_detail("patient_id", "unavailable")],
        ) from exc
