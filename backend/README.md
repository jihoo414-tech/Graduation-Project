# Backend

FastAPI 백엔드는 도메인별로 `controller -> service -> repository`를 나눕니다.
공통 설정·예외와 Supabase 통신은 도메인 바깥에 둡니다.

## 디렉터리 구조

```text
app/
  main.py                     # 앱 구성, 미들웨어, 도메인 라우터 등록
  domains/
    auth/
      controller.py           # GET /api/v1/auth/me
      service.py              # 토큰 처리, 사용자 검증과 역할 판정
      repository.py           # Supabase 사용자와 프로필 조회
      models.py               # 사용자와 역할 정의
      schemas/                # 현재 사용자 응답
    patients/
      controller.py           # 환자 목록·소프트 삭제 API
      service.py              # 임상 권한, 환자 집계, 존재 확인
      repository.py           # 환자 프로필 조회와 소프트 삭제
      schemas/                # 환자 목록 응답
    analysis/
      controller.py           # 결과 목록·삭제와 multipart 업로드 API
      service.py              # 조회 범위, 노출 정보, 저장 데이터 변환
      inference_service.py    # 입력 정규화 -> 모델 실행 -> 결과 저장
      repository.py           # 분석 결과 조회·저장·소프트 삭제
      validation.py           # 업로드 형식과 생년월일 검증
      model_artifacts.py      # 모델 파일 경로와 참조 데이터 로딩
      inference/              # 특성 생성, 앙상블, 생존곡선, 모델 어댑터
      schemas/                # 업로드 요청과 분석·추론 응답
    admin/
      controller.py           # 사용자 목록과 역할 변경 API
      service.py              # 관리자 권한과 역할 변경 규칙
      repository.py           # 프로필 목록 조회와 역할 변경
      schemas/                # 역할 변경 요청과 사용자 목록 응답
    health/
      controller.py           # 상태 확인 API
      service.py              # 현재 추론 어댑터 상태
      schemas.py              # 상태 응답
  infrastructure/
    supabase_client.py        # Supabase 공통 HTTP 통신
  common/
    config.py                 # 환경변수, 로컬 설정과 CORS
    exceptions.py             # 애플리케이션 예외와 내부 상세 정보
    error_handlers.py         # 전역 HTTP 예외 처리, 메시지 응답
    utils/dates.py            # 날짜 계산
tests/
```

## 계층별 책임

요청은 `controller -> service -> repository -> infrastructure` 순서로 처리합니다.
컨트롤러는 HTTP 입력을 읽고 서비스에 넘기며, 업로드 파일은 파일 객체 대신 바이트와 DTO를 전달합니다.
서비스는 권한·조회 범위·응답 변환을 담당하고, 모델 연산도 analysis 서비스에서 수행합니다.
repository는 조회 조건에 따라 데이터를 가져오고 저장하며, HTTP 응답을 만들지 않습니다.
모델 참조 파일은 `model_artifacts`에서 읽고, DB의 기존 RLS 정책도 그대로 적용됩니다.

권한별 조회 범위와 결과 필드 노출 정책은 analysis 서비스에서 결정합니다.
환자는 자신에게 배정된 분석 결과만 조회하고 분석 실행 API를 사용할 수 없습니다.
의사와 관리자는 `GET /api/v1/patients`에서 등록 환자를 조회하고, 분석 요청에 환자의 `profiles.id` UUID를 전달합니다.
분석 결과의 `created_by`는 분석 실행자, `patient_user_id`는 결과를 확인할 환자를 의미합니다.

환자와 분석 결과 삭제는 `deleted_at`을 기록하는 소프트 삭제입니다.
의사와 관리자는 임상 데이터 조회·분석·소프트 삭제 권한을 가지며, 관리자만 사용자 역할을 변경할 수 있습니다.
분석 결과 API는 한 페이지에 5건을 반환합니다.

`GET /api/v1/auth/me`는 로그인 토큰을 검증하고 `profiles` 테이블에서 확인한 실제 역할을 반환합니다.
프론트에서 선택한 사용자 유형이나 사용자가 수정할 수 있는 Auth 메타데이터는 권한 판정에 사용하지 않습니다.

예외는 각 계층에서 AppError로 전달하고, common/error_handlers에서 기존 상태 코드와 메시지 응답으로 변환합니다.
에러 코드와 상세 필드는 내부에서만 사용합니다.
공통 유틸에는 범용 계산만 두고 분석 입력 검증은 analysis 도메인에 둡니다.

## 실행과 검증

backend 디렉터리에서 기존과 동일하게 실행합니다.

```bash
.venv/bin/uvicorn app.main:app --reload --port 8000
.venv/bin/ruff check app tests
.venv/bin/pytest
```

API 경로, 요청·응답 필드의 이름, 역할별 접근 범위, 모델 계산과 저장 방식은 기존과 같습니다.
환경 설정은 backend/.env를 우선하고 frontend/.env를 로컬 개발용 대체 설정으로 읽습니다.
기존 환경변수 이름과 실행 진입점은 유지합니다.

스키마는 도메인 폴더에서 직접 import합니다.
`request`는 클라이언트 입력, `response`는 API 응답을 정의합니다.
모델 처리와 응답에서 함께 사용하는 환자·예측 구조도 해당 도메인 스키마에 둡니다.
내부 ErrorResponse는 기존 예외 변환용이며 HTTP 에러 응답에는 common/error_response.py의 ErrorMessageResponse만 사용합니다.
