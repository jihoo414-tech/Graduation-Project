import pytest
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

from app.common.config import cors_origins


@pytest.mark.parametrize(
    "origin,allowed",
    [
        ("http://localhost:5173", True),
        ("http://localhost:5174", True),
        ("http://127.0.0.1:5174", True),
        ("https://untrusted.example", False),
    ],
)
def test_development_origins_can_send_authenticated_requests(monkeypatch, origin, allowed):
    monkeypatch.delenv("BACKEND_CORS_ORIGINS", raising=False)
    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    response = TestClient(app).options(
        "/api/v1/analysis-results",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert response.status_code == (200 if allowed else 400)
    assert response.headers.get("access-control-allow-origin") == (origin if allowed else None)


def test_explicit_origins_replace_development_defaults(monkeypatch):
    monkeypatch.setenv("BACKEND_CORS_ORIGINS", "https://app.example")
    assert cors_origins() == ["https://app.example"]
