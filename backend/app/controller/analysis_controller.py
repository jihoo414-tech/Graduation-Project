from typing import Annotated

from fastapi import APIRouter, File, Form, Header, UploadFile

from app.common.error_handlers import ERROR_RESPONSES
from app.dto.request.inference import InferenceUploadRequest
from app.dto.response.analysis import AnalysisResultsResponse
from app.dto.response.inference import InferenceSuccessResponse
from app.service.analysis_service import fetch_analysis_results
from app.service.auth_service import (
    access_token_from_authorization,
    require_clinical_role,
    verify_supabase_user,
)
from app.service.inference_service import run_analysis
from app.service.patient_service import require_patient
from app.service.validation import validate_birth_date, validate_csv_uploads

router = APIRouter()


@router.get(
    "/api/v1/analysis-results",
    response_model=AnalysisResultsResponse,
    responses=ERROR_RESPONSES,
)
async def analysis_results(
    authorization: Annotated[str | None, Header()] = None,
) -> AnalysisResultsResponse:
    access_token = access_token_from_authorization(authorization)
    user = verify_supabase_user(access_token)
    return fetch_analysis_results(access_token, user)


@router.post(
    "/api/v1/inference/upload",
    response_model=InferenceSuccessResponse,
    responses=ERROR_RESPONSES,
)
async def upload_inference(
    mutation_file: Annotated[UploadFile, File()],
    expression_file: Annotated[UploadFile, File()],
    patient_id: Annotated[str, Form()],
    birth_date: Annotated[str, Form()],
    gender: Annotated[str, Form()],
    stage: Annotated[int, Form()],
    authorization: Annotated[str | None, Header()] = None,
) -> InferenceSuccessResponse:
    request_dto = InferenceUploadRequest(
        patient_id=patient_id,
        birth_date=birth_date,
        gender=gender,
        stage=stage,
    )
    access_token = access_token_from_authorization(authorization)
    user = verify_supabase_user(access_token)
    require_clinical_role(user)
    patient_user_id = str(request_dto.patient_id)
    require_patient(access_token, patient_user_id)
    validate_csv_uploads(mutation_file.filename, expression_file.filename)
    age = validate_birth_date(request_dto.birth_date)
    return run_analysis(
        mutation_bytes=await mutation_file.read(),
        expression_bytes=await expression_file.read(),
        age=age,
        request=request_dto,
        access_token=access_token,
        user=user,
        patient_user_id=patient_user_id,
    )
