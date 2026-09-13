import json
from typing import Any
from urllib.request import Request, urlopen

from app.common.config import get_setting
from app.common.exceptions import AppError, error_detail


def _supabase_url() -> str:
    return get_setting("SUPABASE_URL", frontend_name="VITE_SUPABASE_URL").rstrip("/")


def _supabase_anon_key() -> str:
    return get_setting("SUPABASE_ANON_KEY", frontend_name="VITE_SUPABASE_ANON_KEY")


def _require_config() -> tuple[str, str]:
    url = _supabase_url()
    anon_key = _supabase_anon_key()
    if not url or not anon_key:
        raise AppError(
            status_code=503,
            code="SUPABASE_NOT_CONFIGURED",
            message=(
                "서버의 계정 및 저장 서비스 연결 설정이 완료되지 않았습니다. "
                "관리자에게 문의해 주세요."
            ),
            details=[
                error_detail("SUPABASE_URL", "required"),
                error_detail("SUPABASE_ANON_KEY", "required"),
            ],
        )
    return url, anon_key


def request(
    path: str,
    *,
    method: str,
    access_token: str,
    body: dict[str, Any] | None = None,
    prefer: str | None = None,
) -> tuple[int, bytes]:
    url, anon_key = _require_config()
    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {access_token}",
    }
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    if prefer:
        headers["Prefer"] = prefer

    request = Request(
        f"{url}{path}",
        data=data,
        headers=headers,
        method=method,
    )
    with urlopen(request, timeout=12) as response:
        return response.status, response.read()
