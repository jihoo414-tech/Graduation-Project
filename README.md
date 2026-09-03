# LUAD 생존 위험 분석

## Supabase 인증 및 결과 저장

이번 개정판에는 계정 생성, 로그인, 로그아웃 기능과 AI 분석 결과를 Supabase에 자동으로 저장하는 기능이 추가되었습니다.

1. Supabase 프로젝트를 만들고 이메일 인증을 활성화합니다.
2. Supabase SQL 편집기에서 `shared-docs/schemas/supabase-analysis-results.sql`을 실행합니다.
3. `frontend/.env.example`을 `frontend/.env`로 복사한 뒤 다음 값을 설정합니다.

```text
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. 로컬 개발 환경에서는 백엔드가 `frontend/.env`의 Supabase 설정값을 자동으로 재사용합니다.
   또는 `backend/.env.example`을 `backend/.env`로 복사한 뒤 다음 값을 설정할 수 있습니다.

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
MODEL_ARTIFACT_DIR=model-artifacts
```

운영체제 환경 변수로 설정한 값은 두 `.env` 파일의 값보다 우선합니다.
`.env` 파일을 변경한 뒤에는 백엔드를 다시 시작하세요. 로그인 후
`/api/v1/inference/upload`는 Supabase 세션 토큰을 검증하고 대시보드 결과를
`analysis_results`에 추가합니다. 행 수준 보안 정책에 따라 각 사용자는 자신의
분석 결과만 조회하거나 추가할 수 있습니다.

`analysis_results` 테이블의 각 열은 다음 의미입니다.

| 열 | 의미 |
|---|---|
| `id` | 분석 결과 한 건의 고유 UUID입니다. 자동 생성됩니다. |
| `user_id` | 분석을 실행한 계정의 UUID입니다. `Authentication → Users`의 사용자 `id`와 연결됩니다. 계정 삭제 시 분석 결과도 삭제됩니다. |
| `patient_id` | 업로드한 데이터에서 추출한 비식별 환자 ID입니다. |
| `risk_group` | 최종 위험군입니다. `High`(고위험) 또는 `Low`(저위험)입니다. |
| `risk_score` | Cox, RSF, DeepSurv 모델의 표준화 점수를 평균한 최종 앙상블 점수입니다. |
| `risk_threshold` | 고위험/저위험군을 나누는 기준 점수입니다. `risk_score`가 이 값 이상이면 `High`입니다. |
| `age` | 분석 시 입력한 생년월일로 계산된 환자 나이입니다. |
| `gender` | 입력한 환자 성별입니다. |
| `stage` | 입력한 병기입니다. 예: `3` |
| `variant_count` | 변이 유전자 CSV에서 정규화된 유전자 변이 개수입니다. |
| `stromal_score` | RNA-seq 데이터로 계산한 종양 미세환경의 기질 세포 관련 점수입니다. |
| `immune_score` | RNA-seq 데이터로 계산한 면역 세포 관련 점수입니다. |
| `adapter` | 분석에 사용된 백엔드 모델 어댑터입니다. 현재 실제 분석에는 일반적으로 `real_ensemble`이 사용됩니다. |
| `result_version` | 결과 데이터 구조의 버전입니다. 현재 실제 앙상블 결과는 `v2`입니다. |
| `normalized_input` | 모델에 전달하도록 정리한 입력 전체를 담은 JSON입니다. 환자 ID, 임상정보, 유전자 변이 목록 등이 들어갑니다. |
| `result_payload` | 분석 API가 반환한 전체 결과 JSON입니다. 모델별 점수, 위험군, 경고, 생존곡선 등을 모두 포함합니다. |
| `survival_curve` | Kaplan–Meier 생존곡선 데이터입니다. 시간과 생존확률 좌표가 JSON으로 저장됩니다. |
| `created_at` | 분석 결과가 DB에 저장된 시각입니다. 자동 생성되며 시간대 정보도 포함합니다. |

`normalized_input`, `result_payload`, `survival_curve`는 상세 기록 및 결과 화면 재구성을 위한 JSON이고, 나머지 주요 열은 목록 조회나 통계 처리에 편리하도록 별도로 분리한 값입니다.

LUAD(폐선암) 환자의 유전자 변이 정보와 RNA-seq 발현량을 바탕으로 재발·생존 위험을 보조적으로 예측하는 웹 애플리케이션입니다.

> 이 프로젝트는 연구·교육용 프로토타입입니다. 결과는 임상 의사결정을 대체하지 않으며, 실제 사용 전에는 모델 제작자가 제공하는 검증 데이터로 수치적 동등성을 확인해야 합니다.

## 기능

- 생년월일, 성별, 암 병기 입력
- 돌연변이 유무 CSV와 RNA-seq 발현량 CSV 업로드
- Cox, Random Survival Forest, DeepSurv의 동일 가중치 앙상블
- 모델별 원점수/z-점수, 위험군, Kaplan–Meier 참조 곡선 표시
- 서버·DB 영구 저장, 로그인, 저장된 분석 결과 목록/검색 지원

