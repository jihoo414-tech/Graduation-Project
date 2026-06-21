# 외부 LUAD 모델 산출물 연동 기획서

> **구현 상태 (2026-06-21):** 아래 기획 중 stateless 실제 모델 연동은 구현되었다. 현재 API는 돌연변이 CSV, RNA-seq CSV, 나이·성별·병기를 받아 293개 feature를 만들고, Cox/RSF/DeepSurv를 실행한 뒤 표준화 점수의 단순 평균을 반환한다. `mock` adapter도 호환성·UI 개발을 위해 유지한다. 로그인, DB, 서버 영구 저장, worker/polling은 의도적으로 구현하지 않았다.

## 구현된 최종 처리 흐름

```text
Mutation matrix CSV + RNA-seq CSV + age/gender/stage
  → mutation feature를 gene_coef.csv 순서에 맞게 0/1로 정렬
  → 누락된 허용 유전자 5개는 0으로 보충
  → RNA-seq로 Stromal / Immune score 계산
  → 288개 mutation + age + gender + stage + Stromal + Immune = 293개 feature
  → Cox(exp(Σ xᵢβᵢ)) / RSF / DeepSurv inference
  → ensemble_stats.json의 평균·표준편차로 각 score z-score화
  → 세 z-score의 단순 평균으로 ensemble score 계산
  → km_data.csv에서 도출한 High/Low 기준과 해당 기준군 KM curve 반환
```

### 실행 설정

```bash
export MODEL_ARTIFACT_DIR='/mnt/c/Users/sksms/Desktop/졸프 모델'
export INFERENCE_ADAPTER=real_ensemble
```

모델 artifact는 repository에 넣지 않고 위 디렉터리에 두어야 한다. 실제 학습 파이프라인과 완전히 같은 수치인지 확인하려면 제작자가 제공하는 golden input/output fixture가 추가로 필요하다. 특히 Stromal/Immune은 전달된 노트북의 점수 규모가 Cox `exp`에서 overflow를 일으켜, 현재 구현은 실행 가능한 `NES` 스케일을 사용한다.

## 목적

이 문서는 현재 `Graduation-Project` 코드베이스와 사용자가 제공한 외부 모델 산출물 묶음을 어디에, 어떤 순서로 연결할 수 있는지 설명하기 위한 기획서다. 구현 지시서가 아니라 팀원/교수/발표자에게 현재 구조와 다음 작업 범위를 설명하는 용도다.

대상 외부 파일:

```text
C:\Users\sksms\Desktop\졸프 모델\deepsurv_model.pt
C:\Users\sksms\Desktop\졸프 모델\ensemble_stats.json
C:\Users\sksms\Desktop\졸프 모델\gene_coef.csv
C:\Users\sksms\Desktop\졸프 모델\km_data.csv
C:\Users\sksms\Desktop\졸프 모델\rsf.model.pkl
```

WSL 환경에서는 다음 경로로 접근 가능하다.

```text
/mnt/c/Users/sksms/Desktop/졸프 모델/
```

---

## 한 줄 결론

현재 프로젝트에는 이미 **CSV/JSON 업로드 → 환자 입력 검증/정규화 → 결과 envelope 반환 → 프론트 결과 표시** 경계가 있으므로, 외부 모델은 백엔드의 `run_mock_inference()` 자리를 대체하는 **real inference adapter**로 연결하는 것이 가장 자연스럽다.

이번 구현 범위에서는 **로그인, DB, 영구 저장, background job, worker, polling API를 제외**한다. 따라서 현재 목표는 같은 응답 형식을 유지하는 **stateless 동기 adapter 구조**를 만들고, 외부 모델 artifact를 백엔드 inference 경계에 안전하게 연결할 준비를 하는 것이다.

---

## 프로젝트 전체 개요

이 프로젝트는 **LUAD(폐선암) 환자의 재발/생존 위험 예측을 보조하는 의료진용 프로토타입**이다. 현재 코드는 실제 모델 서비스 완성본이라기보다, 다음 세 가지를 검증하는 단계에 가깝다.

1. 의료진이 케이스를 생성하고 환자 데이터를 업로드하는 흐름
2. CSV/JSON 환자 입력을 안전하게 검증하고 정규화하는 백엔드 계약
3. 모델 결과를 `ResultEnvelopeV1` 형태로 프론트에 전달해 UI 흐름을 이어가는 구조

현재 구현은 **stateless prototype**이다. 이번 구현에서도 이 전제를 유지한다. 즉, 로그인/DB/영구 저장/worker는 제품 최종 확장안으로만 남기고, 실제 코드 구조는 “업로드 요청 1회 → 결과 응답 1회” 흐름에 맞춘다.

여기서 제외하는 “영구 저장”은 **서버/DB 기반 영구 저장**을 의미한다. 현재 프론트엔드에 있는 `localStorage` 기반 데모 상태 저장은 기존 UX와 테스트를 보존하기 위해 그대로 둔다.

### 이번 구현에서 명시적으로 제외하는 것

