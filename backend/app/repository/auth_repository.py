import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode

from app.common.exceptions import AppError, error_detail
from app.infrastructure import supabase_client


def fetch_auth_user(access_token: str) -> dict[str, Any]:
    try:
        _, raw_payload = supabase_client.request(
            "/auth/v1/user",
            method="GET",
            access_token=access_token,
        )
        payload = json.loads(raw_payload.decode("utf-8"))
    except HTTPError as exc:
        raise AppError(
            status_code=401,
            code="AUTH_REQUIRED",
            message=(
                "로그인이 만료되었거나 로그인 정보가 유효하지 않습니다. 다시 로그인해 주세요."
            ),
            details=[error_detail("Authorization", str(exc.code))],
        ) from exc
    except (URLError, TimeoutError) as exc:
        raise AppError(
            status_code=503,
            code="SUPABASE_NOT_CONFIGURED",
            message="로그인 확인 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
            details=[error_detail("SUPABASE_URL", "unreachable")],
        ) from exc

    return payload


def fetch_profile_role(access_token: str, user_id: str) -> str | None:
    query = urlencode(
        {
            "select": "role",
            "id": f"eq.{user_id}",
            "limit": "1",
        }
    )
    try:
        _, raw_payload = supabase_client.request(
            f"/rest/v1/profiles?{query}",
            method="GET",
            access_token=access_token,
        )
    except HTTPError as exc:
        if exc.code in {404, 406}:
            return None
        raise

    rows = json.loads(raw_payload.decode("utf-8"))
    if not isinstance(rows, list) or not rows:
        return None

    role = rows[0].get("role") if isinstance(rows[0], dict) else None
    return role
