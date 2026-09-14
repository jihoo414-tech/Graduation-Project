import json

from fastapi.testclient import TestClient

from app.infrastructure import supabase_client
from app.main import app


def test_current_user_returns_server_verified_role(monkeypatch):
    def request(path, *, method, access_token):
        assert method == "GET"
        assert access_token == "test-token"
        if path == "/auth/v1/user":
            payload = {
                "id": "user-1",
                "email": "doctor@example.com",
                "user_metadata": {"role": "admin"},
            }
        else:
            assert path.startswith("/rest/v1/profiles?")
            payload = [{"role": "doctor"}]
        return 200, json.dumps(payload).encode()

    monkeypatch.setattr(supabase_client, "request", request)
    response = TestClient(app).get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": "user-1",
        "email": "doctor@example.com",
        "role": "doctor",
    }


def test_current_user_requires_login():
    response = TestClient(app).get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json() == {"message": "로그인이 필요합니다. 로그인한 뒤 다시 시도해 주세요."}
