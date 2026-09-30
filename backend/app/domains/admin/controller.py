from typing import Annotated

from fastapi import APIRouter, Header, Response

from app.common.error_handlers import ERROR_RESPONSES
from app.domains.admin.schemas.request import RoleUpdateRequest
from app.domains.admin.schemas.response import AdminUsersResponse
from app.domains.admin.service import fetch_users, update_user_role
from app.domains.auth.service import access_token_from_authorization, verify_supabase_user

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/users", response_model=AdminUsersResponse, responses=ERROR_RESPONSES)
async def users(
    authorization: Annotated[str | None, Header()] = None,
) -> AdminUsersResponse:
    access_token = access_token_from_authorization(authorization)
    user = verify_supabase_user(access_token)
    return fetch_users(access_token, user)


@router.patch("/users/{user_id}/role", status_code=204, responses=ERROR_RESPONSES)
async def update_role(
    user_id: str,
    request: RoleUpdateRequest,
    authorization: Annotated[str | None, Header()] = None,
) -> Response:
    access_token = access_token_from_authorization(authorization)
    user = verify_supabase_user(access_token)
    update_user_role(access_token, user, user_id, request.role)
    return Response(status_code=204)
