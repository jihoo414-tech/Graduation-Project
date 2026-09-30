import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.common.error_handlers import register_exception_handlers
from app.main import app


@pytest.mark.parametrize("status", [403, 404, 405, 413, 429, 503])
def test_http_errors_are_localized_without_internal_details(status):
    test_app = FastAPI()
    register_exception_handlers(test_app)

    @test_app.get("/error")
    def error():
        raise HTTPException(status_code=status, detail="private diagnostic details")

    response = TestClient(test_app).get("/error")
    assert response.status_code == status
    assert set(response.json()) == {"message"}
    assert any("가" <= char <= "힣" for char in response.json()["message"])
    assert "private" not in response.text


def test_unexpected_exception_is_a_safe_message():
    test_app = FastAPI()
    register_exception_handlers(test_app)

    @test_app.get("/error")
    def error():
        raise RuntimeError("private database connection details")

    response = TestClient(test_app, raise_server_exceptions=False).get("/error")
    assert response.status_code == 500
    assert set(response.json()) == {"message"}
    assert "서버" in response.json()["message"]
    assert "private" not in response.text


def test_missing_input_names_are_readable_and_do_not_include_raw_fields():
    response = TestClient(app).post("/api/v1/inference/upload")
    assert response.status_code == 422
    message = response.json()["message"]
    assert "생년월일 항목이 누락" in message
    assert "돌연변이 파일 항목이 누락" in message
    assert "birth_date" not in message
    assert "mutation_file" not in message


def test_invalid_stage_does_not_echo_the_submitted_value():
    response = TestClient(app).post(
        "/api/v1/inference/upload",
        data={"birth_date": "1990-01-01", "gender": "female", "stage": "private-input"},
        files={
            "mutation_file": ("mutation.csv", b"test", "text/csv"),
            "expression_file": ("expression.csv", b"test", "text/csv"),
        },
    )
    assert response.status_code == 422
    assert "병기 형식이 올바르지 않습니다" in response.json()["message"]
    assert "private-input" not in response.text
