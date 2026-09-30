import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode

from app.common.exceptions import AppError, error_detail
from app.infrastructure import supabase_client


def fetch_patients(access_token: str) -> list[dict[str, Any]]:
    query = urlencode(
        {
            "select": "id,full_name,created_at",
            "role": "eq.patient",
            "deleted_at": "is.null",
            "order": "full_name.asc.nullslast,created_at.desc",
        }
    )
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


def fetch_patient(access_token: str, patient_id: str) -> dict[str, Any] | None:
    query = urlencode(
        {
            "select": "id,full_name",
            "id": f"eq.{patient_id}",
            "role": "eq.patient",
            "deleted_at": "is.null",
            "limit": "1",
        }
    )
    try:
        _, raw_payload = supabase_client.request(
            f"/rest/v1/profiles?{query}", method="GET", access_token=access_token
        )
        rows = json.loads(raw_payload.decode("utf-8"))
        return rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    except (HTTPError, URLError, TimeoutError) as exc:
        raise AppError(
            status_code=502,
            code="PATIENT_LOOKUP_FAILED",
            message="선택한 환자 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
            details=[error_detail("patient_id", "unavailable")],
        ) from exc


def soft_delete_patient(access_token: str, patient_id: str) -> bool:
    try:
        _, raw_payload = supabase_client.request(
            "/rest/v1/rpc/soft_delete_patient",
            method="POST",
            access_token=access_token,
            body={"target_patient_id": patient_id},
        )
        return json.loads(raw_payload.decode("utf-8")) is True
    except (HTTPError, URLError, TimeoutError) as exc:
        raise AppError(
            status_code=502,
            code="PATIENT_DELETE_FAILED",
            message="환자 등록을 해제하지 못했습니다. 잠시 후 다시 시도해 주세요.",
            details=[error_detail("patient_id", "soft_delete_failed")],
        ) from exc
