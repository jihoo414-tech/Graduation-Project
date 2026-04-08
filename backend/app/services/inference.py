from __future__ import annotations

import csv
import io
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.schemas import (
    ClinicalInfo,
    ErrorBody,
    ErrorDetail,
    ErrorResponse,
    GeneVariant,
    InferenceResult,
    InferenceSuccessResponse,
    NormalizedPatientInput,
    PatientReference,
    ResultArtifacts,
    Summary,
)

DISALLOWED_IDENTIFIER_FIELDS = {"name", "national_id", "hospital_id"}
ALLOWED_CLINICAL_FIELDS = {"age", "pathologic_stage", "gender"}
ALLOWED_TOP_LEVEL_FIELDS = {
    "deidentified_patient_id",
    "gene_variants",
    "clinical",
    *ALLOWED_CLINICAL_FIELDS,
}
CSV_ALLOWED_FIELDS = {
    "deidentified_patient_id",
    "gene",
    "variant_classification",
    *ALLOWED_CLINICAL_FIELDS,
}


@dataclass(slots=True)
class AppError(Exception):
    status_code: int
    code: str
    message: str
    details: list[ErrorDetail]

    def to_response(self) -> ErrorResponse:
        return ErrorResponse(
            error=ErrorBody(
                code=self.code,
                message=self.message,
                details=self.details,
            )
        )


def _detail(field: str, rule: str) -> ErrorDetail:
    return ErrorDetail(field=field, rule=rule)


def _raise_disallowed_identifier_fields(found_fields: set[str]) -> None:
    disallowed = sorted(found_fields & DISALLOWED_IDENTIFIER_FIELDS)
    if disallowed:
        raise AppError(
            status_code=422,
            code="DISALLOWED_IDENTIFIER_FIELD",
            message="Direct identifiers are not allowed.",
            details=[_detail(field, "forbidden") for field in disallowed],
        )


def _clean_text_payload(raw_bytes: bytes) -> str:
    try:
        return raw_bytes.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise AppError(
            status_code=400,
            code="MALFORMED_FILE",
            message="Unable to parse uploaded file.",
            details=[_detail("file", "valid_csv_or_json")],
        ) from exc


def parse_uploaded_patient(
    filename: str | None,
    raw_bytes: bytes,
    content_type: str | None = None,
) -> NormalizedPatientInput:
    suffix = Path(filename or "upload").suffix.lower()
    if suffix == ".json" or content_type == "application/json":
        payload = _parse_json_payload(raw_bytes)
    elif suffix == ".csv" or content_type in {"text/csv", "application/csv"}:
        payload = _parse_csv_payload(raw_bytes)
    else:
        raise AppError(
            status_code=415,
            code="UNSUPPORTED_FILE_TYPE",
            message="Supported file types are CSV and JSON.",
            details=[_detail("file", "content_type")],
        )

    return _normalize_patient_payload(payload)


def _parse_json_payload(raw_bytes: bytes) -> dict[str, Any]:
    text = _clean_text_payload(raw_bytes)
    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise AppError(
            status_code=400,
            code="MALFORMED_FILE",
            message="Unable to parse uploaded file.",
            details=[_detail("file", "valid_csv_or_json")],
        ) from exc

    if not isinstance(payload, dict):
        raise AppError(
            status_code=400,
            code="MALFORMED_FILE",
            message="Unable to parse uploaded file.",
            details=[_detail("file", "valid_csv_or_json")],
        )

    _raise_disallowed_identifier_fields(set(payload.keys()))
    return payload


