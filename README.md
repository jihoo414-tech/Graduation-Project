# Graduation Project Prototype

LUAD recurrence / survival support workflow prototype.

## Current repository status
- **Frontend**: React + TypeScript + Vite product shell / upload / result demo in `frontend/`
- **Backend**: FastAPI upload/validation/mock-inference API in `backend/`
- **Contract artifacts**: OpenAPI, JSON Schema, and sample files in `shared-docs/`
- **Important note**: the current codebase is still mostly stateless. The documents in this repository now define the **next implementation phase** as a DB-backed version with login, saved cases, and history.

## Target scope (DB-backed version)
- clinician login and user management
- organization-scoped data separation
- saved case drafts and reopen-after-login flow
- result / report history per case
- one upload = one de-identified patient
- CSV or JSON upload
- required gene variant fields: `gene`, `variant_classification`
- optional clinical fields accepted on input and normalized to `normalized_input.clinical`
- synchronous mock inference via `result_version: v1`
- raw upload binaries remain ephemeral; structured case/result records persist in the database

## Recommended data/backend stack
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Migrations**: Alembic
- **Auth**: authenticated user/session layer for organization-scoped access
- **Persistence model**: organizations → users → cases → inference results / report snapshots

## Primary planning docs
- `.omx/plans/prd-graduation-project-prototype.md`
- `.omx/plans/test-spec-graduation-project-prototype.md`
- `shared-docs/references/database-architecture-plan.md`
- `shared-docs/openapi.yaml` *(current upload contract; DB-backed endpoint expansion will follow implementation)*

## Repository layout
- `frontend/` — dashboard, case flow, upload/result UI, future authenticated workspace
- `backend/` — upload endpoint, parsing, validation, normalization, mock adapter, tests
- `shared-docs/` — OpenAPI, JSON schemas, sample fixtures, and architecture references

## Local development
### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Backend
```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload
```

> These commands still reflect the **currently implemented** stateless prototype. DB wiring and auth setup will be added in the next implementation phase.

## Verification commands
### Frontend
```bash
cd frontend
npm run lint
npm run typecheck
npm test
npm run build
```

### Backend
```bash
cd backend
. .venv/bin/activate
ruff check .
pytest
python3 -m compileall app tests
```

## Current contract files
- `shared-docs/openapi.yaml`
- `shared-docs/schemas/patient-input.schema.json`
- `shared-docs/schemas/result-envelope-v1.schema.json`
- `shared-docs/sample-data/patient-example.csv`
- `shared-docs/sample-data/patient-example.json`

## Planned architecture reference
- `shared-docs/references/database-architecture-plan.md`
