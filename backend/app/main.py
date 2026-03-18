from __future__ import annotations

import os
from typing import Annotated

from fastapi import FastAPI, File, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.schemas import (
    ContractExamplesResponse,
    ErrorBody,
    ErrorDetail,
    ErrorResponse,
    HealthResponse,
    InferenceSuccessResponse,
)
from app.services.contracts import load_contract_examples
from app.services.inference import AppError, parse_uploaded_patient, run_mock_inference

DEFAULT_DEV_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]
ERROR_RESPONSES = {
    400: {"model": ErrorResponse},
    415: {"model": ErrorResponse},
    422: {"model": ErrorResponse},
}


def _cors_origins() -> list[str]:
    configured = os.getenv("BACKEND_CORS_ORIGINS")
    if not configured:
        return DEFAULT_DEV_CORS_ORIGINS
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


app = FastAPI(title="Graduation Project Backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=exc.to_response().model_dump())


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(
    _: Request, exc: RequestValidationError
) -> JSONResponse:
    details = [
        ErrorDetail(
            field=(
                ".".join(str(part) for part in error.get("loc", []) if part != "body")
                or "request"
            ),
            rule=error.get("type", "validation_error"),
        )
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            error=ErrorBody(
                code="VALIDATION_ERROR",
                message="Request validation failed.",
                details=details,
            )
        ).model_dump(),
    )


@app.get("/api/v1/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", adapter="mock")


@app.get("/api/v1/contracts/patient-example", response_model=ContractExamplesResponse)
async def patient_example() -> ContractExamplesResponse:
    return load_contract_examples()


@app.post(
    "/api/v1/inference/upload",
    response_model=InferenceSuccessResponse,
    responses=ERROR_RESPONSES,
)
async def upload_inference(
    file: Annotated[UploadFile, File(...)],
) -> InferenceSuccessResponse:
    payload = await file.read()
    patient = parse_uploaded_patient(file.filename, payload, file.content_type)
    return run_mock_inference(patient)
