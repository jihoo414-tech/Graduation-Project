from app.common.exceptions import AppError, error_detail
from app.domains.analysis import repository as analysis_repository
from app.domains.auth.models import SupabaseUser
from app.domains.auth.service import require_clinical_role
from app.domains.patients import repository as patient_repository
from app.domains.patients.schemas.response import PatientListItem, PatientListResponse


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
                fullName=profile.get("full_name"),
                createdAt=str(profile["created_at"]),
                lastAnalysisAt=str(latest["created_at"]) if latest else None,
                latestRiskGroup=latest.get("risk_group") if latest else None,
                resultCount=len(patient_results),
            )
        )
    return PatientListResponse(items=items)


def require_patient(access_token: str, patient_id: str) -> str | None:
    patient = patient_repository.fetch_patient(access_token, patient_id)
    if not patient:
        raise AppError(
            status_code=422,
            code="PATIENT_NOT_FOUND",
            message="선택한 환자 계정을 찾을 수 없습니다. 환자 목록을 새로고침해 주세요.",
            details=[error_detail("patient_id", "registered_patient")],
        )
    return patient.get("full_name")


def soft_delete_patient(access_token: str, user: SupabaseUser, patient_id: str) -> None:
    require_clinical_role(user)
    if not patient_repository.soft_delete_patient(access_token, patient_id):
        raise AppError(
            status_code=404,
            code="PATIENT_NOT_FOUND",
            message="등록을 해제할 환자를 찾을 수 없습니다.",
            details=[error_detail("patient_id", "active_patient")],
        )
