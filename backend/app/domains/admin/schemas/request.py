from pydantic import BaseModel, ConfigDict

from app.domains.auth.models import UserRole


class RoleUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: UserRole
