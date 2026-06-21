from fastapi.testclient import TestClient

from app.main import app


def test_real_model_endpoint_requires_two_files_and_clinical_values() -> None:
    response = TestClient(app).post("/api/v1/inference/upload")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
