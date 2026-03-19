# Execution-Ready Spec — Codebase Gap Review

## Metadata
- Profile: standard
- Rounds: 3
- Final ambiguity: 0.110
- Threshold: 0.200
- Context type: brownfield
- Context snapshot: .omx/context/codebase-gap-review-20260319T154839Z.md
- Interview transcript: .omx/interviews/codebase-gap-review-20260319T155606Z.md

## Clarity breakdown
| Dimension | Score | Notes |
|---|---:|---|
| Goal Clarity | 0.90 | Identify functional and UX gaps from the current codebase |
| Constraint Clarity | 0.90 | Prioritize graduation-demo completeness and frontend polish over platform depth |
| Success Criteria Clarity | 0.87 | Output should emphasize seamless service flow from landing through product use |
| Context Clarity | 0.95 | Existing frontend/backend contract and placeholder boundaries are understood |

## Goal
현재 코드베이스를 검토해, 졸업작품 발표에서 **랜딩부터 제품 내부까지 하나의 완성된 서비스처럼 보이도록** 만들기 위해 부족한 기능, 보완 포인트, UX 흐름의 끊김, 제품다움을 해치는 요소를 우선순위화한다.

## Constraints
- 우선순위는 기술적 확장성보다 **시연 흐름의 자연스러움**과 **프론트엔드 제품 디테일**이다.
- 현재 brownfield 구조를 기반으로 평가한다.
- 실제 운영 수준의 auth/persistence/model integration이 없어도, 발표 관점에서 자연스러워 보이는 보완을 찾는다.
- 분석 결과는 frontend-first 관점이되 backend gaps가 demo 흐름을 해치면 포함한다.

## Non-goals
- 실제 의료 서비스 배포 수준의 보안/인프라 재설계
- 실모델 연구/추론 성능 개선
- 장기 제품 로드맵 전체 설계
- 즉시 코드 구현

## Testable acceptance criteria
- 분석 결과가 현재 앱의 **핵심 데모 서사**를 명시한다.
- 기능적 공백을 단순 나열하지 않고 **발표 시 체감되는 우선순위**로 구분한다.
- 최소한 다음 관점을 포함한다: 랜딩-제품 연결성, 대시보드/케이스 시작 흐름, 업로드-결과 전환, 결과 이후 액션(설명/리포트), 제품다운 디테일.
- 프론트엔드에서 “placeholder처럼 보이는 지점”과 “실제 서비스처럼 보이게 만들 기회”를 구분한다.
- 필요한 경우 backend/contract gaps도 demo 관점에서 함께 표시한다.

## Assumptions exposed + resolutions
- 사용자 의도는 단순 기능 확장보다 **발표 완성도 강화**에 있다. → confirmed.
- 평가 기준은 일반적인 코드 품질보다 **frontend 제품 경험**에 있다. → confirmed.
- 가장 중요한 시연 장면은 개별 페이지보다 **랜딩부터 내부 제품까지 이어지는 서비스 연속성**이다. → confirmed.

## Technical context findings
- `frontend/src/App.tsx`에 다수의 라우팅/상태/다운로드/화면 연결 책임이 집중되어 있다.
- `frontend/src/components/product/*`와 `workspace/*`는 시연 가능한 화면을 폭넓게 제공하지만, 일부는 실제 상태/데이터 연결보다 정적 데모에 가깝다.
- `backend/app/services/inference.py`는 업로드 파싱/검증과 mock inference를 제공해 데모의 기능적 backbone 역할은 이미 수행한다.
- `shared-docs/openapi.yaml` 및 JSON schema는 계약 일관성을 뒷받침한다.

## Recommended next output
이 spec을 기준으로 **발표/demo 완성도 중심의 gap analysis + 우선순위 제안**을 작성한다. 특히:
1. 랜딩에서 제품 내부로 넘어갈 때의 서사적 단절
2. 대시보드/케이스/업로드 흐름의 현실감 부족
3. 결과/설명/리포트 액션의 제품다움 부족
4. 프론트엔드 상태관리/피드백/마이크로카피/빈 상태/전환 디테일 보완 포인트
5. 시연 품질을 해치는 placeholder 기능 표면

## Condensed transcript
## Round 1 — Constraint Clarity
**Q:** 기능 보완 포인트를 어떤 기준으로 우선순위화할까요: 현재 MVP 범위 내 현실적 보완, 졸업작품 발표/demo 완성도 강화, 아니면 이후 제품화/모델연동 확장성까지 포함한 제안 중 어디에 무게를 둘까요?
**A:** 완성도 강화로 가자 그리고 프론트엔드적으로도 생각해보고싶어
**Ambiguity after round:** 0.246

## Round 2 — Success Criteria Clarity
**Q:** 프론트엔드 완성도를 높인다고 할 때, 당신이 가장 보고 싶은 결과는 무엇인가요? 예를 들면 발표에서 바로 시연 가능한 자연스러운 사용자 흐름, 더 제품답게 보이는 UI/UX 디테일, 실제 기능처럼 느껴지는 상호작용/상태관리, 혹은 의료진 관점에서 설득력 있는 정보구조 중 무엇을 가장 우선으로 보나요?
**A:** 발표에서 시연 가능한 자연스러운 사용자 흐름, 그리고 더 제품답게 보이는 디테일에 무게를 두고싶어
**Ambiguity after round:** 0.206

## Round 3 — Success Criteria Clarity
**Q:** 그렇다면 발표에서 보여줄 핵심 시연 서사는 무엇으로 잡을까요? 예를 들어 “의사가 새 케이스를 만들고 업로드해 결과를 해석하는 흐름”, “결과를 환자 설명 화면과 리포트까지 이어가는 흐름”, 혹은 “랜딩부터 제품 내부까지 하나의 완성된 서비스처럼 보이는 흐름” 중 어떤 장면이 가장 중요하다고 보나요?
**A:** 랜딩부터 제품 내부까지 하나의 완성된 서비스처럼 보이는 흐름에 무게를 두고싶어
**Ambiguity after round:** 0.110

