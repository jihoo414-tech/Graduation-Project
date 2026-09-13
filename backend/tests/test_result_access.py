import json
from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi.testclient import TestClient

from app.infrastructure import supabase_client
from app.main import app
from app.service import auth_service


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
            data = [{"role": role}]
        else:
            query = parse_qs(urlsplit(path).query)
            queries.append(query)
            offset = int(query["offset"][0])
            data = [
                {
                    "id": str(index),
                    "created_at": "2026-09-13T00:00:00Z",
                    "patient_id": "P-001",
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
    assert len(body["items"]) == 101
    assert [query["offset"] for query in queries] == [["0"], ["100"], ["101"]]
    item = body["items"][0]
    if role == "patient":
        assert all(query["user_id"] == ["eq.user-1"] for query in queries)
        assert item["patientId"] is None
        assert item["variantCount"] is None
        assert "model_scores" not in item["resultPayload"]["result"]["artifacts"]
        assert "gene_variants" not in item["resultPayload"]["normalized_input"]
    else:
        assert all("user_id" not in query for query in queries)
        assert item["patientId"] == "P-001"
        assert item["variantCount"] == 1
        assert item["resultPayload"] == payload


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
