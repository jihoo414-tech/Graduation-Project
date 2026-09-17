from typing import Annotated

from fastapi import APIRouter, Header, Response

from app.common.error_handlers import ERROR_RESPONSES
from app.domains.auth.service import access_token_from_authorization, verify_supabase_user
from app.domains.patients.schemas.response import PatientListResponse
from app.domains.patients.service import fetch_patients, soft_delete_patient

router = APIRouter(prefix="/api/v1/patients", tags=["patients"])


@router.get("", response_model=PatientListResponse, responses=ERROR_RESPONSES)
async def patients(
    authorization: Annotated[str | None, Header()] = None,
) -> PatientListResponse:
    access_token = access_token_from_authorization(authorization)
    user = verify_supabase_user(access_token)
    return fetch_patients(access_token, user)


@router.delete("/{patient_id}", status_code=204, responses=ERROR_RESPONSES)
async def delete_patient(
    patient_id: str,
    authorization: Annotated[str | None, Header()] = None,
) -> Response:
    access_token = access_token_from_authorization(authorization)
    user = verify_supabase_user(access_token)
    soft_delete_patient(access_token, user, patient_id)
    return Response(status_code=204)
