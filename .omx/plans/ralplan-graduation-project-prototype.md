# RALPLAN Consensus Draft — Graduation Project Prototype

## Grounding
- Repository is greenfield: `README.md:1` = `test`; `test on colab.txt:1` = `test on colab`.
- Execution-ready scope is grounded in `.omx/specs/deep-interview-graduation-project-planning.md`.
- Additional project context is grounded in `.omx/context/graduation-project-planning-20260317T155438Z.md`.
- This draft is planning-only for the explicitly invoked `$ralplan` path.

## Scope Snapshot
Build an execution-ready greenfield prototype with a React + TypeScript + Vite frontend and a Python + FastAPI backend where one deidentified patient CSV/JSON upload is parsed, validated, normalized, inferred synchronously through a mock-first adapter, and returned in a future-stable result envelope.

## RALPLAN-DR Summary
### Principles
1. **Prototype-first, not clinical-grade**: optimize for end-to-end demoability, not production hardening.
2. **Strict data minimization + ephemeral handling**: accept only deidentified `patient_id`, required gene variants, optional clinical fields; do not persist raw uploads; do not echo payloads in logs/errors.
3. **Backend owns normalization**: CSV/JSON parsing, validation, and canonicalization happen server-side.
4. **Versioned adapter contract**: mock and real adapters must emit the same envelope shape so richer outputs can evolve without FE/API churn.
5. **Executable contract verification**: schema/OpenAPI and fixture checks are part of the plan, not just manual review.

### Top Decision Drivers
1. Fastest path to a working greenfield prototype without blocking on model-team completion.
2. Stable integration boundary for future richer model outputs.
3. Safe MVP handling of real patient uploads within explicit no-persistence constraints.

### Viable Options
#### Option A — Recommended: synchronous FE/BE prototype with backend normalization + versioned result envelope
- **Pros**: simplest architecture; easiest E2E demo; stable model-plug point; supports richer outputs later.
- **Cons**: limited throughput; no persistence/history; request latency bounds response complexity.

#### Option B — Deferred: introduce persistence/job abstraction now
- **Pros**: cleaner future async scaling; easier history/audit later.
- **Cons**: premature state/queue/storage complexity; slower prototype delivery; weak fit for explicit MVP constraints.

### Invalidation Rationale
Option B is weaker because the grounded spec fixes MVP to synchronous immediate response, excludes storage/auth/audit scope, and prioritizes a FE/BE shell that the model team can plug into later.

## ADR
### Decision
Adopt a ratified monorepo workspace with `/frontend` and `/backend` apps, server-side CSV/JSON ingestion into one canonical patient payload, and a versioned synchronous model-adapter result envelope starting with a mock adapter.

### Drivers
- Spec requires CSV/JSON upload, one patient per upload, backend parsing/normalization, synchronous inference, and mock-first adapter support.
- Repo is greenfield, so low-complexity scaffolding plus stable boundaries matter more than migration compatibility.
- Real patient uploads require explicit ephemeral processing constraints even in MVP.

### Alternatives Considered
1. **Frontend pre-parses files and sends normalized JSON only** — rejected because backend-owned parsing/validation is a confirmed spec decision.
2. **Async job-based inference API from day one** — rejected because it adds state management not required by the MVP.
3. **Leave workspace topology open** — rejected because greenfield execution benefits from locking FE/BE layout now.

### Why Chosen
This is the smallest plan that keeps the prototype demoable, protects the future FE/API surface, operationalizes data minimization, and enables parallel FE/BE execution with low ambiguity.

### Consequences
- Positive: clean FE/BE split, stable adapter boundary, clearer parallelization path, safer upload handling.
- Negative: no built-in history/persistence; some duplicated TS/Python schema typing may remain until justified.

### Follow-ups
- Define OpenAPI + JSON-schema-level contract artifacts first.
- Keep adapter outputs inside the same envelope even as payload richness expands.
- Revisit persistence/auth/async only after prototype verification.

## Ratified Workspace Topology
Use a single repository with fixed top-level app directories:
- `frontend/` — React + TypeScript + Vite app
- `backend/` — FastAPI app
- `shared-docs/` — contract docs and sample fixtures

This topology is locked for the prototype plan and should not be reopened during execution unless a later consensus revision explicitly changes it.