```text
제외:
- 로그인 / 회원가입
- 사용자/조직/권한 관리
- PostgreSQL / Supabase / SQLAlchemy / Alembic
- 케이스/결과/리포트 영구 저장
- inference_jobs 테이블
- background worker
- job status polling API
- raw upload binary 저장

포함:
- 현재 FastAPI 업로드 endpoint 유지
- 현재 React 업로드/분석 흐름 유지
- mock adapter 유지
- 외부 모델 artifact 연결용 adapter 경계 추가
- 안전한 CSV/JSON artifact preview 경로 추가
```

---

## 프로젝트 디렉터리 구조

```text
Graduation-Project/
├── README.md
├── backend/
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py
│   │   ├── schemas.py
│   │   └── services/
│   │       ├── contracts.py
│   │       └── inference.py
│   └── tests/
│       └── test_api.py
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── eslint.config.js
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── ErrorAlert.tsx
│       │   ├── product/
│       │   └── workspace/
│       ├── lib/
│       ├── styles.css
│       └── App.test.tsx
└── shared-docs/
    ├── openapi.yaml
    ├── schemas/
    ├── sample-data/
    └── references/
```

각 영역의 역할은 다음과 같다.

| 영역 | 역할 | 핵심 파일 |
|---|---|---|
| `frontend/` | React/Vite 기반 의료진용 데모 UI | `frontend/src/App.tsx`, `frontend/src/components/`, `frontend/src/lib/` |
| `backend/` | FastAPI 기반 업로드/검증/mock inference API | `backend/app/main.py`, `backend/app/services/inference.py`, `backend/app/schemas.py` |
| `shared-docs/` | 프론트/백엔드가 공유하는 API 계약, JSON schema, 샘플 입력, 아키텍처 문서 | `shared-docs/openapi.yaml`, `shared-docs/schemas/`, `shared-docs/sample-data/`, `shared-docs/references/` |
| `.omx/` | 작업 계획/상태/에이전트 런타임 산출물 | 일반 앱 런타임에는 직접 필요하지 않음 |

---

## 현재 사용자가 보는 제품 흐름

현재 프론트엔드는 실제 로그인 시스템 없이, 로그인 후 의료진 workspace처럼 보이는 화면을 바로 제공한다.

```text
Dashboard
  ↓
Cases / 새 케이스 생성
  ↓
Case Builder
  - 케이스 ID
  - 진단 시점
  - 나이/성별
  - 입력 방식 선택: CSV/JSON 업로드 또는 샘플 데이터
  ↓
Upload Page
  - CSV/JSON 파일 선택
  - 샘플 CSV/JSON 다운로드
  - 입력 확인 준비
  ↓
Input Review Panel
  - 비식별 환자 ID
  - 변이 개수
  - 주요 유전자 목록
  - 임상정보 요약
  - 누락값/경고
  ↓
Analyzing Page
  - 모델 예측 수행 중 화면
  ↓
Cases 목록으로 복귀
```

현재 결과 전용 상세 리포트 화면은 축소되어 있다. 이번 범위에서는 DB 기반 결과 이력 화면을 복구하지 않고, 현재 업로드/분석 흐름 안에서 `ResultEnvelopeV1`을 받는 구조만 유지한다.

---

## 현재 백엔드 동작 흐름

현재 백엔드는 다음 순서로 동작한다.

```text
POST /api/v1/inference/upload
  ↓
UploadFile read
  ↓
파일 확장자/content-type 확인
  ↓
CSV 또는 JSON 파싱
  ↓
직접 식별정보 차단
  - name
  - national_id
  - hospital_id
  ↓
단일 환자 업로드인지 확인
  ↓
필수 필드 검증
  - deidentified_patient_id
  - gene
  - variant_classification
  ↓
NormalizedPatientInput 생성
  ↓
run_mock_inference()
  ↓
ResultEnvelopeV1 반환
```

현재 mock inference는 변이 개수 기반으로 위험 점수를 만든다.

```text
score = min(0.95, 0.35 + 0.1 * gene_variant_count)
score < 0.7  → 중간 위험
score >= 0.7 → 높은 위험
```

따라서 현재 백엔드는 실제 의학 모델 판단을 하지 않는다. 외부 모델 파일은 이 mock 계산을 대체하기 위한 후보 artifact다.

---

## 현재 API 계약

현재 주요 endpoint는 세 개다.

| Endpoint | 역할 |
|---|---|
| `GET /api/v1/health` | 백엔드 상태와 현재 adapter 이름 반환 |
| `GET /api/v1/contracts/patient-example` | 샘플 CSV/JSON과 예시 결과 envelope 반환 |
| `POST /api/v1/inference/upload` | CSV/JSON 업로드 후 동기 inference 결과 반환 |

현재 입력 샘플은 다음 형태다.

```json
{
  "deidentified_patient_id": "P-001",
  "gene_variants": [
    { "gene": "TP53", "variant_classification": "Missense_Mutation" },
    { "gene": "EGFR", "variant_classification": "L858R" }
  ],
  "age": 67,
  "pathologic_stage": "IIA",
  "gender": "female"
}
```

