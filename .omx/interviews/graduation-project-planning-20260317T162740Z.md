# Deep Interview Transcript Summary — graduation-project-planning

- Timestamp: 20260317T162740Z
- Profile: standard
- Context type: greenfield
- Final ambiguity at this checkpoint: 0.187
- Threshold: 0.20

## Condensed transcript
1. **Q:** MVP 대표 시나리오는?
   **A:** 실제 운영 사용자는 의사에 가깝지만 시연 사용자는 학생. 데이터는 mock 또는 실제 환자 데이터를 넣을 수 있고, 결과 화면 구성은 제안이 필요.

2. **Q:** 실제 환자 데이터를 MVP에 포함할까?
   **A:** 포함한다. 다만 MVP에서는 로그인/권한/저장/암호화/감사기록은 제외한다. 목표는 모델을 나중에 백엔드에 넣기만 하면 되도록 프론트와 백엔드를 완성해 두는 것.

3. **Q:** 첫 입력 방식은 무엇으로 할까?
   **A:** CSV 또는 JSON 파일 업로드.

## Checkpoint conclusions
- 서비스는 **모델 플러그인형 프로토타입**으로 설계한다.
- MVP는 **실제 환자 데이터 입력 가능**을 전제로 하나, 보안/권한/저장 기능은 제외한 시연/프로토타입 범위다.
- 프론트엔드는 **파일 업로드 중심 UX**를 가져야 하며, 백엔드는 **검증-정규화-추론-응답** 파이프라인 계약을 먼저 고정해야 한다.

4. **Q:** 업로드 단위는 단일 환자 vs 배치 중 무엇인가?
   **A:** 업로드 1회 = 환자 1명 처리로 간다.

5. **Q:** 필수 입력 범위는 무엇인가?
   **A:** 유전자 변이만 필수이고, 임상 정보는 옵션으로 한다.

6. **Q:** CSV/JSON 처리 책임은 어디에 둘 것인가?
   **A:** 백엔드가 CSV/JSON 둘 다 직접 파싱한다.

7. **Q:** 요청-응답 방식은 동기 vs 비동기 중 무엇인가?
   **A:** 동기 즉시응답으로 간다.

8. **Q:** 기술스택은 무엇으로 확정할 것인가?
   **A:** Frontend는 React + TypeScript + Vite, Backend는 Python + FastAPI 로 확정한다.

9. **Q:** 실제 환자 데이터 범위는 어디까지 허용할 것인가?
   **A:** 직접 식별정보는 받지 않고, 비식별 patient_id + 유전자 변이 + 선택적 임상정보만 허용한다.

10. **Q:** 유전자 변이 canonical schema는 어디까지로 할 것인가?
   **A:** `gene + variant_classification` 으로 한다.

## Final crystallization
- Final ambiguity: 0.030
- Interview threshold satisfied and execution-ready spec finalized.
