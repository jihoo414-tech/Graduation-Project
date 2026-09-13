from dataclasses import dataclass
from typing import Literal

UserRole = Literal["patient", "doctor", "admin"]

DEFAULT_ROLE: UserRole = "patient"
ROLE_VALUES: set[str] = {"patient", "doctor", "admin"}
CLINICAL_ROLES: set[UserRole] = {"doctor", "admin"}


@dataclass(frozen=True)
class SupabaseUser:
    id: str
    email: str | None = None
    role: UserRole = DEFAULT_ROLE
