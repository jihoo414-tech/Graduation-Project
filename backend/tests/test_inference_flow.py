from datetime import date
from types import SimpleNamespace
from urllib.error import HTTPError

import pytest
from fastapi.testclient import TestClient

from app.controller import analysis_controller
from app.domain.user import SupabaseUser
from app.dto.response.inference import InferenceSuccessResponse
from app.dto.shared.patient import NormalizedPatientInput
from app.infrastructure import supabase_client
from app.main import app
from app.service import inference_service


@pytest.mark.parametrize("save_fails", [False, True])
def test_upload_runs_model_then_saves_result(monkeypatch, save_fails):
    calls = []
    user = SupabaseUser(id="user-1", role="patient")
    patient = NormalizedPatientInput(
        deidentified_patient_id="P-001",
        gene_variants=[],
        clinical={"age": date.today().year - 1990 + 1, "gender": "female"},
    )
    result = InferenceSuccessResponse(
        result_version="v2",
        patient={"deidentified_patient_id": "P-001"},
        normalized_input=patient,
        result={
            "adapter": "real_ensemble",
            "summary": {"risk_level": "Low", "risk_score": 0.1, "text": "test"},
            "artifacts": {"risk_group": "Low", "ensemble_score": 0.1},
        },
    )

    def build(**kwargs):
        assert kwargs["mutation_bytes"] == b"mutation-data"
        assert kwargs["expression_bytes"] == b"expression-data"
        assert kwargs["age"] == patient.clinical.age
        assert kwargs["gender"] == "female"
        assert kwargs["stage"] == 1
        calls.append("build")
        return patient

    def run(value):
        assert value == patient
        calls.append("run")
        return result

    def save(path, *, method, access_token, body, prefer):
        assert path == "/rest/v1/analysis_results"
        assert method == "POST"
        assert access_token == "test-token"
        assert body["user_id"] == user.id
        assert body["patient_id"] == "P-001"
        assert body["risk_score"] == 0.1
        assert body["result_payload"] == result.model_dump(mode="json")
        assert prefer == "return=minimal"
        calls.append("save")
        if save_fails:
            raise HTTPError(path, 403, "denied", {}, None)
        return 201, b""

    monkeypatch.setattr(analysis_controller, "verify_supabase_user", lambda _: user)
    monkeypatch.setattr(inference_service, "artifact_paths_from_env", lambda: None)
    monkeypatch.setattr(inference_service, "build_model_patient", build)
    monkeypatch.setattr(
        inference_service, "get_inference_adapter", lambda: SimpleNamespace(run=run)
    )
    monkeypatch.setattr(supabase_client, "request", save)

    response = TestClient(app).post(
        "/api/v1/inference/upload",
        headers={"Authorization": "Bearer test-token"},
        data={"birth_date": "1990-01-01", "gender": "female", "stage": "1"},
        files={
            "mutation_file": ("mutation.csv", b"mutation-data", "text/csv"),
            "expression_file": ("expression.csv", b"expression-data", "text/csv"),
        },
    )
    assert calls == ["build", "run", "save"]
    if save_fails:
        assert response.status_code == 502
        assert response.json() == {
            "message": (
                "분석은 완료했지만 결과를 저장하지 못했습니다. 다시 시도하고 "
                "문제가 계속되면 관리자에게 문의해 주세요."
            )
        }
    else:
        assert response.status_code == 200
        assert response.json() == result.model_dump(mode="json")
