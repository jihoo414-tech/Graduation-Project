from fastapi.testclient import TestClient

from app.main import app


def test_real_model_endpoint_requires_auth_token() -> None:
    response = TestClient(app).post(
        "/api/v1/inference/upload",
        data={
            "patient_id": "11111111-1111-1111-1111-111111111111",
            "birth_date": "1990-01-01",
            "gender": "female",
            "stage": "1",
        },
        files={
            "mutation_file": ("mutation.csv", b"Patient_ID\nP-001\n", "text/csv"),
            "expression_file": ("expression.csv", b",GENE\nP-001,1\n", "text/csv"),
        },
    )

    assert response.status_code == 401
    assert response.json() == {"message": "로그인이 필요합니다. 로그인한 뒤 다시 시도해 주세요."}


def test_error_response_does_not_expose_internal_code_or_fields() -> None:
    response = TestClient(app).post("/api/v1/inference/upload")

    assert response.status_code == 422
    assert set(response.json()) == {"message"}
