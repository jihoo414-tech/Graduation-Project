import json
import math
from typing import Any

from app.common.exceptions import AppError, error_detail
from app.domains.analysis import repository as analysis_repository
from app.domains.analysis.schemas.inference_response import InferenceSuccessResponse
from app.domains.analysis.schemas.response import AnalysisResultListItem, AnalysisResultsResponse
from app.domains.auth.models import CLINICAL_ROLES, SupabaseUser, UserRole
from app.domains.auth.service import require_clinical_role
from app.domains.patients import repository as patient_repository

PAGE_SIZE = 5


def fetch_analysis_results(
    access_token: str, user: SupabaseUser, page: int = 1
) -> AnalysisResultsResponse:
    patient_user_id = None if user.role in CLINICAL_ROLES else user.id
    rows = analysis_repository.fetch_analysis_results(access_token, patient_user_id=patient_user_id)
    patient_names = (
        {
            str(profile["id"]): profile.get("full_name")
            for profile in patient_repository.fetch_patients(access_token)
        }
        if user.role in CLINICAL_ROLES
        else {}
    )
    all_items = [
        _analysis_result_item(row, user.role, patient_names)
        for row in rows
        if isinstance(row, dict)
    ]
    total = len(all_items)
    total_pages = max(1, math.ceil(total / PAGE_SIZE))
    safe_page = min(page, total_pages)
    start = (safe_page - 1) * PAGE_SIZE
    return AnalysisResultsResponse(
        viewerRole=user.role,
        items=all_items[start : start + PAGE_SIZE],
        page=safe_page,
        pageSize=PAGE_SIZE,
        total=total,
        totalPages=total_pages,
        highRiskTotal=sum(item.riskGroup == "High" for item in all_items),
        lowRiskTotal=sum(item.riskGroup == "Low" for item in all_items),
    )


def soft_delete_analysis_result(access_token: str, user: SupabaseUser, result_id: str) -> None:
    require_clinical_role(user)
    if not analysis_repository.soft_delete_analysis_result(access_token, result_id):
        raise AppError(
            status_code=404,
            code="RESULT_NOT_FOUND",
            message="삭제할 분석 결과를 찾을 수 없습니다.",
            details=[error_detail("analysis_result", "active_result")],
        )


def save_analysis_result(
    access_token: str,
    user: SupabaseUser,
    patient_user_id: str,
    result: InferenceSuccessResponse,
) -> None:
    analysis_repository.save_analysis_result(
        access_token, _analysis_result_row(user, patient_user_id, result)
    )


def _analysis_result_row(
    user: SupabaseUser, patient_user_id: str, result: InferenceSuccessResponse
) -> dict[str, Any]:
    result_payload = result.model_dump(mode="json")
    result_payload.get("patient", {}).pop("display_name", None)
    artifacts = result.result.artifacts
    clinical = result.normalized_input.clinical
    expression_scores = artifacts.expression_scores

    return {
        # Legacy columns remain populated while clients migrate to the explicit ownership fields.
        "user_id": patient_user_id,
        "patient_id": patient_user_id,
        "patient_user_id": patient_user_id,
        "created_by": user.id,
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


def _analysis_result_item(
    row: dict[str, Any], role: UserRole, patient_names: dict[str, str | None]
) -> AnalysisResultListItem:
    result_payload = row.get("result_payload")
    patient_user_id = row.get("patient_user_id") or row.get("patient_id")
    patient_name = patient_names.get(str(patient_user_id))
    return AnalysisResultListItem(
        id=str(row["id"]),
        createdAt=str(row["created_at"]),
        patientId=str(patient_user_id) if role in CLINICAL_ROLES else None,
        patientName=patient_name if role in CLINICAL_ROLES else None,
        riskGroup=row.get("risk_group"),
        riskScore=row.get("risk_score"),
        age=row.get("age"),
        gender=row.get("gender"),
        stage=row.get("stage"),
        variantCount=row.get("variant_count") if role in CLINICAL_ROLES else None,
        resultPayload=_visible_result_payload(result_payload, role, patient_name),
    )


def _visible_result_payload(
    payload: Any, role: UserRole, patient_name: str | None = None
) -> dict[str, Any] | None:
    if not isinstance(payload, dict):
        return None
    visible_payload = json.loads(json.dumps(payload))
    if role in CLINICAL_ROLES:
        if patient_name:
            visible_payload.setdefault("patient", {})["display_name"] = patient_name
        return visible_payload
    visible_payload.get("result", {}).get("artifacts", {}).pop("model_scores", None)
    visible_payload.get("result", {}).get("artifacts", {}).pop("risk_threshold", None)
    visible_payload.get("result", {}).get("artifacts", {}).pop("expression_scores", None)
    visible_payload.get("result", {}).get("artifacts", {}).pop("artifact_manifest_digest", None)
    visible_payload.get("normalized_input", {}).pop("gene_variants", None)
    visible_payload.get("normalized_input", {}).pop("deidentified_patient_id", None)
    visible_payload.get("patient", {}).pop("deidentified_patient_id", None)
    return visible_payload