def _parse_csv_payload(raw_bytes: bytes) -> dict[str, Any]:
    text = _clean_text_payload(raw_bytes)
    try:
        reader = csv.DictReader(io.StringIO(text))
        rows = list(reader)
    except csv.Error as exc:
        raise AppError(
            status_code=400,
            code="MALFORMED_FILE",
            message="Unable to parse uploaded file.",
            details=[_detail("file", "valid_csv_or_json")],
        ) from exc

    fieldnames = reader.fieldnames
    if not fieldnames or any(name is None or not str(name).strip() for name in fieldnames):
        raise AppError(
            status_code=400,
            code="MALFORMED_FILE",
            message="Unable to parse uploaded file.",
            details=[_detail("file", "valid_csv_or_json")],
        )

    normalized_headers = {str(name).strip() for name in fieldnames}
    _raise_disallowed_identifier_fields(normalized_headers)
    if normalized_headers - CSV_ALLOWED_FIELDS:
        raise AppError(
            status_code=400,
            code="MALFORMED_FILE",
            message="Unable to parse uploaded file.",
            details=[_detail("file", "valid_csv_or_json")],
        )
    if any(None in row for row in rows):
        raise AppError(
            status_code=400,
            code="MALFORMED_FILE",
            message="Unable to parse uploaded file.",
            details=[_detail("file", "valid_csv_or_json")],
        )

    patient_ids = {
        row.get("deidentified_patient_id", "").strip()
        for row in rows
        if row.get("deidentified_patient_id")
    }
    if len(patient_ids) > 1:
        raise AppError(
            status_code=400,
            code="MULTIPLE_PATIENT_IDS",
            message="Upload must contain exactly one patient ID.",
            details=[_detail("deidentified_patient_id", "single_patient_per_upload")],
        )

    payload: dict[str, Any] = {
        "deidentified_patient_id": next(iter(patient_ids), ""),
        "gene_variants": [],
    }

    clinical_payload: dict[str, Any] = {}
    for field in ALLOWED_CLINICAL_FIELDS:
        values = {row.get(field, "").strip() for row in rows if row.get(field, "").strip()}
        if len(values) > 1:
            raise AppError(
                status_code=400,
                code="MALFORMED_FILE",
                message="Unable to parse uploaded file.",
                details=[_detail("file", "valid_csv_or_json")],
            )
        if values:
            clinical_payload[field] = next(iter(values))
    if clinical_payload:
        payload["clinical"] = clinical_payload

    payload["gene_variants"] = [
        {
            "gene": (row.get("gene") or "").strip(),
            "variant_classification": (
                row.get("variant_classification") or ""
            ).strip(),
        }
        for row in rows
    ]
    return payload


def _normalize_patient_payload(payload: dict[str, Any]) -> NormalizedPatientInput:
    _raise_disallowed_identifier_fields(set(payload.keys()))

    extra_fields = set(payload.keys()) - ALLOWED_TOP_LEVEL_FIELDS
    if extra_fields:
        raise AppError(
            status_code=400,
            code="MALFORMED_FILE",
            message="Unable to parse uploaded file.",
            details=[_detail("file", "valid_csv_or_json")],
        )

    patient_id = str(payload.get("deidentified_patient_id") or "").strip()
    if not patient_id:
        raise AppError(
            status_code=422,
            code="MISSING_PATIENT_ID",
            message="deidentified_patient_id is required.",
            details=[_detail("deidentified_patient_id", "required")],
        )

    raw_variants = payload.get("gene_variants")
    if not isinstance(raw_variants, list) or not raw_variants:
        raise AppError(
            status_code=422,
            code="MISSING_GENE_VARIANTS",
            message="gene_variants is required.",
            details=[_detail("gene_variants", "required")],
        )

    variants: list[GeneVariant] = []
    for index, raw_variant in enumerate(raw_variants):
        if not isinstance(raw_variant, dict):
            raise AppError(
                status_code=400,
                code="MALFORMED_FILE",
                message="Unable to parse uploaded file.",
                details=[_detail("file", "valid_csv_or_json")],
            )

        _raise_disallowed_identifier_fields(set(raw_variant.keys()))
        extra_variant_fields = set(raw_variant.keys()) - {"gene", "variant_classification"}
        if extra_variant_fields:
            raise AppError(
                status_code=400,
                code="MALFORMED_FILE",
                message="Unable to parse uploaded file.",
                details=[_detail("file", "valid_csv_or_json")],
            )

        gene = str(raw_variant.get("gene") or "").strip()
        if not gene:
            raise AppError(
                status_code=422,
                code="MISSING_REQUIRED_FIELD",
                message="A required gene variant field is missing.",
                details=[_detail(f"gene_variants[{index}].gene", "required")],
            )

        variant_classification = str(raw_variant.get("variant_classification") or "").strip()
        if not variant_classification:
            raise AppError(
                status_code=422,
                code="MISSING_REQUIRED_FIELD",
                message="A required gene variant field is missing.",
                details=[
                    _detail(
                        f"gene_variants[{index}].variant_classification",
                        "required",
                    )
                ],
            )

        variants.append(GeneVariant(gene=gene, variant_classification=variant_classification))

    return NormalizedPatientInput(
        deidentified_patient_id=patient_id,
        gene_variants=variants,
        clinical=_normalize_clinical(payload),
    )