현재 결과는 다음 큰 구조를 따른다.

```text
ResultEnvelopeV1
├── result_version
├── patient
├── normalized_input
├── result
│   ├── adapter
│   ├── summary
│   │   ├── risk_level
│   │   ├── risk_score
│   │   └── text
│   └── artifacts
│       └── survival_curve
└── warnings
```

외부 모델 연결 시에도 이 구조를 유지하면 프론트엔드 수정 범위가 작아진다.

---

## 구현된 범위와 아직 계획 단계인 범위

### 현재 구현된 범위

- React/Vite 기반 대시보드와 케이스 흐름
- CSV/JSON 업로드 UI
- 샘플 데이터 다운로드/사용
- FastAPI 업로드 endpoint
- 입력 파싱/검증/정규화
- mock inference 결과 반환
- OpenAPI/JSON schema/sample data 계약
- 프론트/백엔드 테스트

### 아직 구현되지 않았고 이번 범위에서 제외하는 범위

- 실제 로그인/회원가입
- 조직별 사용자/케이스 분리
- PostgreSQL/Supabase 기반 영구 저장
- case/result/report history 저장
- background inference job table
- GPU/CPU worker
- job status polling API
- DB 기반 결과/리포트 상세 화면

### 아직 구현되지 않았지만 이번 범위에 포함될 수 있는 범위

- 외부 artifact 경로 설정
- adapter interface 도입
- mock adapter와 artifact preview adapter 분리
- 실제 DeepSurv/RSF/Cox ensemble adapter를 붙일 수 있는 파일 구조 준비
- feature builder 입력/출력 경계 정의

---

## 현재 구조에서 외부 모델이 들어갈 자리

외부 모델 파일은 프론트가 아니라 **백엔드 inference boundary**에 들어간다. 이유는 다음과 같다.

1. `.pt`, `.pkl` 모델은 Python runtime에서 로딩해야 한다.
2. `rsf.model.pkl`은 pickle 파일이라 브라우저에서 다룰 수 없다.
3. 모델 dependency는 `torch`, `scikit-survival`, `numpy`, `pandas` 등 백엔드 실행 환경에 설치해야 한다.
4. 환자 입력 검증과 직접 식별정보 차단은 이미 백엔드에 있다.
5. 프론트는 모델 내부를 몰라도 `ResultEnvelopeV1`만 받으면 된다.

따라서 외부 모델 연결의 중심은 아래 파일이다.

```text
backend/app/services/inference.py
```

다만 장기적으로는 파싱/정규화와 실제 모델 실행을 같은 파일에 계속 두면 복잡해지므로, adapter 구조로 분리하는 것이 좋다.

---

## 현재 코드에서 이미 준비된 연결 지점

| 영역 | 현재 파일 | 현재 역할 | 외부 모델 연결 지점 |
|---|---|---|---|
| API endpoint | `backend/app/main.py` | `/api/v1/inference/upload`에서 업로드 파일을 읽고 inference 함수를 호출 | `run_mock_inference()` 대신 `run_inference()` 또는 adapter selector 호출 |
| 입력 정규화 | `backend/app/services/inference.py` | CSV/JSON 파싱, 직접 식별정보 차단, `NormalizedPatientInput` 생성 | 실제 모델 feature builder의 입력으로 그대로 사용 가능 |
| 결과 schema | `backend/app/schemas.py` | `risk_level`, `risk_score`, `survival_curve`, `adapter` 포함 응답 모델 정의 | 실제 모델 결과도 기존 `InferenceSuccessResponse`로 감싸면 프론트 수정 최소화 |
| API 계약 | `shared-docs/openapi.yaml` | 업로드/결과/error 계약 정의 | 이번 범위에서는 기존 동기 upload 계약 유지 |
| 결과 타입 | `frontend/src/lib/types.ts` | 프론트가 기대하는 `ResultEnvelope` 정의 | 같은 envelope를 유지하면 프론트 변경 최소화 |
| API 호출 | `frontend/src/lib/api.ts` | `/api/v1/inference/upload` 호출 | 이번 범위에서는 변경 최소화. polling API는 제외 |
| 결과 활용 | `frontend/src/lib/workspace.ts` | `risk_score`, `risk_level`, `survival_curve`로 UI 요약 생성 | 실제 survival curve가 들어오면 fallback curve 대신 실제 값 표시 가능 |
| 테스트 | `backend/tests/test_api.py`, `frontend/src/App.test.tsx` | mock 응답과 계약 검증 | adapter별 테스트와 fixture 기반 모델 테스트 추가 |

핵심 교체점은 현재 백엔드의 아래 흐름이다.

```text
backend/app/main.py
  upload_inference()
    → parse_uploaded_patient(...)
    → run_mock_inference(patient)
```

이 구조를 아래처럼 바꾸는 것이 1차 목표다.

```text
upload_inference()
  → parse_uploaded_patient(...)
  → run_inference(patient, adapter=configured_adapter)
       ├─ mock adapter
       └─ real ensemble adapter
```

---

## 외부 파일별 역할과 연결 방식

