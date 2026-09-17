# Frontend

React와 TypeScript를 사용하며, 백엔드 도메인과 맞춰 기능별로 관련 코드를 모읍니다.
페이지 이름을 먼저 찾고 같은 기능 폴더 안에서 상태 처리와 API를 따라갈 수 있습니다.

프론트의 `pages`/`components`는 화면, `hooks`는 서비스 로직, `api`는 저장소·서버 통신,
`model`은 타입과 순수 계산을 담당합니다.

## 디렉터리 구조

```text
src/
  main.tsx                    # React 실행 진입점
  app/
    App.tsx                   # 로그인 상태와 화면 전환 연결
    layout/                   # 공통 사이드바와 로그인 후 레이아웃
    config/                   # 앱 전체 제품 설정
  features/
    auth/
      api/                    # Supabase 인증 클라이언트
      hooks/                  # 로그인 세션과 인증 폼 상태
      pages/                  # 로그인·회원가입 화면
      components/             # 세션 확인·설정 안내 화면
    patients/
      api/                    # 등록 환자 목록·등록 해제
      hooks/                  # 환자 목록 조회와 검색 상태
      model/                  # 환자 목록 타입
    analysis/
      api/                    # 분석 업로드와 저장 결과 조회
      hooks/                  # 분석 진행 상태와 목록 조회 상태
      pages/                  # 입력·진행 중·목록·결과·대시보드 화면
      components/             # 입력 단계·목록 항목·차트
      model/                  # 요청·응답 타입, 입력 검증, 검색 로직
    admin/
      api/                    # 사용자 목록과 역할 변경
      hooks/                  # 관리자 사용자 관리 상태
      components/             # 사용자 역할 관리 패널
      model/                  # 관리자 사용자 타입
  shared/
    api/                      # 공통 HTTP 처리와 에러 메시지 변환
    types/                    # 기능 간 공통 역할 타입
    ui/                       # 기능에 종속되지 않는 공통 UI
    styles/                   # 기존 전역 스타일
  test/                       # 공통 테스트 설정
```

## 파일을 찾는 방법

| 변경할 내용 | 위치 |
| --- | --- |
| 로그인·회원가입 화면 | features/auth/pages/AuthPage.tsx |
| 로그인 유지와 로그아웃 | features/auth/hooks/useAuthSession.ts |
| 등록 환자 목록·등록 해제 | features/patients/ |
| 분석 화면 전환과 입력 초기화 | features/analysis/hooks/useAnalysisWorkflow.ts |
| 입력 항목과 파일 업로드 UI | features/analysis/components/ClinicalStep.tsx, FileUploadStep.tsx |
| 대시보드의 저장 결과 목록 | features/analysis/pages/AnalysisListPage.tsx |
| 분석 결과 상세 화면과 차트 | features/analysis/pages/ResultPage.tsx, components/SurvivalCurveChart.tsx |
| 백엔드 요청 경로·파일 전송 | features/analysis/api/, features/patients/api/ |
| 요청·응답 데이터 필드 | features/analysis/model/, features/patients/model/ |
| 관리자 사용자 역할 관리 | features/admin/ |
| 공통 네트워크 에러 처리 | shared/api/ |

## 분리 기준

`app`은 기능을 연결하고 `features`는 각 기능의 화면과 동작을 담당합니다.
`shared`는 특정 기능을 알지 못하는 공통 코드만 담습니다.
인증 기능은 다른 feature가 직접 import하지 않고 App이 토큰과 콜백을 전달합니다.
분석 화면이 환자 목록이 필요할 때는 patients feature의 훅을 사용합니다.

로그인 전에는 환자 또는 관리자 화면을 선택합니다. 이 선택은 화면만 결정하며 권한을 부여하지 않습니다.
로그인 후 `/api/v1/auth/me` 응답의 실제 역할을 확인하고, 환자는 분석·본인 결과 화면으로,
의사와 관리자는 전체 결과 조회 화면으로 이동합니다. 관리자 화면에서는 공개 회원가입을 제공하지 않습니다.

환자는 담당 의료진이 자신의 DB 사용자 ID에 배정한 결과만 확인합니다.
의사와 관리자는 등록 환자 목록에서 환자를 선택한 후 임상 정보와 두 CSV 파일을 입력해 분석합니다.
분석 흐름은 `환자 선택 → 임상 정보 → 파일 업로드` 순서입니다.

환자와 분석 결과는 이름을 중심으로 표시하며 UUID는 화면에 노출하지 않습니다.
분석 결과는 5건씩 페이지 이동합니다. 의사는 환자·분석 업무와 소프트 삭제를 수행하고,
관리자는 동일한 임상 기능에 계정 역할 관리가 추가됩니다.

ESLint는 shared가 app·features를 참조하거나 features가 app을 참조하는 역방향 의존성을 검사합니다.

`pages`는 화면 배치, `components`는 화면의 일부, `hooks`는 상태와 사용자 동작, `api`는 서버 통신,
`model`은 타입과 순수 계산을 담당합니다. 작은 컴포넌트의 props 타입은 해당 파일에 두고
요청·응답 계약만 model에서 관리합니다. 폴더별 index.ts 재수출을 만들지 않고 실제 파일을 직접 import합니다.

분석 입력 상태는 화면이 바뀌어도 App에 연결된 훅에 남습니다.
새 분석과 로그아웃 시 초기화하며, 결과 화면에서 돌아가는 위치도 기존 동작을 유지합니다.
API 경로·폼 필드·인증 토큰 전달 방식은 그대로입니다.

스타일은 shared/styles/global.css로 이동하면서 내용과 적용 순서를 유지했습니다.
기존 CSS에는 여러 번 덮어쓰는 규칙이 있어, 이번 구조 변경에서는 기능별로 재배치하지 않았습니다.
새 기능의 전용 스타일은 해당 기능에 두되 기존 전역 규칙에 미치는 영향을 확인합니다.

테스트는 검증 대상 가까이에 둡니다.
App.workflow.test.tsx는 분석 실행·오류 복구·저장 결과 열기·로그아웃 흐름을 검증합니다.
HTTP와 Supabase는 테스트에서 대체하며 실제 계정이나 저장 데이터에 영향을 주지 않습니다.

## 실행과 검증

frontend 디렉터리에서 실행합니다. 기존 .env 설정을 그대로 사용합니다.

```bash
npm run dev
npm run lint
npm test
npm run build
```