def _normalize_clinical(payload: dict[str, Any]) -> ClinicalInfo:
    raw_clinical = payload.get("clinical")
    if raw_clinical is None:
        raw_clinical = {}
    if not isinstance(raw_clinical, dict):
        raise AppError(
            status_code=400,
            code="MALFORMED_FILE",
            message="Unable to parse uploaded file.",
            details=[_detail("file", "valid_csv_or_json")],
        )

    _raise_disallowed_identifier_fields(set(raw_clinical.keys()))
    extra_clinical_fields = set(raw_clinical.keys()) - ALLOWED_CLINICAL_FIELDS
    if extra_clinical_fields:
        raise AppError(
            status_code=400,
            code="MALFORMED_FILE",
            message="Unable to parse uploaded file.",
            details=[_detail("file", "valid_csv_or_json")],
        )

    return ClinicalInfo(
        age=_coerce_optional_age(_choose_clinical_value(payload, raw_clinical, "age")),
        pathologic_stage=_coerce_optional_str(
            _choose_clinical_value(payload, raw_clinical, "pathologic_stage")
        ),
        gender=_coerce_optional_str(
            _choose_clinical_value(payload, raw_clinical, "gender")
        ),
    )


def _choose_clinical_value(
    payload: dict[str, Any],
    raw_clinical: dict[str, Any],
    field: str,
) -> Any:
    top_level = payload.get(field)
    nested = raw_clinical.get(field)
    if (
        top_level is not None
        and nested is not None
        and str(top_level).strip() != str(nested).strip()
    ):
        raise AppError(
            status_code=400,
            code="MALFORMED_FILE",
            message="Unable to parse uploaded file.",
            details=[_detail("file", "valid_csv_or_json")],
        )
    return nested if nested is not None else top_level


def _coerce_optional_age(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        age = int(str(value).strip())
    except (TypeError, ValueError) as exc:
        raise AppError(
            status_code=400,
            code="MALFORMED_FILE",
            message="Unable to parse uploaded file.",
            details=[_detail("file", "valid_csv_or_json")],
        ) from exc
    if not 0 <= age <= 130:
        raise AppError(
            status_code=400,
            code="MALFORMED_FILE",
            message="Unable to parse uploaded file.",
            details=[_detail("file", "valid_csv_or_json")],
        )
    return age


def _coerce_optional_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def run_mock_inference(patient: NormalizedPatientInput) -> InferenceSuccessResponse:
    score = round(min(0.95, 0.35 + (0.1 * len(patient.gene_variants))), 2)
    risk_level = "중간 위험" if score < 0.7 else "높은 위험"

    return InferenceSuccessResponse(
        result_version="v1",
        patient=PatientReference(deidentified_patient_id=patient.deidentified_patient_id),
        normalized_input=patient,
        result=InferenceResult(
            adapter="mock",
            summary=Summary(
                risk_level=risk_level,
                risk_score=score,
                text="프로토타입용 mock 추론 결과입니다.",
            ),
            artifacts=ResultArtifacts(survival_curve=None, explanations=[]),
        ),
        warnings=[],
    )
