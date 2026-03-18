# Execution-Ready Spec v8 — Graduation Project Planning

## Metadata
- Profile: standard
- Rounds completed: 10
- Context type: greenfield
- Final ambiguity: 0.030
- Threshold: 0.20
- Context snapshot: .omx/context/graduation-project-planning-20260317T155438Z.md

## Clarity breakdown
| Dimension | Score | Notes |
|---|---:|---|
| Goal Clarity | 0.94 | FE/BE shell should be complete before model integration |
| Constraint Clarity | 1.00 | MVP scope, data boundary, data contract, and stack choice are stable |
| Success Criteria Clarity | 0.98 | Request/response and implementation direction are execution-ready |

## Goal
모델 팀이 추후 추론 로직을 백엔드에 연결하기만 하면 동작하도록, 프론트엔드와 백엔드의 사용자 흐름, API 계약, 업로드 처리, 결과 표시 구조를 먼저 완성한다.

## Constraints
- 실제 환자 데이터 입력을 지원한다.
- 단, MVP에서는 이름, 주민번호, 병원번호 등 직접 식별정보는 받지 않는다.
- 비식별 patient_id + 유전자 변이 정보 + 선택적 임상정보만 허용한다.
- MVP는 프로토타입 범위로 제한한다.
- MVP 범위에서 로그인, 권한, 저장, 암호화, 감사기록은 제외한다.
- 업로드 1회는 환자 1명 처리로 고정한다.
- 유전자 변이 정보는 필수, 임상 정보는 옵션으로 한다.
- 유전자 변이 canonical schema는 `gene + variant_classification` 이다.
- 백엔드가 CSV/JSON 둘 다 직접 파싱/검증/정규화한다.
- 추론 요청은 동기 즉시응답 방식으로 한다.
- Frontend는 React + TypeScript + Vite, Backend는 Python + FastAPI 로 한다.
- 상세 모델 설계 및 데이터 분석 설계는 이번 단계의 핵심 범위가 아니다.

## Non-goals
- 의료기관 배포 수준의 보안 체계
- 장기 저장소/EMR 연동
- 세부 survival 모델링 결정
- 데이터 분석 파이프라인 구현
- 배치 업로드 처리
- 비동기 작업 큐/잡 관리
- variant_type까지 포함한 고정 포맷 강제

## Canonical input contract (MVP)
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
- 사용자는 CSV 또는 JSON 파일로 환자 1명 데이터를 업로드할 수 있다.
- 업로드 데이터에는 직접 식별정보가 없어야 한다.
- 업로드 데이터에서 유전자 변이 정보는 반드시 포함되어야 한다.
- 각 유전자 변이 항목은 최소 `gene` 과 `variant_classification` 을 포함해야 한다.
- 임상 정보는 포함되면 함께 검증/표시하되, 없어도 흐름이 동작해야 한다.
- 백엔드는 CSV/JSON 둘 다 받아 파싱, 검증, 정규화 후 내부 표준 JSON으로 변환한다.
- 백엔드는 동기 inference endpoint를 통해 결과를 즉시 반환한다.
- 프론트엔드는 업로드/로딩/결과 확인 흐름을 가진다.
- 모델이 없는 상태에서도 mock inference adapter로 end-to-end 데모가 가능하다.
- 추후 실제 모델 adapter를 같은 내부 JSON 계약 뒤에 꽂아 교체할 수 있다.

## Confirmed decisions
1. 입력 방식: CSV 또는 JSON 파일 업로드
2. 업로드 단위: 단일 환자
3. 데이터 성격: 실제 환자 데이터 허용
4. 직접 식별정보: 금지
5. 허용 식별자: 비식별 patient_id
6. MVP 범위: 인증/저장/암호화/감사 제외
7. 필수 입력: 유전자 변이
8. 선택 입력: 임상 정보
9. 유전자 변이 필수 필드: gene + variant_classification
10. 파싱 책임: 백엔드
11. 요청 처리: 동기 즉시응답
12. Frontend 스택: React + TypeScript + Vite
13. Backend 스택: Python + FastAPI
14. 시스템 방향: 모델 플러그인형 프로토타입

## Provisional architecture direction
- Frontend: 업로드, 로딩 상태, 검증 오류 표시, 결과 시각화에 집중
- Backend: 파일 수신, 파싱, 입력 검증, 정규화, 모델 adapter 호출, 결과 응답 담당
- Model adapter boundary: 백엔드 내부 표준 JSON을 입력받아 추론 결과 JSON 반환

## Recommended next planning outputs
1. 페이지 구조 정의
2. API 명세 초안
3. CSV/JSON 예시 파일 스키마
4. 결과 화면 우선순위 정의
5. 모델 adapter interface 정의
