# Context Snapshot — graduation-project-planning

- Timestamp: 2026-03-17T15:54:38Z
- Source PDF: /mnt/c/Users/sksms/Documents/카카오톡 받은 파일/졸업 프로젝트 계획서 2.pdf
- Interview profile: standard
- Context type: greenfield

## Task statement
Read the graduation project proposal PDF and run a deep interview to clarify an execution-ready frontend/backend planning scope. The user explicitly wants model design and data analysis to be attached later, not decided now.

## Desired outcome
Produce a clear service-planning specification for a graduation-project prototype that separates frontend and backend responsibilities and can later integrate the AI model/data-analysis pipeline.

## Known facts / evidence
- Project topic is a decision-support system for LUAD recurrence/survival risk prediction.
- Planned model/data side in the document uses TCGA-LUAD, mutation features, clinical variables, Cox/RSF, KM curves, SHAP.
- Team roles listed in the PDF include planning, AI model design, data analysis, backend, and frontend.
- Service/prototype expectation in the PDF: user can input genomic values and see risk output and survival curves.
- There is concern in the PDF about prototype-vs-clinical-grade scope, security, and compute environment.
- The repository currently has no frontend/backend application code; only placeholder files exist.

## Constraints
- Current interview focus excludes detailed model design and detailed data-analysis design.
- Need enough planning depth to define frontend/backend work before implementation.
- One-question-per-round deep interview.

## Unknowns / open questions
- Exact MVP user persona and demo workflow
- Input method for prototype (manual entry, file upload, sample patient selection, mocked results)
- Whether authentication/admin roles are required
- Whether results are ephemeral or persisted
- Required pages/screens and API boundaries
- Non-functional requirements for demo/deployment/security
- Scope boundary between current service shell and later model integration

## Likely touchpoints
- Future frontend app (dashboard/input/results)
- Future backend API service
- Future model-serving adapter layer
- Storage for users/jobs/results/sample datasets
- Deployment and demo environment
