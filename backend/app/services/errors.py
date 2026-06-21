from __future__ import annotations

from dataclasses import dataclass

from app.schemas import ErrorBody, ErrorDetail, ErrorResponse


@dataclass(slots=True)
class AppError(Exception):
    status_code: int
    code: str
    message: str
    details: list[ErrorDetail]

    def to_response(self) -> ErrorResponse:
        return ErrorResponse(
            error=ErrorBody(
                code=self.code,
                message=self.message,
                details=self.details,
            )
        )


def error_detail(field: str, rule: str) -> ErrorDetail:
    return ErrorDetail(field=field, rule=rule)
