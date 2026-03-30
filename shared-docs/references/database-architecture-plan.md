# Database Architecture Plan

## Purpose
Define the recommended database-backed architecture for the next implementation phase of the Graduation Project. This document updates the project direction from a stateless prototype to a product shell that supports login, saved cases, result/report history, and organization-aware access boundaries.

## Recommended Stack
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Migrations**: Alembic
- **Backend framework**: FastAPI
- **Auth**: authenticated session layer (recommended: access token + refresh token, or equivalent secure session approach)

## Design Principles
1. Keep the current upload/inference contract stable where possible.
2. Persist structured domain data, not raw upload binaries.
3. Enforce organization-scoped access on the server side.
4. Treat upload parsing/validation/normalization as a reusable backend boundary.
5. Store enough result/report history to reopen prior clinical narratives later.

## Core Entity Model

### `organizations`
Represents hospitals, demo institutions, or deployment tenants.

Suggested fields:
- `id`
- `name`
- `slug`
- `created_at`
- `updated_at`

### `users`
Authenticated clinicians or admins.

Suggested fields:
- `id`
- `organization_id` -> `organizations.id`
- `email`
- `password_hash`
- `display_name`
- `role` *(example: `clinician`, `admin`)*
- `is_active`
- `created_at`
- `updated_at`

### `cases`
Persisted clinical workspace unit.

Suggested fields:
- `id`
- `organization_id` -> `organizations.id`
- `owner_user_id` -> `users.id`
- `case_code` *(human-readable case identifier like `LUAD-2026-001`)*
- `cancer_type`
- `status`
- `draft_payload` *(case-builder metadata; JSON)*
- `latest_result_id` *(nullable FK to most recent result)*
- `created_at`
- `updated_at`

### `inference_results`
Immutable or append-mostly result history per case.

Suggested fields:
- `id`
- `case_id` -> `cases.id`
- `created_by_user_id` -> `users.id`
- `source_filename`
- `normalized_input` *(JSON)*
- `result_envelope` *(JSON, preserves `result_version: v1` payload)*
- `adapter_name`
- `result_version`
- `created_at`

### `report_exports`
Tracks report / summary generation history.

Suggested fields:
- `id`
- `case_id` -> `cases.id`
- `result_id` -> `inference_results.id`
- `export_type` *(pdf, clinician_summary, patient_summary, image, etc.)*
- `metadata` *(JSON)*
- `created_by_user_id` -> `users.id`
- `created_at`

### Optional `refresh_tokens` / session table
Needed if refresh-token revocation or persistent sessions are required.

## Relationship Summary
- organization 1:N users
- organization 1:N cases
- user 1:N owned cases
- case 1:N inference_results
- case 1:N report_exports
- inference_result 1:N report_exports *(optional but useful)*

## Persistence Strategy
- **Persist**
  - user / organization identity
  - case metadata and draft payload
  - normalized input used for inference
  - result envelope returned to UI
  - report/export history metadata
- **Do not persist by default**
  - raw uploaded binary files
  - direct identifiers
  - payload contents in logs/errors beyond safe structured metadata

## Access Rules
- every user belongs to exactly one organization
- case queries must always be scoped by `organization_id`
- non-admin users should only access their organization's data
- optionally, future refinement can distinguish owner-only vs org-wide clinician visibility

## Suggested API Expansion
The current upload contract can stay as-is for the first step, but the DB-backed phase will likely add routes such as:
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`
- `GET /api/v1/cases`
- `POST /api/v1/cases`
- `GET /api/v1/cases/{case_id}`
- `PATCH /api/v1/cases/{case_id}`
- `GET /api/v1/cases/{case_id}/results`
- `GET /api/v1/cases/{case_id}/reports`
- `POST /api/v1/cases/{case_id}/inference/upload`

## Migration / Implementation Order
1. Add DB wiring and migration framework.
2. Introduce organization and user entities.
3. Add auth/session flow.
4. Add case persistence and dashboard query endpoints.
5. Move upload execution behind a case-scoped route and persist results.
6. Add result/report history retrieval.

## Why PostgreSQL over SQLite
- better fit for organization/user/case/result relationships
- stronger concurrency and deployment story
- cleaner migration path as the prototype grows
- avoids redoing storage decisions once access boundaries become important
