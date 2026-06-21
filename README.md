# Graduation Project Prototype

LUAD(폐선암) 환자의 재발·생존 위험을 보조적으로 예측하는 React + FastAPI 프로토타입입니다.

## 현재 구현 범위

- 돌연변이 유무 CSV와 RNA-seq 발현 CSV 한 쌍 업로드
- 나이, 성별(여성 `0` / 남성 `1`), 병기(`1`~`4`) 입력
- Cox + RSF + DeepSurv의 동기식 동일 가중치 앙상블
- `km_data.csv`로 만든 위험군별 Kaplan–Meier 기준 곡선
- `mock`과 `real_ensemble` adapter 전환
- 로그인, DB, 서버 영구 저장, background worker/job polling은 **제외**

프런트의 `localStorage`는 데모 화면 상태를 유지하는 용도이며, 서버에 환자 파일이나 결과를 저장하지 않습니다.

## 저장소 구조

- `frontend/` — React/Vite 사용자 흐름과 두 파일 업로드 UI
- `backend/` — FastAPI API, 입력 검증, feature builder, ensemble runtime
- `shared-docs/` — 기존 API 계약, 샘플, 외부 모델 연동 기획서
- `shared-docs/references/external-model-integration-plan.md` — 모델 파일 역할, 전체 처리 흐름, 제약과 위험

## 실제 모델 실행

외부 모델 파일을 저장소에 복사하지 않고, 디렉터리만 환경변수로 지정합니다.

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -e '.[dev]'

export MODEL_ARTIFACT_DIR='/mnt/c/Users/sksms/Desktop/졸프 모델'
export INFERENCE_ADAPTER=real_ensemble
uvicorn app.main:app --reload
```

필수 artifact:

```text
deepsurv_model.pt
rsf.model.pkl
ensemble_stats.json
gene_coef.csv
km_data.csv
```

모델 파일이 없는 UI·계약 개발에는 기본값인 `INFERENCE_ADAPTER=mock`을 사용합니다.

## 입력 처리 흐름

```text
Mutation CSV + RNA-seq CSV + age/gender/stage
  → 293개 feature vector 생성
  → Cox / RSF / DeepSurv 점수 계산
  → ensemble_stats.json z-score 정규화
  → 3개 z-score 단순 평균
  → km_data.csv 위험군 기준 Kaplan–Meier 곡선과 함께 응답
```

돌연변이 CSV에서 학습 feature 다섯 개가 빠진 경우(`ADAM21P1`, `BAGE2`, `MALAT1`, `RP11-193H5.1`, `SSPO`)는 합의된 규칙대로 `0`으로 채웁니다.

> **검증 주의:** DeepSurv의 checkpoint 구조와 Stromal/Immune score 스케일은 제공된 artifact와 노트북을 바탕으로 실행 가능하게 재구성했습니다. 실제 학습 파이프라인과의 수치적 동등성은 제작자가 제공하는 golden input/output으로 최종 검증해야 하며, 임상 의사결정에 단독으로 사용하면 안 됩니다.

## 프런트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

## 검증

```bash
cd frontend
npm run lint && npm run typecheck && npm test -- --run && npm run build

cd ../backend
. .venv/bin/activate
ruff check app tests
python -m compileall -q app
pytest -q
```
