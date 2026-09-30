from app.common.exceptions import AppError, error_detail
from app.domains.auth import repository as auth_repository
from app.domains.auth.models import (
    CLINICAL_ROLES,
    DEFAULT_ROLE,
    ROLE_VALUES,
    SupabaseUser,
    UserRole,
)


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
    profile = auth_repository.fetch_profile(access_token, user_id) or {}
    if profile.get("deleted_at"):
        raise AppError(
            status_code=403,
            code="ACCOUNT_INACTIVE",
            message="사용이 중지된 계정입니다. 관리자에게 문의해 주세요.",
            details=[error_detail("profile", "active")],
        )
    role = profile.get("role")
    return SupabaseUser(
        id=user_id,
        email=payload.get("email"),
        full_name=profile.get("full_name"),
        role=role if role in ROLE_VALUES else DEFAULT_ROLE,
    )


def resolve_user_role(access_token: str, user_id: str) -> UserRole:
    profile = auth_repository.fetch_profile(access_token, user_id) or {}
    role = profile.get("role")
    return role if role in ROLE_VALUES else DEFAULT_ROLE


def require_clinical_role(user: SupabaseUser) -> None:
    if user.role not in CLINICAL_ROLES:
        raise AppError(
            status_code=403,
            code="CLINICAL_ROLE_REQUIRED",
            message="분석 실행 권한이 없습니다. 의사 또는 관리자 계정으로 로그인해 주세요.",
            details=[error_detail("role", "doctor_or_admin")],
        )
