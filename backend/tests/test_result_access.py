import json
from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi.testclient import TestClient

from app.common.exceptions import AppError
from app.domains.analysis import repository as analysis_repository
from app.domains.analysis.service import fetch_analysis_results, soft_delete_analysis_result
from app.domains.auth import service as auth_service
from app.domains.auth.models import SupabaseUser
from app.infrastructure import supabase_client
from app.main import app


@pytest.mark.parametrize("role", ["patient", "doctor", "admin"])
def test_result_access_by_trusted_profile(monkeypatch, role):
    queries = []
    payload = {
        "patient": {"deidentified_patient_id": "P-001"},
        "normalized_input": {"gene_variants": [{"gene": "TP53"}]},
        "result": {"artifacts": {"model_scores": {"rsf": 1}, "risk_group": "High"}},
    }

    def request(path, *, method, access_token):
        assert access_token == "test-token"
        assert method == "GET"
        if path == "/auth/v1/user":
            # Editable user metadata must never grant an administrator role.
            data = {"id": "user-1", "user_metadata": {"role": "admin"}}
        elif path.startswith("/rest/v1/profiles?"):
            query = parse_qs(urlsplit(path).query)
            data = (
                [{"role": role, "full_name": None}]
                if query.get("select") == ["role,full_name,deleted_at"]
                else [
                    {
                        "id": "patient-1",
                        "full_name": "테스트 환자",
                        "created_at": "2026-01-01T00:00:00Z",
                    }
                ]
            )
        else:
            query = parse_qs(urlsplit(path).query)
            queries.append(query)
            offset = int(query["offset"][0])
            data = [
                {
                    "id": str(index),
                    "created_at": "2026-09-13T00:00:00Z",
                    "patient_id": "P-001",
                    "patient_user_id": "patient-1",
                    "variant_count": 1,
                    "result_payload": payload,
                }
                for index in range(offset, min(offset + 100, 101))
            ]
        return 200, json.dumps(data).encode()

    monkeypatch.setattr(supabase_client, "request", request)
    response = TestClient(app).get(
        "/api/v1/analysis-results", headers={"Authorization": "Bearer test-token"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["viewerRole"] == role
    assert len(body["items"]) == 5
    assert body["page"] == 1
    assert body["pageSize"] == 5
    assert body["total"] == 101
    assert body["totalPages"] == 21
    assert [query["offset"] for query in queries] == [["0"], ["100"], ["101"]]
    item = body["items"][0]
    if role == "patient":
        assert all(query["patient_user_id"] == ["eq.user-1"] for query in queries)
        assert item["patientId"] is None
        assert item["variantCount"] is None
        assert "model_scores" not in item["resultPayload"]["result"]["artifacts"]
        assert "gene_variants" not in item["resultPayload"]["normalized_input"]
    else:
        assert all("patient_user_id" not in query for query in queries)
        assert item["patientId"] == "patient-1"
        assert item["patientName"] == "테스트 환자"
        assert item["variantCount"] == 1
        assert item["resultPayload"]["patient"]["display_name"] == "테스트 환자"
        assert item["resultPayload"]["result"] == payload["result"]


@pytest.mark.parametrize("rows", [[], [{"role": "unknown"}]])
def test_missing_or_unknown_profile_defaults_to_patient(monkeypatch, rows):
    monkeypatch.setattr(
        supabase_client, "request", lambda *args, **kwargs: (200, json.dumps(rows).encode())
    )
    assert auth_service.resolve_user_role("test-token", "user-1") == "patient"


def test_results_require_authentication():
    response = TestClient(app).get("/api/v1/analysis-results")
    assert response.status_code == 401
    assert set(response.json()) == {"message"}


def test_analysis_results_are_paginated_five_at_a_time(monkeypatch):
    monkeypatch.setattr(
        auth_service,
        "resolve_user_role",
        lambda *_: "patient",
    )
    monkeypatch.setattr(
        analysis_repository,
        "fetch_analysis_results",
        lambda *_args, **_kwargs: [
            {
                "id": str(index),
                "created_at": "2026-09-13T00:00:00Z",
                "patient_user_id": "patient-1",
                "result_payload": {},
            }
            for index in range(12)
        ],
    )
    response = fetch_analysis_results("token", SupabaseUser(id="patient-1", role="patient"), page=2)
    assert [item.id for item in response.items] == ["5", "6", "7", "8", "9"]
    assert response.total == 12
    assert response.totalPages == 3


def test_only_clinical_staff_can_soft_delete_analysis(monkeypatch):
    calls = []
    monkeypatch.setattr(
        analysis_repository,
        "soft_delete_analysis_result",
        lambda token, result_id: calls.append((token, result_id)) or True,
    )
    soft_delete_analysis_result("token", SupabaseUser(id="doctor-1", role="doctor"), "result-1")
    assert calls == [("token", "result-1")]

    with pytest.raises(AppError) as error:
        soft_delete_analysis_result(
            "token", SupabaseUser(id="patient-1", role="patient"), "result-2"
        )
    assert error.value.status_code == 403
