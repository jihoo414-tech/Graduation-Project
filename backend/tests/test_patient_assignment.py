import pytest
from fastapi.testclient import TestClient

from app.common.exceptions import AppError
from app.controller import analysis_controller
from app.domain.user import SupabaseUser
from app.main import app
from app.repository import analysis_repository, patient_repository
from app.service.auth_service import require_clinical_role
from app.service.patient_service import fetch_patients


def test_patient_cannot_run_analysis(monkeypatch):
    monkeypatch.setattr(
        analysis_controller,
        "verify_supabase_user",
        lambda _: SupabaseUser(id="patient-1", role="patient"),
    )
    response = TestClient(app).post(
        "/api/v1/inference/upload",
        headers={"Authorization": "Bearer test-token"},
        data={
            "patient_id": "11111111-1111-1111-1111-111111111111",
            "birth_date": "1990-01-01",
            "gender": "female",
            "stage": "1",
        },
        files={
            "mutation_file": ("mutation.csv", b"data", "text/csv"),
            "expression_file": ("expression.csv", b"data", "text/csv"),
        },
    )
    assert response.status_code == 403
    assert response.json() == {
        "message": "분석 실행 권한이 없습니다. 의사 또는 관리자 계정으로 로그인해 주세요."
    }


def test_patient_list_aggregates_results_by_database_user_id(monkeypatch):
    monkeypatch.setattr(
        patient_repository,
        "fetch_patients",
        lambda _: [
            {"id": "patient-1", "created_at": "2026-09-01T00:00:00Z"},
            {"id": "patient-2", "created_at": "2026-09-02T00:00:00Z"},
        ],
    )
    monkeypatch.setattr(
        analysis_repository,
        "fetch_analysis_results",
        lambda _token, *, patient_user_id: [
            {
                "patient_user_id": "patient-1",
                "created_at": "2026-09-14T00:00:00Z",
                "risk_group": "High",
            },
            {
                "patient_user_id": "patient-1",
                "created_at": "2026-09-10T00:00:00Z",
                "risk_group": "Low",
            },
        ],
    )

    response = fetch_patients("test-token", SupabaseUser(id="doctor-1", role="doctor"))
    assert response.model_dump() == {
        "items": [
            {
                "id": "patient-1",
                "createdAt": "2026-09-01T00:00:00Z",
                "lastAnalysisAt": "2026-09-14T00:00:00Z",
                "latestRiskGroup": "High",
                "resultCount": 2,
            },
            {
                "id": "patient-2",
                "createdAt": "2026-09-02T00:00:00Z",
                "lastAnalysisAt": None,
                "latestRiskGroup": None,
                "resultCount": 0,
            },
        ]
    }


def test_patient_cannot_list_other_patient_accounts():
    with pytest.raises(AppError) as error:
        fetch_patients("test-token", SupabaseUser(id="patient-1", role="patient"))
    assert error.value.status_code == 403


def test_only_clinical_roles_can_run_analysis():
    require_clinical_role(SupabaseUser(id="doctor-1", role="doctor"))
    require_clinical_role(SupabaseUser(id="admin-1", role="admin"))
    with pytest.raises(AppError):
        require_clinical_role(SupabaseUser(id="patient-1", role="patient"))
