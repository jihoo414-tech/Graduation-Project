from __future__ import annotations

import csv
import io
import math
from collections.abc import Callable

from app.schemas import ClinicalInfo, GeneVariant, ModelFeatures, NormalizedPatientInput
from app.services.errors import AppError, error_detail
from app.services.expression_scores import ExpressionScores, calculate_expression_scores
from app.services.model_artifacts import ModelArtifactPaths, load_ordered_feature_coefficients

ExpressionScoreCalculator = Callable[[dict[str, float], str], ExpressionScores]


def build_model_patient(
    *,
    mutation_bytes: bytes,
    expression_bytes: bytes,
    age: int,
    gender: str,
    stage: int,
    paths: ModelArtifactPaths,
    score_calculator: ExpressionScoreCalculator | None = None,
) -> NormalizedPatientInput:
    """Create the exact producer-defined 293-feature patient payload."""

    ordered_coefficients = load_ordered_feature_coefficients(paths)
    mutation_id, mutation_values = _parse_mutation_matrix(mutation_bytes, ordered_coefficients)
    expression_id, expression_values = _parse_expression_matrix(expression_bytes)
    if mutation_id != expression_id:
        raise AppError(
            status_code=422,
            code="PATIENT_ID_MISMATCH",
            message="Mutation and RNA-seq uploads must belong to the same patient.",
            details=[error_detail("expression_file", "patient_id_matches_mutation_file")],
        )

    gender_encoded = _encode_gender(gender)
    if not isinstance(stage, int) or isinstance(stage, bool) or stage not in {1, 2, 3, 4}:
        raise AppError(
            status_code=422,
            code="INVALID_CLINICAL_VALUE",
            message="Stage must be an integer from 1 through 4.",
            details=[error_detail("stage", "integer_1_to_4")],
        )
    if not isinstance(age, int) or isinstance(age, bool) or not 0 <= age <= 130:
        raise AppError(
            status_code=422,
            code="INVALID_CLINICAL_VALUE",
            message="Age must be an integer from 0 through 130.",
            details=[error_detail("age", "integer_0_to_130")],
        )

    if score_calculator is None:
        score_calculator = calculate_expression_scores
    scores = score_calculator(expression_values, expression_id)
    if not all(math.isfinite(value) for value in (scores.stromal, scores.immune)):
        raise AppError(
            status_code=503,
            code="MODEL_INFERENCE_FAILED",
            message="RNA-seq score calculation returned a non-finite value.",
            details=[error_detail("expression_file", "finite_stromal_and_immune_scores")],
        )

    feature_values = [mutation_values[name] for name, _ in ordered_coefficients[:288]]
    feature_values.extend([float(age), gender_encoded, float(stage), scores.stromal, scores.immune])
    if len(feature_values) != 293 or not all(math.isfinite(value) for value in feature_values):
        raise AppError(
            status_code=503,
            code="MODEL_INFERENCE_FAILED",
            message="The model feature vector is invalid.",
            details=[error_detail("features", "293_finite_values")],
        )

    variants = [
        GeneVariant(gene=gene, variant_classification="Mutation_Present")
        for gene, value in mutation_values.items()
        if value == 1
    ]
    return NormalizedPatientInput(
        deidentified_patient_id=mutation_id,
        gene_variants=variants,
        clinical=ClinicalInfo(
            age=age,
            pathologic_stage=str(stage),
            gender=gender,
            stage=stage,
        ),
        model_features=ModelFeatures(
            values=feature_values,
            stromal_score=scores.stromal,
            immune_score=scores.immune,
        ),
    )


