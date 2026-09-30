import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode

from app.common.exceptions import AppError, error_detail
from app.infrastructure import supabase_client


def fetch_users(access_token: str) -> list[dict[str, Any]]:
    query = urlencode(
        {
            "select": "id,full_name,role",
            "deleted_at": "is.null",
            "order": "full_name.asc.nullslast,created_at.asc",
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
            code="USER_LIST_FAILED",
            message="사용자 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
            details=[error_detail("profiles", "unavailable")],
        ) from exc


def update_role(access_token: str, user_id: str, role: str) -> bool:
    try:
        _, raw_payload = supabase_client.request(
            "/rest/v1/rpc/set_profile_role",
            method="POST",
            access_token=access_token,
            body={"target_user_id": user_id, "new_role": role},
        )
        return json.loads(raw_payload.decode("utf-8")) is True
    except (HTTPError, URLError, TimeoutError) as exc:
        raise AppError(
            status_code=502,
            code="ROLE_UPDATE_FAILED",
            message="사용자 역할을 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.",
            details=[error_detail("role", "update_failed")],
        ) from exc
