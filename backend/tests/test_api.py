from fastapi.testclient import TestClient

from app.main import app


def test_real_model_endpoint_requires_auth_token() -> None:
    response = TestClient(app).post(
        "/api/v1/inference/upload",
        data={"birth_date": "1990-01-01", "gender": "female", "stage": "1"},
        files={
            "mutation_file": ("mutation.csv", b"Patient_ID\nP-001\n", "text/csv"),
            "expression_file": ("expression.csv", b",GENE\nP-001,1\n", "text/csv"),
        },
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTH_REQUIRED"
