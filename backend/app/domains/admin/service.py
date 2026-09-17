from app.common.exceptions import AppError, error_detail
from app.domains.admin import repository as admin_repository
from app.domains.admin.schemas.response import AdminUserListItem, AdminUsersResponse
from app.domains.auth.models import SupabaseUser, UserRole


def require_admin_role(user: SupabaseUser) -> None:
    if user.role != "admin":
        raise AppError(
            status_code=403,
            code="ADMIN_ROLE_REQUIRED",
            message="관리자 권한이 필요한 작업입니다.",
            details=[error_detail("role", "admin")],
        )


def fetch_users(access_token: str, user: SupabaseUser) -> AdminUsersResponse:
    require_admin_role(user)
    return AdminUsersResponse(
        items=[
            AdminUserListItem(
                id=str(row["id"]),
                fullName=row.get("full_name"),
                role=row["role"],
            )
            for row in admin_repository.fetch_users(access_token)
        ]
    )


def update_user_role(
    access_token: str,
    user: SupabaseUser,
    target_user_id: str,
    role: UserRole,
) -> None:
    require_admin_role(user)
    if target_user_id == user.id:
        raise AppError(
            status_code=422,
            code="SELF_ROLE_CHANGE_NOT_ALLOWED",
            message="현재 로그인한 계정의 역할은 변경할 수 없습니다.",
            details=[error_detail("user_id", "not_self")],
        )
    if not admin_repository.update_role(access_token, target_user_id, role):
        raise AppError(
            status_code=404,
            code="USER_NOT_FOUND",
            message="역할을 변경할 사용자를 찾을 수 없습니다.",
            details=[error_detail("user_id", "active_user")],
        )
