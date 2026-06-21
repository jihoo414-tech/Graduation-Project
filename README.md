# LUAD Survival Risk Analysis

LUAD(폐선암) 환자의 유전자 변이 정보와 RNA-seq 발현량을 바탕으로 재발·생존 위험을 보조적으로 예측하는 웹 애플리케이션입니다.

> 이 프로젝트는 연구·교육용 프로토타입입니다. 결과는 임상 의사결정을 대체하지 않으며, 실제 사용 전에는 모델 제작자가 제공하는 검증 데이터로 수치적 동등성을 확인해야 합니다.

## 기능

- 생년월일, 성별, 암 병기 입력
- 돌연변이 유무 CSV와 RNA-seq 발현량 CSV 업로드
- Cox, Random Survival Forest, DeepSurv의 동일 가중치 앙상블
- 모델별 raw score/z-score, 위험군, Kaplan–Meier 참조 곡선 표시
- 서버·DB 영구 저장, 로그인, mock 모델은 포함하지 않음

## 구조

```text
frontend/  React + TypeScript + Vite 사용자 화면
backend/   FastAPI, 입력 검증, feature 생성, 모델 inference
```

```text
Browser
  → FastAPI /api/v1/inference/upload
  → 293개 feature 생성
  → Cox + RSF + DeepSurv ensemble
  → 분석 결과 JSON
```

## 사전 요구사항

- Node.js 20 이상
- Python 3.12 이상
- 모델 artifact 파일 5개
- RNA-seq gene ID mapping을 위한 인터넷 연결(MyGene)

## 모델 artifact 준비

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

## 실행

### 1. 백엔드

Linux/macOS:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'

export MODEL_ARTIFACT_DIR="/absolute/path/to/model-artifacts"
uvicorn app.main:app --reload
```

Windows PowerShell:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e '.[dev]'

$env:MODEL_ARTIFACT_DIR = "C:\absolute\path\to\model-artifacts"
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
- 성별: 여성=`0`, 남성=`1`로 모델 feature에 변환됩니다.
- 암 병기: Stage 1~4

### 돌연변이 CSV

- 한 명의 환자만 포함해야 합니다.
- `Patient_ID` 열과 각 유전자의 `0`/`1` 값이 필요합니다.
- 모델 feature에 없는 유전자는 무시됩니다.
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
