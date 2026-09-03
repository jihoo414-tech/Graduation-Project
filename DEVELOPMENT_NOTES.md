# 개발 변경 사항 정리

## 개요

이 문서는 Windows PowerShell 개발 환경, Supabase 인증 설정, 백엔드 모델 파일 경로 설정 문제를 해결하면서 적용한 변경 사항을 정리한 문서입니다.

## 해결한 문제

### 1. Windows 가상환경 실행 오류

백엔드의 기존 `.venv` 가상환경이 이전 로컬 경로를 참조하고 있어, PowerShell에서 패키지를 설치할 때 launcher 오류가 발생했습니다.

예시:

```powershell
pip install -e '.[dev]'
```

적용한 변경:

- `backend/scripts/Repair-Venv.ps1` 스크립트를 추가했습니다.
- `README.md`의 Windows 백엔드 설치 명령을 수정했습니다.
- `pip`를 직접 실행하는 대신 `python -m pip` 형태를 사용하도록 바꿨습니다.

권장 복구 명령:

```powershell
cd "C:\Users\0610s\Documents\Codex\Graduation Project\Graduation-Project-main-revised\Graduation-Project-main\backend"
.\scripts\Repair-Venv.ps1
```

복구 후 백엔드 실행:

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

### 2. Supabase 브라우저 인증 설정

프론트엔드에서 Supabase 클라이언트를 만들 때 사용하는 환경 변수 설정을 정리했습니다.

적용한 변경:

- `frontend/.env`의 Supabase 연결 값을 수정했습니다.
- `frontend/.env.example`도 같은 방식으로 수정했습니다.
- `frontend/src/lib/supabase.ts`의 환경 변수 검증 로직을 보강했습니다.

프론트엔드 `.env` 값을 바꾼 뒤에는 Vite 개발 서버를 반드시 다시 시작해야 합니다.

### 3. 백엔드 모델 파일 경로 미설정 오류

분석 요청 시 다음 오류가 발생했습니다.

```text
MODEL_ARTIFACT_DIR_REQUIRED
Model artifact directory is not configured.
```

원인은 실제 백엔드 설정 파일인 `backend/.env`가 없고, 예시 파일인 `backend/.env.example`만 있었기 때문입니다.

적용한 변경:

- 로컬 실행용 `backend/.env`를 생성했습니다.
- `MODEL_ARTIFACT_DIR=model-artifacts`를 설정했습니다.
- `backend/app/services/model_artifacts.py`를 수정해 상대 경로가 항상 `backend` 폴더 기준으로 해석되도록 했습니다.

현재 로컬 백엔드 환경 변수 형식:

```env
SUPABASE_URL=<Supabase 프로젝트 URL>
SUPABASE_ANON_KEY=<Supabase 공개 인증 키>
MODEL_ARTIFACT_DIR=model-artifacts
```

필요한 모델 파일 위치:

```text
backend/model-artifacts/
```

필수 파일:

```text
deepsurv_model.pt
rsf.model.pkl
ensemble_stats.json
gene_coef.csv
km_data.csv
```

확인 당시 위 5개 파일은 모두 존재했습니다.

## 변경된 파일

Git에 포함되는 파일:

- `README.md`
- `backend/.env.example`
- `backend/app/services/model_artifacts.py`
- `backend/scripts/Repair-Venv.ps1`
- `frontend/.env.example`
- `frontend/src/lib/supabase.ts`

로컬 전용 파일:

- `backend/.env`

`backend/.env`는 `.gitignore`에 의해 Git에 올라가지 않습니다. 다른 개발자는 `backend/.env.example`을 참고해 각자 로컬에 `backend/.env`를 만들어야 합니다.

## 검증 내용

완료한 확인:

- 프론트엔드 타입 검사를 통과했습니다.
- 프론트엔드 테스트 4개가 모두 통과했습니다.
- `MODEL_ARTIFACT_DIR=model-artifacts`가 `backend/model-artifacts`로 정상 해석되는 것을 확인했습니다.
- 모델 파일 누락 검사 결과 누락 파일이 없었습니다.

기존 `.venv`가 깨져 있어 백엔드 테스트는 해당 가상환경으로 바로 실행하지 못했습니다. 먼저 가상환경을 복구한 뒤 아래 명령을 실행하면 됩니다.

```powershell
cd "C:\Users\0610s\Documents\Codex\Graduation Project\Graduation-Project-main-revised\Graduation-Project-main\backend"
.\scripts\Repair-Venv.ps1
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m ruff check app tests
```

## 개발자 실행 체크리스트

1. 백엔드 가상환경을 복구하거나 새로 생성합니다.
2. `backend/.env` 파일이 있는지 확인합니다.
3. `MODEL_ARTIFACT_DIR=model-artifacts`가 설정되어 있는지 확인합니다.
4. 백엔드 서버를 재시작합니다.
5. 프론트엔드 `.env`를 바꿨다면 Vite 서버도 재시작합니다.

백엔드 실행:

```powershell
cd "C:\Users\0610s\Documents\Codex\Graduation Project\Graduation-Project-main-revised\Graduation-Project-main\backend"
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

프론트엔드 실행:

```powershell
cd "C:\Users\0610s\Documents\Codex\Graduation Project\Graduation-Project-main-revised\Graduation-Project-main\frontend"
npm.cmd run dev
```
