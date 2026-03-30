# Execution-Ready Spec — Codebase Gap Review (DB-backed follow-up)

## Metadata
- Profile: standard
- Context type: brownfield
- Scope update date: 2026-03-30
- Context snapshot: `.omx/context/codebase-gap-review-20260319T154839Z.md`

## Goal
현재 코드베이스를 검토해, 졸업작품 발표에서 **랜딩부터 로그인 후 제품 내부까지 하나의 완성된 서비스처럼 보이도록** 만들기 위해 부족한 기능과 구조적 공백을 우선순위화한다. 최신 범위에는 auth, saved cases, result history, organization separation도 포함된다.

## Constraints
- 우선순위는 기술적 완벽성보다 **시연 흐름의 자연스러움 + 실제 저장/복원 가능성**이다.
- 현재 brownfield 구조를 기반으로 평가한다.
- backend/DB/auth 확장은 이제 실제 요구사항에 포함되므로 더 이상 “후순위 가정”으로만 두지 않는다.
- 분석 결과는 frontend-first 관점을 유지하되, DB/auth gaps가 demo 흐름을 깨면 높은 우선순위로 취급한다.

## Non-goals
- EMR 연동
- compliance-grade security/audit 재설계
- 실모델 연구/추론 성능 개선
- 장기 제품 로드맵 전체 설계

## Testable acceptance criteria
- gap analysis가 auth, saved-case continuity, history, org separation 공백을 명시한다.
- 발표 시연 서사와 구현 우선순위를 연결해서 설명한다.
- frontend placeholder 문제와 backend persistence 문제를 분리하지 않고 하나의 사용자 여정 기준으로 정리한다.
- 필요한 경우 문서/계획 불일치도 함께 지적한다.

## Technical context findings
- `frontend/src/App.tsx`는 현재 라우팅/상태/다운로드 책임이 집중되어 있으며, saved-case persistence가 없다.
- `frontend/src/components/product/*`와 `workspace/*`는 화면은 풍부하지만 실제 auth/history 기반 제품 상태와는 아직 연결되지 않았다.
- `backend/app/services/inference.py`는 upload parsing/validation backbone으로 재사용 가치가 높다.
- 현재 가장 큰 구조 공백은 DB model, auth/session, case/result/history API, org-scoped access control이다.

## Recommended next output
이 spec을 기준으로 다음을 우선순위화한다.
1. 로그인/세션 모델
2. organization-user-case-result 관계 모델
3. 저장된 케이스 재개 흐름
4. 결과/리포트 이력 조회 흐름
5. 기존 demo continuity UI를 DB-backed reality와 맞추는 작업
