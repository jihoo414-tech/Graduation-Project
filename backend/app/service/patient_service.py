from app.common.exceptions import AppError, error_detail
from app.domain.user import SupabaseUser
from app.dto.response.analysis import PatientListItem, PatientListResponse
from app.repository import analysis_repository, patient_repository
from app.service.auth_service import require_clinical_role


def fetch_patients(access_token: str, user: SupabaseUser) -> PatientListResponse:
    require_clinical_role(user)
    profiles = patient_repository.fetch_patients(access_token)
    results = analysis_repository.fetch_analysis_results(access_token, patient_user_id=None)
    results_by_patient: dict[str, list[dict]] = {}
    for result in results:
        patient_id = result.get("patient_user_id")
        if patient_id:
            results_by_patient.setdefault(str(patient_id), []).append(result)

    items = []
    for profile in profiles:
        patient_id = str(profile["id"])
        patient_results = results_by_patient.get(patient_id, [])
        latest = patient_results[0] if patient_results else None
        items.append(
            PatientListItem(
                id=patient_id,
                createdAt=str(profile["created_at"]),
                lastAnalysisAt=str(latest["created_at"]) if latest else None,
                latestRiskGroup=latest.get("risk_group") if latest else None,
                resultCount=len(patient_results),
            )
        )
    return PatientListResponse(items=items)


def require_patient(access_token: str, patient_id: str) -> None:
    if not patient_repository.patient_exists(access_token, patient_id):
        raise AppError(
            status_code=422,
            code="PATIENT_NOT_FOUND",
            message="선택한 환자 계정을 찾을 수 없습니다. 환자 목록을 새로고침해 주세요.",
            details=[error_detail("patient_id", "registered_patient")],
        )
