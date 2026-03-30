# Execution-Ready Spec v9 — Graduation Project Planning (DB-backed scope update)

## Metadata
- Profile: standard
- Original rounds completed: 10
- Context type: brownfield-followup
- Scope update date: 2026-03-30
- Basis: explicit user request to add DB-backed product capabilities
- Context snapshot: `.omx/context/graduation-project-planning-20260317T155438Z.md`

## Goal
모델 팀이 추후 추론 로직을 백엔드에 연결하기만 하면 동작하도록 하되, 이제는 그 위에 **로그인, 저장, 이력 조회, 기관/사용자 분리**가 가능한 DB-backed 서비스 껍데기까지 함께 완성한다.

## Constraints
- 실제 환자 데이터 입력을 지원한다.
- 직접 식별정보(`name`, `national_id`, `hospital_id`)는 계속 금지한다.
- 비식별 patient_id + 유전자 변이 정보 + 선택적 임상정보만 허용한다.
- 로그인/사용자 관리가 필요하다.
- 케이스와 결과는 세션을 넘어서 저장되어야 한다.
- 결과/리포트 이력 조회가 가능해야 한다.
- 기관/사용자 단위 데이터 분리가 필요하다.
- 업로드 1회는 환자 1명 처리로 고정한다.
- 유전자 변이 정보는 필수, 임상 정보는 옵션으로 한다.
- 유전자 변이 canonical schema는 `gene + variant_classification` 이다.
- 백엔드가 CSV/JSON 둘 다 직접 파싱/검증/정규화한다.
- 추론 요청은 우선 동기 즉시응답 방식으로 유지한다.
- Frontend는 React + TypeScript + Vite, Backend는 Python + FastAPI 로 한다.
- Database는 PostgreSQL, ORM은 SQLAlchemy, migration은 Alembic을 우선 추천한다.

## Non-goals
- 의료기관 배포 수준의 규제/컴플라이언스 완비
- EMR 연동
- 원본 업로드 바이너리 장기 저장
- 비동기 작업 큐/잡 관리
- 세부 survival 모델링 결정
- 데이터 분석 파이프라인 구현

## Canonical input contract
### Required top-level fields
- `deidentified_patient_id`
- `gene_variants`

### `gene_variants[]` item
- `gene`: string
- `variant_classification`: string

### Optional clinical fields
- `age`
- `pathologic_stage`
- `gender`

### Disallowed fields
- `name`
- `national_id`
- `hospital_id`

## Testable acceptance criteria
- 사용자는 로그인 후 자신이 속한 기관의 케이스만 볼 수 있다.
- 사용자는 저장된 케이스를 나중에 다시 열 수 있다.
- 사용자는 같은 케이스의 결과/리포트 이력을 조회할 수 있다.
- 사용자는 CSV 또는 JSON 파일로 환자 1명 데이터를 업로드할 수 있다.
- 업로드 데이터에는 직접 식별정보가 없어야 한다.
- 각 유전자 변이 항목은 최소 `gene` 과 `variant_classification` 을 포함해야 한다.
- 백엔드는 CSV/JSON 둘 다 받아 파싱, 검증, 정규화 후 내부 표준 JSON으로 변환한다.
- 백엔드는 동기 inference endpoint를 통해 결과를 즉시 반환한다.
- 성공 결과는 케이스와 연결된 persisted record로 저장된다.
- 모델이 없는 상태에서도 mock inference adapter로 end-to-end 데모가 가능하다.

## Confirmed decisions
1. 입력 방식: CSV 또는 JSON 파일 업로드
2. 업로드 단위: 단일 환자
3. 데이터 성격: 실제 환자 데이터 허용
4. 직접 식별정보: 금지
5. 허용 식별자: 비식별 patient_id
6. 로그인/사용자 관리: 필요
7. 케이스 저장 및 재접속 복원: 필요
8. 결과/리포트 이력 조회: 필요
9. 기관/사용자 데이터 분리: 필요
10. 파싱 책임: 백엔드
11. 요청 처리: 동기 즉시응답 유지
12. Frontend 스택: React + TypeScript + Vite
13. Backend 스택: Python + FastAPI
14. 권장 DB 스택: PostgreSQL + SQLAlchemy + Alembic
15. 시스템 방향: 모델 플러그인형 + DB-backed clinical workspace

## Provisional architecture direction
- Frontend: authenticated shell, dashboard, recent cases, saved drafts, result/report history UI
- Backend: auth/session, file ingestion, parsing, validation, normalization, case persistence, result persistence, access enforcement
- Model adapter boundary: 백엔드 내부 표준 JSON을 입력받아 추론 결과 JSON 반환
- Storage boundary: raw uploads are transient, normalized case/result/report records are durable

## Recommended next planning outputs
1. DB schema 초안
2. auth/session flow 결정
3. case/result/history API 명세 초안
4. migration plan
5. frontend information architecture update for login + saved-case workflow
