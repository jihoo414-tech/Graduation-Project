# Graduation Project Prototype

Greenfield prototype for a LUAD recurrence / survival support workflow.

## What is implemented
- **Frontend**: React + TypeScript + Vite upload/result UI in `frontend/`
- **Backend**: FastAPI upload/validation/mock-inference API in `backend/`
- **Contract artifacts**: OpenAPI, JSON Schema, and sample files in `shared-docs/`

## Prototype scope
- one upload = one de-identified patient
- CSV or JSON upload
- required gene variant fields: `gene`, `variant_classification`
- optional clinical fields accepted on input and normalized to `normalized_input.clinical`
- synchronous mock inference via `result_version: v1`
- no auth, persistence, encryption, or audit logging in MVP

## Repository layout
- `frontend/` — upload page, error handling, result rendering, future artifact placeholders
- `backend/` — upload endpoint, parsing, validation, normalization, mock adapter, tests
- `shared-docs/` — `openapi.yaml`, JSON schemas, and sample CSV/JSON fixtures

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

## Contract files
- `shared-docs/openapi.yaml`
- `shared-docs/schemas/patient-input.schema.json`
- `shared-docs/schemas/result-envelope-v1.schema.json`
- `shared-docs/sample-data/patient-example.csv`
- `shared-docs/sample-data/patient-example.json`