| 파일 | 확인된 내용 | 예상 역할 | 연결 위치 |
|---|---:|---|---|
| `deepsurv_model.pt` | 약 91KB, PyTorch zip checkpoint 형식 | DeepSurv 딥러닝 생존분석 모델 가중치 | `DeepSurvAdapter` 또는 ensemble adapter 내부 |
| `rsf.model.pkl` | 약 39.8MB, `sksurv.ensemble.forest.RandomSurvivalForest` pickle | Random Survival Forest 모델 | `RSFAdapter` 또는 ensemble adapter 내부 |
| `gene_coef.csv` | 293행, columns: `significant_genes`, `coef` | Cox 생존분석 risk score 계산. 모델 파일 대신 coefficient table로 사용 | `CoxAdapter` 또는 feature/risk 계산 모듈 |
| `ensemble_stats.json` | `cox_mean/std`, `rsf_mean/std`, `ds_mean/std` | 모델별 점수 z-score 정규화 | ensemble score 계산 모듈 |
| `km_data.csv` | 239행, columns: `time`, `event`, `ensemble_risk`, `risk_group` | Kaplan-Meier reference curve 또는 High/Low risk 분포 표시 | `survival_curve` artifact 생성 또는 프론트 결과 화면 |

확인된 샘플 값:

- `ensemble_stats.json`
  - `cox_mean`: `15150866197057.11`
  - `cox_std`: `112361830968752.72`
  - `rsf_mean`: `76.84743584234789`
  - `rsf_std`: `35.07373223068694`
  - `ds_mean`: `-0.11274595558643341`
  - `ds_std`: `2.280116319656372`
- `gene_coef.csv`
  - 293개 coefficient
  - 최소 coefficient: `Immune = -1.9961075386361413`
  - 최대 coefficient: `Stromal = 4.590918748864139`
- `km_data.csv`
  - `High`: 119건
  - `Low`: 120건

---

## 모델 제작자 제공 사양

모델 제작자가 전달한 설명 기준으로, 실제 모델 연동의 기본 사양은 다음과 같다.

### 전체 모델 구조

현재 인공지능 모델은 세 가지 생존분석 모델을 사용하는 ensemble 구조다.

```text
1. Cox 생존분석 모델
2. Random Survival Forest (RSF)
3. DeepSurv
```

### Cox 모델 처리 방식

Cox 모델은 별도의 모델 파일을 API에서 로드하지 않는다. 대신 `gene_coef.csv`에 들어 있는 유전자별 coefficient를 사용한다.

입력 데이터 `gene_matrix`는 각 유전자의 돌연변이 유무를 0 또는 1로 표현한 **binary mutation matrix**다.

```text
gene_matrix[gene] = 1  → 해당 유전자 돌연변이 있음
gene_matrix[gene] = 0  → 해당 유전자 돌연변이 없음
```

Cox risk score는 다음 공식으로 계산한다.

```text
Risk Score = Σ(x_i × β_i)
```

```text
x_i : i번째 유전자의 돌연변이 여부 (0 또는 1)
β_i : gene_coef.csv에 있는 i번째 유전자의 coefficient
```

현재 백엔드 입력은 `gene_variants` 배열이므로, real adapter에서는 이를 `gene_coef.csv`의 유전자 목록 기준 binary vector로 변환해야 한다.

```text
NormalizedPatientInput.gene_variants
  ↓
gene_coef.csv의 significant_genes 순서에 맞춘 binary mutation vector
  ↓
Σ(x_i × β_i)
  ↓
Cox risk score
```

### RSF / DeepSurv 처리 방식

RSF와 DeepSurv는 학습된 모델 자체가 필요하므로 API backend에서 모델 파일을 로드해 inference를 수행한다.

```text
RSF     → rsf_model.pkl 또는 rsf.model.pkl
DeepSurv → deepsurv_model.pt
```

주의: 현재 사용자가 처음 제공한 실제 파일명은 `rsf.model.pkl`이고, 제작자 설명에는 `rsf_model.pkl`로 표기되어 있다. 구현 시 파일명을 하나로 통일하거나 둘 중 하나를 fallback 없이 명시적으로 설정해야 한다.

### Ensemble normalization

Ensemble 계산에 필요한 모델별 normalization 기준값은 `ensemble_stats.json`에 들어 있다.

```text
cox_mean, cox_std
rsf_mean, rsf_std
ds_mean, ds_std
```

실제 ensemble adapter는 각 모델 score를 계산한 뒤 이 mean/std로 정규화해야 한다.

### Kaplan-Meier curve

별도의 생존곡선 파일은 추가로 만들지 않는다. `km_data.csv`에 다음 정보가 들어 있으므로, 백엔드에서 Kaplan-Meier curve를 직접 생성한다.

```text
time
event
ensemble_risk
risk_group
```

따라서 `ResultEnvelopeV1.result.artifacts.survival_curve`는 `km_data.csv`를 기반으로 생성하는 것이 현재 계획과 맞다.

---

## 가장 현실적인 연동 전략

