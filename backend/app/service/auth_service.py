from app.common.exceptions import AppError, error_detail
from app.domain.user import DEFAULT_ROLE, ROLE_VALUES, SupabaseUser, UserRole
from app.repository import auth_repository


def access_token_from_authorization(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AppError(
            status_code=401,
            code="AUTH_REQUIRED",
            message="로그인이 필요합니다. 로그인한 뒤 다시 시도해 주세요.",
            details=[error_detail("Authorization", "bearer_token")],
        )
    token = authorization[7:].strip()
    if not token:
        raise AppError(
            status_code=401,
            code="AUTH_REQUIRED",
            message="로그인이 필요합니다. 로그인한 뒤 다시 시도해 주세요.",
            details=[error_detail("Authorization", "bearer_token")],
        )
    return token


def verify_supabase_user(access_token: str) -> SupabaseUser:
    payload = auth_repository.fetch_auth_user(access_token)
    user_id = payload.get("id")
    if not isinstance(user_id, str) or not user_id:
        raise AppError(
            status_code=401,
            code="AUTH_REQUIRED",
            message="로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.",
            details=[error_detail("Authorization", "invalid_user")],
        )
    return SupabaseUser(
        id=user_id,
        email=payload.get("email"),
        role=resolve_user_role(access_token, user_id),
    )


def resolve_user_role(access_token: str, user_id: str) -> UserRole:
    role = auth_repository.fetch_profile_role(access_token, user_id)
    return role if role in ROLE_VALUES else DEFAULT_ROLE
