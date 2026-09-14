from typing import Annotated

from fastapi import APIRouter, Header

from app.common.error_handlers import ERROR_RESPONSES
from app.dto.response.analysis import PatientListResponse
from app.service.auth_service import access_token_from_authorization, verify_supabase_user
from app.service.patient_service import fetch_patients

router = APIRouter(prefix="/api/v1/patients", tags=["patients"])


@router.get("", response_model=PatientListResponse, responses=ERROR_RESPONSES)
async def patients(
    authorization: Annotated[str | None, Header()] = None,
) -> PatientListResponse:
    access_token = access_token_from_authorization(authorization)
    user = verify_supabase_user(access_token)
    return fetch_patients(access_token, user)