## Recommended Product Slice
### Page Map
1. **Upload Page (`/`)**: file picker/drop zone, accepted-format helper text, sample contract preview, inline validation summary, submit.
2. **Processing State**: upload → validate → normalize → infer progress.
3. **Result Page (`/result` or conditional view)**: deidentified patient summary, normalized variant table, optional clinical section, result cards/plots area, adapter provenance, retryable error state.

### API Surface
#### `POST /api/v1/inference/upload`
- **Content-Type**: `multipart/form-data`
- **Field**: `file`
- **Behavior**: receive one-patient CSV/JSON, parse, validate, normalize, synchronously infer, return canonical normalized input + versioned result envelope.

#### `GET /api/v1/contracts/patient-example`
- Returns canonical JSON example, CSV header/example guidance, and envelope example for FE help text/docs.

#### `GET /api/v1/health`
- Returns service health and active adapter name.

### Canonical Internal Patient Payload
```json
{
  "deidentified_patient_id": "P-001",
  "gene_variants": [
    { "gene": "TP53", "variant_classification": "Missense_Mutation" },
    { "gene": "EGFR", "variant_classification": "L858R" }
  ],
  "clinical": {
    "age": 67,
    "pathologic_stage": "IIA",
    "gender": "female"
  }
}
```

### Versioned Result Envelope
```json
{
  "result_version": "v1",
  "patient": { "deidentified_patient_id": "P-001" },
  "normalized_input": { "...": "canonical patient payload" },
  "result": {
    "adapter": "mock",
    "summary": {
      "risk_level": "intermediate",
      "risk_score": 0.62,
      "text": "Prototype mock inference result"
    },
    "artifacts": {
      "survival_curve": null,
      "explanations": []
    }
  },
  "warnings": []
}
```
Rule: future real adapters may add richer `result.artifacts` content, but must preserve the envelope keys and versioning strategy to avoid FE/API churn.

### Canonical CSV Example
```csv
deidentified_patient_id,gene,variant_classification,age,pathologic_stage,gender
P-001,TP53,Missense_Mutation,67,IIA,female
P-001,EGFR,L858R,67,IIA,female
```
Rules:
- one upload = one patient, so all rows must share `deidentified_patient_id`
- `gene` and `variant_classification` are required per row
- clinical fields may be blank or omitted from JSON
- reject direct identifiers such as `name`, `national_id`, `hospital_id`

### Canonical JSON Example
```json
{
  "deidentified_patient_id": "P-001",
  "gene_variants": [
    { "gene": "TP53", "variant_classification": "Missense_Mutation" },
    { "gene": "EGFR", "variant_classification": "L858R" }
  ],
  "age": 67,
  "pathologic_stage": "IIA",
  "gender": "female"
}
```

## Data-Handling Constraints
- uploads are processed ephemerally in request scope only
- raw uploaded files are not persisted in MVP
- normalized payloads are not stored beyond the immediate response path
- logs, trace output, and error payloads must not echo uploaded row contents or sensitive clinical values
- validation errors should identify field names/rules, not reprint source payloads

## Backend Boundaries
### Normalization Boundary
`csv_parser/json_parser -> validator -> normalizer -> canonical patient payload`

Responsibilities:
- reject disallowed fields
- enforce single-patient upload
- require `deidentified_patient_id`
- require non-empty `gene_variants[]`
- require each variant to contain `gene` + `variant_classification`
- lift optional clinical fields into stable `clinical`

### Model-Adapter Boundary
`canonical patient payload -> ModelAdapter.infer(payload) -> versioned result envelope payload`

Recommended interface:
- `MockModelAdapter`: deterministic placeholder summary + empty artifacts
- `RealModelAdapter`: later implementation behind same envelope/version contract

Constraint: adapters never consume file-format details; they consume canonical normalized JSON only.

## Folder Structure Recommendation
```text
frontend/
  src/
    pages/
      UploadPage.tsx
      ResultPage.tsx
    components/
      FileUpload.tsx
      ValidationSummary.tsx
      ResultCards.tsx
      VariantTable.tsx
    lib/
      api.ts
      types.ts
backend/
  app/
    main.py
    api/routes/
      inference.py
      contracts.py
      health.py
    schemas/
      patient.py
      result_envelope.py
    services/
      parsers/
        csv_parser.py
        json_parser.py
      validation/
        patient_validator.py
      normalization/
        patient_normalizer.py
      adapters/
        base.py
        mock_adapter.py
        real_adapter.py
    tests/
      fixtures/
shared-docs/
  api-contract.md
  sample-data/
    patient-example.json
    patient-example.csv
```