## 구조

```text
frontend/  React + TypeScript + Vite 사용자 화면
backend/   FastAPI, 입력 검증, 특성 생성, 모델 추론
```

```text
브라우저
  → FastAPI /api/v1/inference/upload
  → 293개 특성 생성
  → Cox 선형 점수 + RSF + DeepSurv 앙상블
  → 분석 결과 JSON
```

## 사전 요구사항

- Node.js 20 이상
- Python 3.12 이상
- 모델 아티팩트 파일 5개
- RNA-seq 유전자 ID 매핑을 위한 인터넷 연결(MyGene)

## 모델 아티팩트 준비

모델 파일은 Git 저장소에 넣지 말고, 안전한 로컬 디렉터리에 보관하세요.

```text
model-artifacts/
├── deepsurv_model.pt
├── rsf.model.pkl
├── ensemble_stats.json
├── gene_coef.csv
└── km_data.csv
```

`rsf.model.pkl`은 pickle 기반 파일입니다. 신뢰할 수 있는 제작자로부터 받은 파일만 사용하세요.

### 백엔드의 모델 파일 사용 방식

백엔드는 사용자 브라우저에서 모델 파일을 받지 않습니다. `MODEL_ARTIFACT_DIR`로 지정한 서버의 로컬 디렉터리에서 모델 아티팩트를 읽어 추론에 사용합니다.

```text
사용자 CSV 업로드
  → FastAPI 백엔드
  → MODEL_ARTIFACT_DIR의 모델 아티팩트 사용
  → 분석 결과 JSON 반환
```

| 파일 | 역할 |
|---|---|
| `gene_coef.csv` | Cox 계수와 293개 특성 순서 |
| `ensemble_stats.json` | Cox, RSF, DeepSurv 점수의 z-score 기준값 |
| `km_data.csv` | 고위험/저위험군 기준과 Kaplan–Meier 참조 데이터 |
| `rsf.model.pkl` | Random Survival Forest 모델 |
| `deepsurv_model.pt` | DeepSurv 모델 가중치 |

RSF와 DeepSurv 모델은 백엔드 프로세스에서 처음 필요할 때 메모리에 로드하고 이후 요청에서는 재사용합니다.

## 실행

### 1. 백엔드

Linux/macOS:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
cp .env.example .env

# backend/model-artifacts에 모델 파일 5개를 넣었다면 기본값 그대로 사용합니다.
# 다른 위치에 두었다면 .env의 MODEL_ARTIFACT_DIR을 그 디렉터리 경로로 바꿉니다.
uvicorn app.main:app --reload
```

Windows PowerShell:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e '.[dev]'
copy .env.example .env

# backend\model-artifacts에 모델 파일 5개를 넣었다면 기본값 그대로 사용합니다.
# 다른 위치에 두었다면 .env의 MODEL_ARTIFACT_DIR을 그 디렉터리 경로로 바꿉니다.
uvicorn app.main:app --reload
```

백엔드는 기본적으로 `http://localhost:8000`에서 실행됩니다. 다음 주소로 확인할 수 있습니다.

```text
http://localhost:8000/api/v1/health
```

### 2. 프런트엔드

새 터미널에서 실행합니다.

```bash
cd frontend
npm install
cp .env.example .env  # Windows에서는 copy .env.example .env
npm run dev
```

기본 API 주소는 `http://localhost:8000`입니다. 다른 주소를 사용하면 `frontend/.env`를 수정하세요.

```text
VITE_API_BASE_URL=http://localhost:8000
```

브라우저에서 Vite가 출력한 주소(기본값: `http://localhost:5173`)를 엽니다.

## 입력 형식

### 임상 정보

- 생년월일: 연/월/일 선택. 백엔드가 한국식 나이(`현재 연도 - 출생연도 + 1`)를 계산합니다.
- 성별: 여성=`0`, 남성=`1`로 모델 특성에 변환됩니다.
- 암 병기: 1~4기

### 돌연변이 CSV

- 한 명의 환자만 포함해야 합니다.
- `Patient_ID` 열과 각 유전자의 `0`/`1` 값이 필요합니다.
- 모델 특성에 없는 유전자는 무시됩니다.
- 모델 입력에 없는 유전자는 `0`으로 채웁니다.

### RNA-seq CSV

- 한 명의 환자만 포함해야 하며 돌연변이 CSV의 `Patient_ID`와 일치해야 합니다.
- 첫 열은 환자 ID, 나머지 열은 유전자 발현량이어야 합니다.
- Stromal/Immune 점수는 ssGSEA rank 기반으로 계산됩니다.

## 검증

```bash
cd frontend
npm test -- --run
npm run typecheck
npm run lint
npm run build

cd ../backend
source .venv/bin/activate  # Windows는 .\.venv\Scripts\Activate.ps1
ruff check app tests
pytest -q
python -m compileall -q app
```
