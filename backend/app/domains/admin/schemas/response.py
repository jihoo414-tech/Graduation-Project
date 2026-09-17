from pydantic import BaseModel, ConfigDict

from app.domains.auth.models import UserRole


class AdminUserListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    fullName: str | None = None
    role: UserRole


class AdminUsersResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[AdminUserListItem]
