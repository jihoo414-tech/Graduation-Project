from datetime import date

from app.common.exceptions import AppError, error_detail
from app.common.utils.dates import korean_age


def validate_csv_uploads(mutation_filename: str | None, expression_filename: str | None) -> None:
    mutation_is_csv = (mutation_filename or "").lower().endswith(".csv")
    expression_is_csv = (expression_filename or "").lower().endswith(".csv")
    if mutation_is_csv and expression_is_csv:
        return

    raise AppError(
        status_code=415,
        code="UNSUPPORTED_FILE_TYPE",
        message=(
            "파일 형식이 올바르지 않습니다. 돌연변이 파일과 유전자 발현량 "
            "파일을 CSV 형식으로 선택해 주세요."
        ),
        details=[error_detail("mutation_file", "csv")],
    )


def _parse_birth_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise AppError(
            status_code=422,
            code="INVALID_CLINICAL_VALUE",
            message="생년월일 형식이 올바르지 않습니다. 연도, 월, 일을 확인해 주세요.",
            details=[error_detail("birth_date", "iso_date")],
        ) from exc


def validate_birth_date(value: str) -> int:
    birth = _parse_birth_date(value)
    age = korean_age(birth)
    if birth <= date.today() and 1 <= age <= 120:
        return age

    raise AppError(
        status_code=422,
        code="INVALID_CLINICAL_VALUE",
        message=(
            "생년월일이 미래 날짜이거나 분석 가능한 나이 범위를 벗어났습니다. "
            "생년월일을 확인해 주세요."
        ),
        details=[error_detail("birth_date", "korean_age_1_to_120")],
    )