## Actionable Phases
### Phase 1 — Contract lock
**Deliverables**
- ratified workspace topology
- OpenAPI/JSON-schema draft for patient input + result envelope
- canonical CSV/JSON fixtures
- page map and result region priorities

**Acceptance criteria**
- contract reflects spec-required fields, no-persistence rules, and versioned envelope
- sample inputs show one-patient upload and required gene fields
- FE/BE teams share one canonical payload and one result envelope

**Verification**
- generate OpenAPI draft for review
- fixture-based checks for valid CSV/JSON and invalid identifier/field cases

### Phase 2 — Backend ingestion plan
**Deliverables**
- FastAPI route plan for upload/contracts/health
- parser/validator/normalizer split
- adapter interface + logging/redaction rules

**Acceptance criteria**
- upload route accepts CSV and JSON through one bounded path
- downstream layers are format-agnostic
- adapter returns envelope-compatible output only

**Verification**
- schema-level request/response checks
- fixture walkthrough against parser/validator rules

### Phase 3 — Frontend flow plan
**Deliverables**
- upload/loading/error/result state map
- FE types aligned to versioned envelope
- result area plan that tolerates richer future artifacts

**Acceptance criteria**
- FE covers upload → loading → result/error without auth/persistence assumptions
- FE renders summary now and has reserved slots for future artifacts like survival curves
- backend validation errors map to safe user-facing messages

**Verification**
- typed contract alignment against OpenAPI/schema artifacts
- fixture-based mock response rendering checks

### Phase 4 — Integration + demo readiness
**Deliverables**
- mock-adapter E2E demo scenario
- contract-test matrix for valid/invalid uploads
- real-adapter swap checklist

**Acceptance criteria**
- demo path works for both CSV and JSON fixtures
- invalid cases cover missing patient_id, multiple patient_ids, missing gene, missing variant_classification, disallowed identifier fields
- real adapter swap preserves route + envelope contract

**Verification**
- executable fixture-driven contract checks
- OpenAPI/schema conformance check for request + response
- final walkthrough for success/failure UX

## Suggested Verification Matrix
- valid CSV fixture
- valid JSON fixture
- invalid direct identifier field
- invalid missing `gene_variants`
- invalid missing `gene`
- invalid missing `variant_classification`
- invalid multi-patient CSV
- valid clinical omitted
- mock response conforms to `result_version: v1` envelope

## Available Agent Types + Staffing Guidance
### Available agent types
- `planner`
- `architect`
- `critic`
- `executor`
- `debugger`
- `test-engineer`
- `verifier`
- `explore`

### Future `ralph` lane
- **Best for**: first end-to-end implementation pass after contract lock.
- **Suggested staffing**: `executor` primary; `architect` for contract boundary spot-check; `verifier` for contract evidence.
- **Reasoning level**: medium-high for backend contract/validation, medium for FE scaffolding.
- **Sequence**: contract artifacts → backend ingestion → frontend flow → verification.

### Future `team` lane
- **Best for**: parallel FE/BE execution after Phase 1 contract lock.
- **Suggested staffing**:
  - Lane 1: `executor` for backend parsers/validation/adapters
  - Lane 2: `executor` for frontend pages/components/types
  - Lane 3: `test-engineer` or `verifier` for fixtures/OpenAPI/contract checks
  - Optional `architect` reviewer for cross-lane drift
- **Reasoning level**: medium for FE, medium-high for BE, medium for verification.

### Launch hints
- `$team "Implement approved graduation-project prototype plan: backend lane, frontend lane, contract verification lane"`
- `omx team start --name grad-prototype --task "approved prototype plan with contract lock"`

### Concrete team -> ralph verification path
1. Use **team** to parallelize backend, frontend, and contract-check fixture work after Phase 1 lock.
2. Merge only on the canonical payload + `result_version` envelope.
3. Hand off to **ralph** for sequential integration fixes, acceptance verification, and final demo polish.
4. Finish with verifier evidence for CSV success, JSON success, invalid cases, and envelope conformance.

## Open Questions / Deferred Decisions
- exact non-mock artifact contents inside `result.artifacts` remain model-team dependent, but the `v1` envelope is now fixed
- whether survival-curve rendering ships in the first visible FE increment or is shown as reserved placeholder space remains a small presentation choice
