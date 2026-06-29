from fastapi.testclient import TestClient

from app.main import app


def test_real_model_endpoint_requires_auth_token() -> None:
    response = TestClient(app).post("/api/v1/inference/upload")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTH_REQUIRED"
