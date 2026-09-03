from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.config import get_setting
from app.schemas import InferenceSuccessResponse
from app.services.errors import AppError, error_detail


@dataclass(frozen=True)
class SupabaseUser:
    id: str
    email: str | None = None


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
            message="Supabase URL and anon key are required.",
            details=[
                error_detail("SUPABASE_URL", "required"),
                error_detail("SUPABASE_ANON_KEY", "required"),
            ],
        )
    return url, anon_key


def access_token_from_authorization(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AppError(
            status_code=401,
            code="AUTH_REQUIRED",
            message="A Supabase access token is required.",
            details=[error_detail("Authorization", "bearer_token")],
        )
    token = authorization[7:].strip()
    if not token:
        raise AppError(
            status_code=401,
            code="AUTH_REQUIRED",
            message="A Supabase access token is required.",
            details=[error_detail("Authorization", "bearer_token")],
        )
    return token


def verify_supabase_user(access_token: str) -> SupabaseUser:
    url, anon_key = _require_config()
    request = Request(
        f"{url}/auth/v1/user",
        headers={
            "apikey": anon_key,
            "Authorization": f"Bearer {access_token}",
        },
        method="GET",
    )
    try:
        with urlopen(request, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        raise AppError(
            status_code=401,
            code="AUTH_REQUIRED",
            message="The Supabase session is invalid or expired.",
            details=[error_detail("Authorization", str(exc.code))],
        ) from exc
    except (URLError, TimeoutError) as exc:
        raise AppError(
            status_code=503,
            code="SUPABASE_NOT_CONFIGURED",
            message="Could not reach Supabase Auth.",
            details=[error_detail("SUPABASE_URL", "unreachable")],
        ) from exc

    user_id = payload.get("id")
    if not isinstance(user_id, str) or not user_id:
        raise AppError(
            status_code=401,
            code="AUTH_REQUIRED",
            message="The Supabase session is invalid.",
            details=[error_detail("Authorization", "invalid_user")],
        )
    return SupabaseUser(id=user_id, email=payload.get("email"))


def save_analysis_result(
    access_token: str, user: SupabaseUser, result: InferenceSuccessResponse
) -> None:
    url, anon_key = _require_config()
    result_payload = result.model_dump(mode="json")
    artifacts = result.result.artifacts
    clinical = result.normalized_input.clinical
    expression_scores = artifacts.expression_scores

    row: dict[str, Any] = {
        "user_id": user.id,
        "patient_id": result.patient.deidentified_patient_id,
        "risk_group": artifacts.risk_group,
        "risk_score": (
            artifacts.ensemble_score
            if artifacts.ensemble_score is not None
            else result.result.summary.risk_score
        ),
        "risk_threshold": artifacts.risk_threshold,
        "age": clinical.age,
        "gender": clinical.gender,
        "stage": clinical.pathologic_stage,
        "variant_count": len(result.normalized_input.gene_variants),
        "stromal_score": expression_scores.stromal if expression_scores else None,
        "immune_score": expression_scores.immune if expression_scores else None,
        "adapter": result.result.adapter,
        "result_version": result.result_version,
        "normalized_input": result_payload["normalized_input"],
        "result_payload": result_payload,
        "survival_curve": result_payload["result"]["artifacts"].get("survival_curve"),
    }

    request = Request(
        f"{url}/rest/v1/analysis_results",
        data=json.dumps(row).encode("utf-8"),
        headers={
            "apikey": anon_key,
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=12) as response:
            if response.status not in {200, 201, 204}:
                raise AppError(
                    status_code=502,
                    code="RESULT_SAVE_FAILED",
                    message="Supabase did not accept the analysis result.",
                    details=[error_detail("analysis_results", str(response.status))],
                )
    except HTTPError as exc:
        raise AppError(
            status_code=502,
            code="RESULT_SAVE_FAILED",
            message="Supabase did not accept the analysis result.",
            details=[error_detail("analysis_results", str(exc.code))],
        ) from exc
    except (URLError, TimeoutError) as exc:
        raise AppError(
            status_code=503,
            code="RESULT_SAVE_FAILED",
            message="Could not save the analysis result to Supabase.",
            details=[error_detail("analysis_results", "unreachable")],
        ) from exc
