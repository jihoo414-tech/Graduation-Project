from typing import Annotated

from fastapi import APIRouter, Header

from app.common.error_handlers import ERROR_RESPONSES
from app.domains.auth.schemas.response import CurrentUserResponse
from app.domains.auth.service import access_token_from_authorization, verify_supabase_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.get("/me", response_model=CurrentUserResponse, responses=ERROR_RESPONSES)
async def current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> CurrentUserResponse:
    access_token = access_token_from_authorization(authorization)
    user = verify_supabase_user(access_token)
    return CurrentUserResponse(
        id=user.id,
        email=user.email,
        fullName=user.full_name,
        role=user.role,
    )
