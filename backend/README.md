# Backend

## 디렉터리 구조

```text
app/
  main.py                     # 앱 구성, 미들웨어, 라우터 등록
  controller/
    analysis_controller.py    # 결과 목록과 multipart 업로드 API
    health_controller.py      # 상태 확인 API
  service/
    auth_service.py           # 토큰 처리, 사용자 검증과 역할 판정
    analysis_service.py       # 조회 범위, 노출 정보, 저장 데이터 변환
    inference_service.py      # 입력 정규화 -> 모델 실행 -> 결과 저장
    validation.py             # 업로드 형식과 생년월일 검증
    inference/                # 특성 생성, 앙상블, 생존곡선, 모델 어댑터
  repository/
    auth_repository.py        # Supabase 사용자와 프로필 조회
    analysis_repository.py    # 분석 결과 조회와 저장
    model_artifacts.py        # 모델 파일 경로와 참조 데이터 로딩
  infrastructure/
    supabase_client.py        # Supabase 공통 HTTP 통신
  domain/
    user.py                   # 사용자와 역할 정의
  dto/
    request/inference.py      # 업로드 요청
    response/                 # 분석 목록, 추론 결과, 상태, 에러 응답
    shared/                   # 환자 정보와 예측 결과의 공통 구성 요소
    internal/                 # 모델 입력 특성과 내부 에러 정보
  common/
    config.py                 # 환경변수, 로컬 설정과 CORS
    exceptions.py             # 애플리케이션 예외와 내부 상세 정보
    error_handlers.py         # 전역 HTTP 예외 처리, 메시지 응답
    utils/dates.py            # 날짜 계산
tests/
```

## 계층별 책임

요청은 `controller -> service -> repository -> infrastructure` 순서로 처리합니다. 모델 참조 파일은 repository에서 읽고, 모델 연산은 service에서 수행합니다. 컨트롤러가 업로드 파일을 읽은 뒤 서비스에는 파일 객체 대신 바이트와 DTO를 전달합니다.

권한별 조회 범위와 결과 필드 노출 정책은 analysis_service에서 결정합니다. repository는 조회 조건에 따라 데이터를 가져오고 저장하며, HTTP 응답을 만들지 않습니다. DB의 기존 RLS 정책도 그대로 적용됩니다.

예외는 각 계층에서 AppError로 전달하고, common/error_handlers에서 기존 상태 코드와 메시지 응답으로 변환합니다. 에러 코드와 상세 필드는 내부에서만 사용합니다. 공통 유틸에는 범용 계산만 두고 분석 입력 검증은 service에 둡니다.

## 실행과 검증

backend 디렉터리에서 기존과 동일하게 실행합니다.

```bash
.venv/bin/uvicorn app.main:app --reload --port 8000
.venv/bin/ruff check app tests
.venv/bin/pytest
```

API 경로, 요청·응답 DTO의 필드, 역할별 접근 범위, 모델 계산과 저장 방식은 기존과 같습니다. 환경 설정은 backend/.env를 우선하고 frontend/.env를 로컬 개발용 대체 설정으로 읽습니다. 기존 환경변수 이름과 실행 진입점은 유지합니다.

DTO는 용도별 파일에서 직접 import합니다. `request`는 클라이언트 입력, `response`는 API 응답을 정의합니다. `shared`에는 모델 처리와 응답에서 함께 사용하는 환자·예측 구조를 두고, `internal`에는 응답에서 제외되는 모델 입력 특성과 내부 에러 구조를 둡니다. 내부 ErrorResponse는 기존 예외 변환용이며 HTTP 에러 응답에는 response/error.py의 ErrorMessageResponse만 사용합니다.
