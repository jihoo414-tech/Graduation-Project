import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode

from app.common.exceptions import AppError, error_detail
from app.infrastructure import supabase_client

ANALYSIS_RESULT_COLUMNS = [
    "id",
    "created_at",
    "user_id",
    "patient_id",
    "risk_group",
    "risk_score",
    "age",
    "gender",
    "stage",
    "variant_count",
    "result_payload",
]


def save_analysis_result(access_token: str, row: dict[str, Any]) -> None:
    try:
        status, _ = supabase_client.request(
            "/rest/v1/analysis_results",
            method="POST",
            access_token=access_token,
            body=row,
            prefer="return=minimal",
        )
        if status not in {200, 201, 204}:
            raise AppError(
                status_code=502,
                code="RESULT_SAVE_FAILED",
                message=(
                    "분석은 완료했지만 결과를 저장하지 못했습니다. 다시 시도하고 "
                    "문제가 계속되면 관리자에게 문의해 주세요."
                ),
                details=[error_detail("analysis_results", str(status))],
            )
    except HTTPError as exc:
        raise AppError(
            status_code=502,
            code="RESULT_SAVE_FAILED",
            message=(
                "분석은 완료했지만 결과를 저장하지 못했습니다. 다시 시도하고 "
                "문제가 계속되면 관리자에게 문의해 주세요."
            ),
            details=[error_detail("analysis_results", str(exc.code))],
        ) from exc
    except (URLError, TimeoutError) as exc:
        raise AppError(
            status_code=503,
            code="RESULT_SAVE_FAILED",
            message=(
                "분석은 완료했지만 저장 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."
            ),
            details=[error_detail("analysis_results", "unreachable")],
        ) from exc


def fetch_analysis_results(access_token: str, *, user_id: str | None) -> list[dict[str, Any]]:
    query_values = {
        "select": ",".join(ANALYSIS_RESULT_COLUMNS),
        "order": "created_at.desc,id.desc",
        "limit": "100",
    }
    if user_id is not None:
        query_values["user_id"] = f"eq.{user_id}"

    try:
        rows = []
        # Continue until empty, including when the server caps pages below our limit.
        while True:
            query_values["offset"] = str(len(rows))
            _, raw_payload = supabase_client.request(
                f"/rest/v1/analysis_results?{urlencode(query_values)}",
                method="GET",
                access_token=access_token,
            )
            page = json.loads(raw_payload.decode("utf-8"))
            if not page:
                break
            rows.extend(page)
    except HTTPError as exc:
        raise AppError(
            status_code=502,
            code="RESULT_LIST_FAILED",
            message=(
                "저장된 분석 결과를 조회하지 못했습니다. 다시 시도하고 문제가 "
                "계속되면 관리자에게 문의해 주세요."
            ),
            details=[error_detail("analysis_results", str(exc.code))],
        ) from exc
    except (URLError, TimeoutError) as exc:
        raise AppError(
            status_code=503,
            code="RESULT_LIST_FAILED",
            message=(
                "저장된 분석 결과를 조회하지 못했습니다. 다시 시도하고 문제가 "
                "계속되면 관리자에게 문의해 주세요."
            ),
            details=[error_detail("analysis_results", "unreachable")],
        ) from exc

    return rows
