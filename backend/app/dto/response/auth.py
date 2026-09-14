from pydantic import BaseModel, ConfigDict

from app.domain.user import UserRole


class CurrentUserResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    email: str | None = None
    role: UserRole