def _parse_mutation_matrix(
    raw_bytes: bytes, ordered_coefficients: list[tuple[str, float]]
) -> tuple[str, dict[str, int]]:
    rows = _read_one_row_csv(raw_bytes, field="mutation_file", allow_duplicate_headers=True)
    headers, row = rows
    if "Patient_ID" not in headers:
        raise AppError(
            status_code=422,
            code="MISSING_PATIENT_ID",
            message="Mutation upload must include a Patient_ID column.",
            details=[error_detail("mutation_file.Patient_ID", "required")],
        )
    values_by_header = dict(zip(headers, row, strict=True))
    patient_id = values_by_header["Patient_ID"].strip()
    if not patient_id:
        raise AppError(
            status_code=422,
            code="MISSING_PATIENT_ID",
            message="Mutation upload must include a patient ID.",
            details=[error_detail("mutation_file.Patient_ID", "non_empty")],
        )

    mutation_values: dict[str, int] = {}
    for gene, _ in ordered_coefficients[:288]:
        if gene not in values_by_header:
            mutation_values[gene] = 0
            continue
        raw_value = values_by_header[gene].strip()
        if raw_value not in {"0", "1"}:
            raise AppError(
                status_code=422,
                code="INVALID_MUTATION_VALUE",
                message="Mutation values must be 0 or 1.",
                details=[error_detail(f"mutation_file.{gene}", "binary_0_or_1")],
            )
        mutation_values[gene] = int(raw_value)
    return patient_id, mutation_values


def _parse_expression_matrix(raw_bytes: bytes) -> tuple[str, dict[str, float]]:
    headers, row = _read_one_row_csv(
        raw_bytes, field="expression_file", allow_first_blank_header=True
    )
    if headers[0] != "":
        raise AppError(
            status_code=422,
            code="MALFORMED_FILE",
            message="RNA-seq upload must start with a blank patient ID header.",
            details=[error_detail("expression_file", "blank_first_header")],
        )
    patient_id = row[0].strip()
    if not patient_id:
        raise AppError(
            status_code=422,
            code="MISSING_PATIENT_ID",
            message="RNA-seq upload must include a patient ID.",
            details=[error_detail("expression_file.patient_id", "non_empty")],
        )

    expression_values: dict[str, float] = {}
    for gene_id, raw_value in zip(headers[1:], row[1:], strict=True):
        try:
            value = float(raw_value)
        except ValueError as exc:
            raise AppError(
                status_code=422,
                code="INVALID_EXPRESSION_VALUE",
                message="RNA-seq expression values must be numeric.",
                details=[error_detail(f"expression_file.{gene_id}", "finite_number")],
            ) from exc
        if not math.isfinite(value):
            raise AppError(
                status_code=422,
                code="INVALID_EXPRESSION_VALUE",
                message="RNA-seq expression values must be finite.",
                details=[error_detail(f"expression_file.{gene_id}", "finite_number")],
            )
        expression_values[gene_id] = value
    return patient_id, expression_values


def _read_one_row_csv(
    raw_bytes: bytes,
    *,
    field: str,
    allow_first_blank_header: bool = False,
    allow_duplicate_headers: bool = False,
) -> tuple[list[str], list[str]]:
    try:
        text = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise AppError(
            status_code=400,
            code="MALFORMED_FILE",
            message="Uploaded file must be a UTF-8 CSV.",
            details=[error_detail(field, "utf8_csv")],
        ) from exc
    try:
        rows = list(csv.reader(io.StringIO(text)))
    except csv.Error as exc:
        raise AppError(
            status_code=400,
            code="MALFORMED_FILE",
            message="Unable to parse uploaded CSV.",
            details=[error_detail(field, "valid_csv")],
        ) from exc
    if len(rows) != 2 or not rows[0] or len(rows[0]) != len(rows[1]):
        raise AppError(
            status_code=422,
            code="INVALID_MATRIX_SHAPE",
            message="Upload must contain exactly one header row and one patient row.",
            details=[error_detail(field, "one_patient_row")],
        )
    headers, row = rows
    seen: set[str] = set()
    for index, header in enumerate(headers):
        if header == "" and not (allow_first_blank_header and index == 0):
            raise AppError(
                status_code=422,
                code="MALFORMED_FILE",
                message="Upload contains a blank header.",
                details=[error_detail(field, "non_blank_headers")],
            )
        if header in seen and not allow_duplicate_headers:
            raise AppError(
                status_code=422,
                code="MALFORMED_FILE",
                message="Upload contains duplicate headers.",
                details=[error_detail(field, "unique_headers")],
            )
        seen.add(header)
    return headers, row


def _encode_gender(gender: str) -> float:
    if gender == "female":
        return 0.0
    if gender == "male":
        return 1.0
    raise AppError(
        status_code=422,
        code="INVALID_CLINICAL_VALUE",
        message="Gender must be female or male.",
        details=[error_detail("gender", "female_or_male")],
    )
