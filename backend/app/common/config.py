from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=1)
def _env_file_values() -> dict[str, str]:
    backend_dir = Path(__file__).resolve().parents[2]
    project_dir = backend_dir.parent
    values: dict[str, str] = {}

    # The backend file takes precedence; the frontend file is a local-development fallback.
    for env_path in (project_dir / "frontend" / ".env", backend_dir / ".env"):
        if not env_path.is_file():
            continue
        for raw_line in env_path.read_text(encoding="utf-8-sig").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.removeprefix("export ").strip()
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
                value = value[1:-1]
            values[key] = value
    return values


def get_setting(name: str, *, frontend_name: str | None = None) -> str:
    process_value = os.getenv(name)
    if process_value:
        return process_value.strip()

    values = _env_file_values()
    return (values.get(name) or values.get(frontend_name or "") or "").strip()


DEFAULT_DEV_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]


def cors_origins() -> list[str]:
    configured = os.getenv("BACKEND_CORS_ORIGINS")
    if not configured:
        return DEFAULT_DEV_CORS_ORIGINS
    return [origin.strip() for origin in configured.split(",") if origin.strip()]
