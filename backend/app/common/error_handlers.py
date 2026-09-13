import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.common.exceptions import AppError
from app.dto.response.error import ErrorMessageResponse

logger = logging.getLogger(__name__)
INPUT_LABELS = {
    "birth_date": "생년월일",
    "gender": "성별",
    "stage": "병기",
    "mutation_file": "돌연변이 파일",
    "expression_file": "유전자 발현량 파일",
}
HTTP_MESSAGES = {
    400: "요청 내용을 읽을 수 없습니다. 입력 내용과 업로드 파일을 확인해 주세요.",
    401: "로그인이 필요하거나 만료되었습니다. 다시 로그인해 주세요.",
    403: "이 작업을 수행할 권한이 없습니다. 계정 권한을 확인해 주세요.",
    404: "요청한 페이지 또는 데이터를 찾을 수 없습니다. 경로를 확인해 주세요.",
    405: "지원하지 않는 요청 방식입니다. 화면을 새로고침한 뒤 다시 시도해 주세요.",
    413: "업로드 파일이 너무 큽니다. 파일 크기를 줄여 다시 시도해 주세요.",
    415: "지원하지 않는 파일 형식입니다. CSV 파일을 선택해 주세요.",
    429: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    503: "서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
}
SERVER_ERROR_MESSAGE = (
    "서버에서 요청을 처리하는 중 오류가 발생했습니다. "
    "잠시 후 다시 시도하고 문제가 계속되면 관리자에게 문의해 주세요."
)

ERROR_RESPONSES = {
    400: {"model": ErrorMessageResponse},
    401: {"model": ErrorMessageResponse},
    415: {"model": ErrorMessageResponse},
    422: {"model": ErrorMessageResponse},
    502: {"model": ErrorMessageResponse},
    503: {"model": ErrorMessageResponse},
}


async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorMessageResponse(message=exc.message).model_dump(),
    )


async def request_validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    messages = []
    for error in exc.errors():
        label = next((INPUT_LABELS[key] for key in error["loc"] if key in INPUT_LABELS), None)
        if label is None:
            continue
        message = (
            f"{label} 항목이 누락되었습니다. 입력하거나 파일을 선택해 주세요."
            if error["type"] == "missing"
            else f"{label} 형식이 올바르지 않습니다. 입력 내용을 확인해 주세요."
        )
        if message not in messages:
            messages.append(message)
    return JSONResponse(
        status_code=422,
        content=ErrorMessageResponse(
            message=" ".join(messages)
            or ("요청 형식이 올바르지 않습니다. 입력 내용을 확인해 주세요.")
        ).model_dump(),
    )


async def http_error_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        headers=exc.headers,
        content=ErrorMessageResponse(
            message=HTTP_MESSAGES.get(exc.status_code, SERVER_ERROR_MESSAGE)
        ).model_dump(),
    )


async def unexpected_error_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled request error", exc_info=(type(exc), exc, exc.__traceback__))
    return JSONResponse(
        status_code=500,
        content=ErrorMessageResponse(message=SERVER_ERROR_MESSAGE).model_dump(),
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, request_validation_error_handler)
    app.add_exception_handler(HTTPException, http_error_handler)
    app.add_exception_handler(Exception, unexpected_error_handler)
