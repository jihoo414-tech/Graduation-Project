# 현재 배포·실행 범위

## 이번 프로젝트의 실행 구조

현재 구현은 로컬 시연과 동기식 API 요청을 위한 stateless 구조다.

```text
[React/Vite Browser]
       │  mutation CSV + RNA-seq CSV + clinical form
       ▼
[FastAPI]
       │  293 feature 생성
       ▼
[Cox + RSF + DeepSurv ensemble]
       │
       ▼
[동일 HTTP 응답으로 결과 + KM reference curve]
```

## 의도적으로 제외한 범위

- 로그인/회원가입/권한
- DB와 서버 영구 저장
- 파일 binary 저장
- background worker, job queue, polling API
- 배포용 GPU worker 인프라

따라서 브라우저가 요청을 보내면 FastAPI가 현재 요청 안에서 결과를 만들고 바로 반환한다. 프런트엔드 `localStorage`는 데모 화면 상태를 보존할 뿐, 백엔드 영구 저장 기능이 아니다.

## 로컬 실행

```bash
cd backend
. .venv/bin/activate
export MODEL_ARTIFACT_DIR='/mnt/c/Users/sksms/Desktop/졸프 모델'
export INFERENCE_ADAPTER=real_ensemble
uvicorn app.main:app --reload
```

모델 파일 다섯 개는 `MODEL_ARTIFACT_DIR`에 있어야 하며, source repository나 웹 브라우저에 포함하지 않는다.

## 향후 확장 시점

실제 inference가 HTTP timeout을 넘거나 여러 사용자가 동시에 사용해야 할 때만, 별도 승인 범위로 로그인·DB·job queue·worker를 도입한다. 그때도 현재의 feature builder와 `real_ensemble` adapter는 worker 내부로 옮겨 재사용할 수 있다.