### Option A — 빠른 발표/시연용: 동기 real adapter 붙이기

현재 API 계약을 거의 유지하면서 `run_mock_inference()`를 실제 ensemble adapter로 대체한다.

장점:

- 현재 프론트 구조를 거의 유지할 수 있다.
- `ResultEnvelopeV1` 계약을 그대로 사용할 수 있다.
- 구현 범위가 가장 작다.
- 외부 모델 산출물이 프로젝트에 실제로 연결되는 것을 빠르게 보여줄 수 있다.

단점:

- 모델 실행 시간이 길면 HTTP timeout 문제가 생긴다.
- `.pkl`/PyTorch 모델 로딩 dependency가 backend runtime에 직접 들어온다.
- 배포 환경이 무거워진다.

적합한 경우:

- 로컬 시연
- 모델 inference가 실제로는 짧게 끝나는 경우
- 먼저 “연결 가능성”을 증명해야 하는 경우

---

### Option B — 이번 구현 권장안: stateless adapter 구조

현재 upload endpoint는 유지하되, inference 실행 부분만 adapter로 분리한다.

장점:

- 로그인/DB/영구저장 없이 현재 제품 흐름을 유지한다.
- `mock`, `artifact_preview`, 향후 `real_ensemble`을 환경변수로 교체할 수 있다.
- 프론트엔드와 OpenAPI 계약 변경을 최소화한다.
- 외부 artifact 연결 지점을 명확히 만들 수 있다.

단점:

- 실제 모델 실행이 오래 걸리면 HTTP timeout 문제가 남는다.
- 모델 dependency가 백엔드 실행 환경에 들어온다.
- 결과 이력은 저장하지 않는다.

적합한 경우:

- 현재 졸업 프로젝트 데모
- 외부 모델 artifact 연결 가능성 증명
- “업로드 1회 → 결과 1회” 흐름 유지

---

### Option C — 이번 범위 밖 참고안: background job + worker

실제 서비스에서 10분짜리 inference를 안정적으로 처리하려면 background job + worker가 좋지만, 이 방식은 DB와 영구 저장이 필요하므로 이번 구현에서 제외한다.

```text
FastAPI endpoint → DB job 생성 → worker → real adapter → DB result 저장
```

이 문서에서는 참고 아키텍처로만 남긴다.

---

## 제안하는 백엔드 파일 구조

현재:

```text
backend/app/services/
├── contracts.py
└── inference.py
```

제안:

```text
backend/app/services/
├── contracts.py
├── inference.py                 # 기존 parsing/normalization은 유지
├── errors.py                    # API-safe error envelope 공통 처리
├── model_artifacts.py           # artifact 경로/CSV/JSON artifact 검증
├── adapters/
│   ├── __init__.py
│   ├── base.py                  # InferenceAdapter protocol/interface
│   ├── registry.py              # INFERENCE_ADAPTER 선택
│   ├── mock.py                  # 기존 mock 결과 생성
│   ├── artifact_preview.py      # 안전한 CSV/JSON artifact preview
│   └── real_ensemble.py         # 향후 실제 모델 파일 기반 adapter 후보
└── feature_builder.py           # 향후 NormalizedPatientInput → 모델 feature vector
```

환경변수 예시:

```text
INFERENCE_ADAPTER=mock
MODEL_ARTIFACT_DIR=/mnt/c/Users/sksms/Desktop/졸프 모델
```

현재 구현 가능한 adapter 범위:

```text
INFERENCE_ADAPTER=mock
  - 기존 동작 유지

INFERENCE_ADAPTER=artifact_preview
  - gene_coef.csv, ensemble_stats.json, km_data.csv만 사용
  - rsf.model.pkl / deepsurv_model.pt는 실행하지 않음
  - DB/login/storage 없이 외부 artifact 연결 경로 검증
```

운영/배포에서는 Windows Desktop 경로를 직접 쓰지 말고, 서버 내부의 안전한 모델 artifact 디렉터리를 지정한다.

```text
MODEL_ARTIFACT_DIR=/opt/graduation-project/model-artifacts
```

---

## 실제 inference adapter의 예상 내부 흐름

```text
NormalizedPatientInput
  ↓
feature_builder.py
  - gene_variants를 gene_coef.csv / 학습 당시 feature 순서에 맞게 binary mutation vector로 변환
  - clinical field를 숫자/범주형 feature로 변환
  - 없는 feature는 0 또는 학습 당시 기본값으로 채움
  ↓
Cox score
  - 별도 Cox 모델 파일 없이 gene_coef.csv coefficient 적용
  - Risk Score = Σ(x_i × β_i)
  - x_i = 유전자 돌연변이 여부(0/1)
  - β_i = gene_coef.csv coefficient
  ↓
RSF score
  - rsf.model.pkl 로딩 후 예측
  ↓
DeepSurv score
  - deepsurv_model.pt 로딩 후 예측
  ↓
ensemble_stats.json으로 z-score 정규화
  - cox_mean/std, rsf_mean/std, ds_mean/std 적용
  ↓
ensemble risk score 계산
  ↓
High/Low 또는 한국어 risk_level 산출
  ↓
km_data.csv 기반 Kaplan-Meier survival_curve 생성
  ↓
InferenceSuccessResponse 반환
```

