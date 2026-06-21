from __future__ import annotations

import os
from datetime import date
from typing import Annotated

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.schemas import (
    ErrorBody,
    ErrorDetail,
    ErrorResponse,
    HealthResponse,
    InferenceSuccessResponse,
)
from app.services.adapters import get_inference_adapter
from app.services.errors import AppError, error_detail
from app.services.feature_builder import build_model_patient
from app.services.model_artifacts import artifact_paths_from_env

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
    503: {"model": ErrorResponse},
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
    return HealthResponse(status="ok", adapter=get_inference_adapter().name)



@app.post(
    "/api/v1/inference/upload",
    response_model=InferenceSuccessResponse,
    responses=ERROR_RESPONSES,
)
async def upload_inference(
    mutation_file: Annotated[UploadFile, File()],
    expression_file: Annotated[UploadFile, File()],
    birth_date: Annotated[str, Form()],
    gender: Annotated[str, Form()],
    stage: Annotated[int, Form()],
) -> InferenceSuccessResponse:
    mutation_is_csv = (mutation_file.filename or "").lower().endswith(".csv")
    expression_is_csv = (expression_file.filename or "").lower().endswith(".csv")
    if not mutation_is_csv or not expression_is_csv:
        raise AppError(
            status_code=415,
            code="UNSUPPORTED_FILE_TYPE",
            message="Mutation and RNA-seq uploads must be CSV files.",
            details=[error_detail("mutation_file", "csv")],
        )
    try:
        birth = date.fromisoformat(birth_date)
    except ValueError as exc:
        raise AppError(
            status_code=422,
            code="INVALID_CLINICAL_VALUE",
            message="입력을 다시 확인해주세요.",
            details=[error_detail("birth_date", "iso_date")],
        ) from exc
    age = date.today().year - birth.year + 1
    if birth > date.today() or not 1 <= age <= 120:
        raise AppError(
            status_code=422,
            code="INVALID_CLINICAL_VALUE",
            message="입력을 다시 확인해주세요.",
            details=[error_detail("birth_date", "korean_age_1_to_120")],
        )
    patient = build_model_patient(
        mutation_bytes=await mutation_file.read(),
        expression_bytes=await expression_file.read(),
        age=age,
        gender=gender,
        stage=stage,
        paths=artifact_paths_from_env(),
    )
    return get_inference_adapter().run(patient)
