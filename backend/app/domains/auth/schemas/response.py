from pydantic import BaseModel, ConfigDict

from app.domains.auth.models import UserRole


class CurrentUserResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    email: str | None = None
    fullName: str | None = None
    role: UserRole