현재 프론트가 이미 기대하는 출력 형태:

```json
{
  "result_version": "v1",
  "patient": { "deidentified_patient_id": "..." },
  "normalized_input": { "...": "..." },
  "result": {
    "adapter": "real_ensemble",
    "summary": {
      "risk_level": "높은 위험",
      "risk_score": 0.82,
      "text": "실제 LUAD ensemble 모델 기반 예측 결과입니다."
    },
    "artifacts": {
      "survival_curve": {
        "label": "예상 생존/무사건 확률",
        "points": [
          { "time": 0, "survival_probability": 1.0 },
          { "time": 1, "survival_probability": 0.91 }
        ]
      }
    }
  },
  "warnings": []
}
```

---

## feature 생성 방식: 해소된 내용과 남은 불확실성

외부 모델 파일이 있어도, 실제 연결에서 가장 중요한 것은 **모델에 넣을 feature vector를 학습 당시와 완전히 같은 방식으로 만드는 것**이다.

현재 프로젝트 입력은 다음 수준이다.

```json
{
  "deidentified_patient_id": "P-001",
  "gene_variants": [
    { "gene": "TP53", "variant_classification": "Missense_Mutation" }
  ],
  "clinical": {
    "age": 67,
    "pathologic_stage": "IIA",
    "gender": "female"
  }
}
```

모델 제작자 전달 내용으로 아래 항목은 명확해졌다.

```text
해소됨:
- Cox 모델은 별도 모델 파일을 로드하지 않는다.
- Cox 모델은 gene_coef.csv coefficient를 사용한다.
- Cox 입력은 binary mutation matrix다.
- Cox risk score 공식은 Risk Score = Σ(x_i × β_i)다.
- RSF와 DeepSurv는 각각 모델 파일을 로드해 inference한다.
- Ensemble normalization mean/std는 ensemble_stats.json을 사용한다.
- Kaplan-Meier curve는 km_data.csv에서 backend가 직접 생성한다.
```

남은 핵심 불확실성은 RSF/DeepSurv와 ensemble 결합에 필요한 feature 재현 정보다.

- 학습 당시 전체 feature column 목록
- feature 순서
- RSF/DeepSurv도 Cox와 같은 binary mutation matrix를 쓰는지 여부
- RSF/DeepSurv에서 `variant_classification`을 쓰는지 여부
- `Immune`, `Stromal` 같은 feature를 어떻게 계산하는지
- clinical field encoding 방식
- 결측값 처리 방식
- DeepSurv 모델 class architecture
- PyTorch / scikit-survival / numpy / sklearn 버전
- ensemble score 공식과 High/Low threshold

따라서 외부 모델 연결 전 필수 확인 자료는 다음과 같다.

```text
1. training preprocessing code
2. training feature column list와 순서
3. RSF/DeepSurv 입력 matrix schema
4. DeepSurv model class definition
5. RSF 학습 시 사용한 scikit-survival/sklearn/numpy 버전
6. Cox/RSF/DeepSurv 점수를 ensemble하는 공식
7. risk_group을 High/Low로 나누는 threshold
8. 실제 파일명: `rsf_model.pkl`인지 `rsf.model.pkl`인지
```

이 자료가 없으면 Cox preview는 구현할 수 있지만, RSF/DeepSurv 예측값과 최종 ensemble risk가 학습 때와 같은 의미를 갖는다고 보장하기 어렵다.

---

## 프론트엔드 변경 필요성

### 동기 adapter 단계

기존 `ResultEnvelopeV1` 형태를 유지하면 프론트 수정은 작다.

바뀔 가능성이 있는 곳:

- `frontend/src/lib/types.ts`
  - artifacts에 모델별 세부 점수, confidence, feature importance를 추가할 경우 타입 확장
- `frontend/src/lib/workspace.ts`
  - 현재는 `survival_curve`가 없으면 가짜 curve를 생성한다.
  - 실제 모델에서 curve를 내려주면 그대로 표시 가능하다.
- `frontend/src/App.test.tsx`
  - mock adapter 고정 문구/점수 테스트를 real adapter 대응 fixture로 확장

### 제외된 background job 단계

이번 구현에서는 아래 흐름을 만들지 않는다.

```text
uploadPatientFile()
  → { job_id }
  → pollJobStatus(job_id)
  → fetchInferenceResult(result_id)
```

따라서 `frontend/src/lib/api.ts`에는 polling 함수가 추가되지 않고, `frontend/src/App.tsx`도 현재 동기 upload 결과 흐름을 유지한다.

---

## API 계약 변경 계획

### 이번 구현: 동기 adapter 계약 유지

기존 endpoint 유지 가능:

```text
POST /api/v1/inference/upload
→ ResultEnvelopeV1
```

단, health 응답의 adapter 값은 현재 선택된 adapter를 반환하도록 바꾼다.

