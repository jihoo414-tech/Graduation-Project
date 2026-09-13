import json
from typing import Any

from app.domain.user import CLINICAL_ROLES, SupabaseUser, UserRole
from app.dto.response.analysis import AnalysisResultListItem, AnalysisResultsResponse
from app.dto.response.inference import InferenceSuccessResponse
from app.repository import analysis_repository


def fetch_analysis_results(access_token: str, user: SupabaseUser) -> AnalysisResultsResponse:
    user_id = None if user.role in CLINICAL_ROLES else user.id
    rows = analysis_repository.fetch_analysis_results(access_token, user_id=user_id)
    items = [_analysis_result_item(row, user.role) for row in rows if isinstance(row, dict)]
    return AnalysisResultsResponse(viewerRole=user.role, items=items)


def save_analysis_result(
    access_token: str, user: SupabaseUser, result: InferenceSuccessResponse
) -> None:
    analysis_repository.save_analysis_result(access_token, _analysis_result_row(user, result))


def _analysis_result_row(user: SupabaseUser, result: InferenceSuccessResponse) -> dict[str, Any]:
    result_payload = result.model_dump(mode="json")
    artifacts = result.result.artifacts
    clinical = result.normalized_input.clinical
    expression_scores = artifacts.expression_scores

    return {
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


def _analysis_result_item(row: dict[str, Any], role: UserRole) -> AnalysisResultListItem:
    result_payload = row.get("result_payload")
    return AnalysisResultListItem(
        id=str(row["id"]),
        createdAt=str(row["created_at"]),
        patientId=str(row["patient_id"]) if role in CLINICAL_ROLES else None,
        riskGroup=row.get("risk_group"),
        riskScore=row.get("risk_score"),
        age=row.get("age"),
        gender=row.get("gender"),
        stage=row.get("stage"),
        variantCount=row.get("variant_count") if role in CLINICAL_ROLES else None,
        resultPayload=_visible_result_payload(result_payload, role),
    )


def _visible_result_payload(payload: Any, role: UserRole) -> dict[str, Any] | None:
    if not isinstance(payload, dict):
        return None
    if role in CLINICAL_ROLES:
        return payload

    visible_payload = json.loads(json.dumps(payload))
    visible_payload.get("result", {}).get("artifacts", {}).pop("model_scores", None)
    visible_payload.get("result", {}).get("artifacts", {}).pop("risk_threshold", None)
    visible_payload.get("result", {}).get("artifacts", {}).pop("expression_scores", None)
    visible_payload.get("result", {}).get("artifacts", {}).pop("artifact_manifest_digest", None)
    visible_payload.get("normalized_input", {}).pop("gene_variants", None)
    visible_payload.get("patient", {}).pop("deidentified_patient_id", None)
    return visible_payload