```json
{
  "status": "ok",
  "adapter": "mock"
}
```

선택 가능한 adapter 예시:

```text
INFERENCE_ADAPTER=mock
INFERENCE_ADAPTER=artifact_preview
```

### 이번 구현에서 추가하지 않는 API

- `POST /api/v1/inference/jobs/upload`
- `GET /api/v1/inference/jobs/{job_id}`
- `GET /api/v1/inference/results/{result_id}`
- 로그인/auth 관련 endpoint
- case/result persistence endpoint

---

## dependency 영향

현재 backend dependency는 가볍다.

```text
fastapi
pydantic
python-multipart
uvicorn
```

실제 모델 연결 시 추가 가능성이 높은 dependency:

```text
numpy
pandas
scikit-learn
scikit-survival
joblib
torch
```

주의:

- `scikit-survival`은 설치가 까다로울 수 있다.
- `torch`는 용량이 크다.
- `.pkl` 로딩은 신뢰된 artifact만 대상으로 해야 한다.
- 이번 구현은 worker를 제외하므로 실제 모델을 동기 실행하려면 backend 환경에 dependency를 설치해야 한다.

권장:

- 현재 리팩토링 단계: 추가 dependency 없이 `artifact_preview`로 CSV/JSON artifact 연결만 검증
- 실제 모델 실행 단계: backend에 필요한 dependency를 명시적으로 추가
- `.pkl`/`.pt` 실행은 feature builder와 모델 class가 확인된 뒤에만 활성화

---

## 보안 및 안전 주의사항

1. `rsf.model.pkl`은 pickle 파일이므로 임의 역직렬화 위험이 있다.
   - 신뢰된 학습 산출물만 로딩해야 한다.
   - 사용자 업로드 파일처럼 취급하면 안 된다.
2. 모델 artifact 경로는 코드에 하드코딩하지 않고 환경변수로 둔다.
3. raw upload binary는 현재 계획처럼 저장하지 않는 방향이 안전하다.
4. 에러 응답에는 환자 입력값/유전자 목록/직접 식별정보를 그대로 echo하지 않는다.
   - 현재 backend 테스트가 이 원칙을 일부 검증하고 있다.
5. 모델 로딩 실패와 inference 실패는 구분해서 기록하되, 사용자 응답에는 안전한 메시지만 반환한다.

---

## 구현 단계 제안

### Phase 0 — artifact와 학습 정보 정리

목표: 모델을 실제로 호출하기 전에 feature 재현 가능성을 확보한다.

작업:

1. 외부 모델 파일을 프로젝트 외부 artifact 디렉터리에 보관한다.
2. 학습 당시 feature list와 preprocessing code를 확보한다.
3. DeepSurv class definition을 확보한다.
4. ensemble 공식과 threshold를 문서화한다.
5. 작은 fixture 환자 1~3명에 대해 기대 출력값을 기록한다.

완료 기준:

- 같은 입력에 대해 노트북/스크립트/백엔드 adapter가 같은 risk score를 낸다.

---

### Phase 1 — adapter interface 도입

목표: mock과 real 모델을 같은 interface로 교체 가능하게 만든다.

작업:

1. `backend/app/services/adapters/base.py` 추가
2. 기존 `run_mock_inference()`를 `MockInferenceAdapter`로 이동 또는 래핑
3. `INFERENCE_ADAPTER` 환경변수 추가
4. `/api/v1/health`가 현재 adapter 이름을 반환하도록 조정
5. 기존 테스트가 mock adapter 기준으로 계속 통과하도록 유지

완료 기준:

- `INFERENCE_ADAPTER=mock`에서 기존 테스트가 모두 통과한다.

---

### Phase 2 — artifact preview adapter

목표: `.pkl`/`.pt`를 실행하지 않고, 안전한 CSV/JSON artifact 연결 경로를 먼저 검증한다.

작업:

1. `MODEL_ARTIFACT_DIR` 환경변수로 artifact 디렉터리 지정
2. `ensemble_stats.json`, `gene_coef.csv`, `km_data.csv` 로더 작성
3. `INFERENCE_ADAPTER=artifact_preview` 선택 경로 추가
4. gene coefficient 기반 preview risk score 계산
5. `km_data.csv` 기반 Kaplan-Meier reference curve 생성
6. RSF/DeepSurv가 아직 실행되지 않는다는 warning 반환

완료 기준:

- 샘플 환자 fixture를 업로드하면 `adapter="artifact_preview"` 결과가 반환된다.
- 응답이 `result-envelope-v1.schema.json`을 통과한다.

---

### Phase 3 — real ensemble adapter 준비

목표: 학습 당시 feature 재현 정보가 확보된 뒤 실제 모델 실행 adapter를 추가할 수 있게 한다.

작업:

1. `feature_builder.py` 작성
2. `rsf.model.pkl` 로딩 코드 작성
3. `deepsurv_model.pt` 로딩 코드 작성
4. Cox/RSF/DeepSurv score 계산
5. ensemble score와 risk level 계산
6. survival curve artifact 생성

완료 기준:

- 샘플 환자 fixture를 업로드하면 `adapter="real_ensemble"` 결과가 반환된다.
- mock/artifact_preview/real_ensemble adapter가 같은 `ResultEnvelopeV1` 계약을 지킨다.

---

### 이번 범위에서 제외된 Phase — background job 구조

아래 작업은 로그인/DB/영구저장 제외 결정 때문에 이번 범위에서 하지 않는다.

작업:

1. DB schema 추가: `inference_jobs`, `inference_results`
2. upload endpoint가 즉시 `job_id`를 반환하도록 변경
3. worker 프로세스 추가
4. worker가 real ensemble adapter를 호출하도록 구성
5. frontend polling 추가
6. 실패/재시도/timeout 정책 추가

제외 사유:

- DB schema와 영구 저장이 필요하다.
- upload 응답 계약이 `{ job_id, status }`로 바뀐다.
- 프론트 polling 흐름이 필요하다.
- 이번 목표인 stateless 동기 adapter 리팩토링보다 범위가 크다.

---

## 테스트 전략

### 백엔드

- 기존 업로드 검증 테스트 유지
- artifact 경로 누락 시 안전한 에러 테스트
- schema validation 테스트 유지
- mock adapter와 artifact preview adapter 선택 테스트
- real adapter는 향후 작은 fixture 또는 monkeypatch된 모델 loader로 단위 테스트
- 실제 artifact 통합 테스트는 optional marker로 분리

예시:

```text
pytest
pytest -m model_integration
```

### 프론트엔드

- mock result fixture 유지
- real adapter result fixture 추가
- survival_curve 존재/부재 양쪽 테스트
- polling 테스트는 이번 범위에서 제외

### 수동 검증

```text
1. Backend 실행
2. Frontend 실행
3. sample patient JSON 업로드
4. 입력 검토 패널 확인
5. 분석 실행
6. cases 목록에 결과 상태 반영 확인
7. API 응답이 shared schema를 통과하는지 확인
```

---

## 의사결정 권장안

현재 상태에서 추천하는 순서는 다음과 같다.

1. **먼저 adapter interface를 만든다.**
   - mock을 유지하면서 artifact preview와 향후 real adapter를 추가할 수 있게 한다.
2. **외부 모델 feature 재현 정보를 확보한다.**
   - 이 단계가 없으면 모델 연결은 가능해도 결과 신뢰성이 낮다.
3. **`artifact_preview` adapter로 1차 연결을 증명한다.**
   - `.pkl`/`.pt` 실행 없이 안전한 artifact 연결과 UI/API 계약을 검증한다.
4. **feature builder가 확보되면 동기 `real_ensemble` adapter를 추가한다.**
   - 로그인/DB/영구저장은 계속 제외한다.

이번 구현 권장 아키텍처:

```text
Frontend
  → FastAPI upload/validation API
  → stateless inference adapter
      ├─ mock
      ├─ artifact_preview
      └─ real_ensemble (향후)
  → ResultEnvelopeV1
```

현재 리팩토링 후 단기 데모 아키텍처:

```text
Frontend
  → FastAPI upload/validation API
  → mock 또는 artifact_preview adapter
  → ResultEnvelopeV1
```

---

## 남은 확인 질문

실제 구현 전에 아래 정보가 필요하다.

1. DeepSurv 모델 class architecture 파일이 있는가?
2. 학습 때 사용한 feature column 순서 파일이 있는가?
3. `Immune`, `Stromal` feature는 어디서 계산되는가?
4. RSF/DeepSurv도 Cox와 동일한 binary mutation matrix를 입력으로 쓰는가?
5. RSF/DeepSurv에서 `variant_classification`은 feature로 쓰이는가?
6. Cox/RSF/DeepSurv ensemble 공식은 단순 평균인가, 가중 평균인가?
7. High/Low risk threshold는 무엇인가?
8. `rsf_model.pkl`과 `rsf.model.pkl` 중 최종 파일명은 무엇으로 통일할 것인가?
9. inference 시간이 실제로 10분인지, 현재 artifact 기준으로 로컬에서 몇 초/분인지?
10. 발표 목표가 “안전한 artifact preview”인지, “실제 모델 실행 adapter”인지?

---

## 현재 코드 기준 최단 연결 후보

가장 먼저 수정할 가능성이 높은 파일은 다음과 같다.

```text
backend/app/main.py
backend/app/services/inference.py
backend/app/services/adapters/base.py          # 신규
backend/app/services/adapters/mock.py          # 신규
backend/app/services/adapters/registry.py      # 신규
backend/app/services/adapters/artifact_preview.py # 신규
backend/app/services/errors.py                 # 신규
backend/app/services/model_artifacts.py        # 신규
backend/pyproject.toml
backend/tests/test_api.py
shared-docs/schemas/result-envelope-v1.schema.json
frontend/src/lib/types.ts
frontend/src/lib/workspace.ts
frontend/src/App.test.tsx
```

동기 adapter만 붙이는 경우 프론트 수정은 최소화할 수 있고, 대부분의 작업은 backend 내부에 집중된다.
