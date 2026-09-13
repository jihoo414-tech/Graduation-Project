from __future__ import annotations

import csv
import io
import math
from collections.abc import Callable

from app.common.exceptions import AppError, error_detail
from app.dto.internal.model_features import ModelFeatures
from app.dto.shared.patient import ClinicalInfo, GeneVariant, NormalizedPatientInput
from app.repository.model_artifacts import ModelArtifactPaths, load_ordered_feature_coefficients
from app.service.inference.expression_scores import ExpressionScores, calculate_expression_scores

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
            message=(
                "두 파일의 환자 정보가 서로 다릅니다. 같은 환자의 돌연변이 파일과 "
                "유전자 발현량 파일을 선택해 주세요."
            ),
            details=[error_detail("expression_file", "patient_id_matches_mutation_file")],
        )

    gender_encoded = _encode_gender(gender)
    if not isinstance(stage, int) or isinstance(stage, bool) or stage not in {1, 2, 3, 4}:
        raise AppError(
            status_code=422,
            code="INVALID_CLINICAL_VALUE",
            message="병기 값이 올바르지 않습니다. 1기부터 4기 중 하나를 선택해 주세요.",
            details=[error_detail("stage", "integer_1_to_4")],
        )
    if not isinstance(age, int) or isinstance(age, bool) or not 0 <= age <= 130:
        raise AppError(
            status_code=422,
            code="INVALID_CLINICAL_VALUE",
            message="분석 가능한 나이 범위를 벗어났습니다. 환자의 생년월일을 확인해 주세요.",
            details=[error_detail("age", "integer_0_to_130")],
        )

    if score_calculator is None:
        score_calculator = calculate_expression_scores
    scores = score_calculator(expression_values, expression_id)
    if not all(math.isfinite(value) for value in (scores.stromal, scores.immune)):
        raise AppError(
            status_code=503,
            code="MODEL_INFERENCE_FAILED",
            message=(
                "유전자 발현량 점수가 정상적으로 계산되지 않았습니다. 관리자에게 문의해 주세요."
            ),
            details=[error_detail("expression_file", "finite_stromal_and_immune_scores")],
        )

    feature_values = [mutation_values[name] for name, _ in ordered_coefficients[:288]]
    feature_values.extend([float(age), gender_encoded, float(stage), scores.stromal, scores.immune])
    if len(feature_values) != 293 or not all(math.isfinite(value) for value in feature_values):
        raise AppError(
            status_code=503,
            code="MODEL_INFERENCE_FAILED",
            message="모델 입력 데이터를 구성하지 못했습니다. 관리자에게 문의해 주세요.",
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
            message=(
                "돌연변이 파일에 환자 식별 열이 없습니다. 지정된 분석용 양식에 "
                "맞는 파일을 선택해 주세요."
            ),
            details=[error_detail("mutation_file.Patient_ID", "required")],
        )
    values_by_header = dict(zip(headers, row, strict=True))
    patient_id = values_by_header["Patient_ID"].strip()
    if not patient_id:
        raise AppError(
            status_code=422,
            code="MISSING_PATIENT_ID",
            message=(
                "돌연변이 파일의 환자 식별 정보가 비어 있습니다. 정보를 입력한 뒤 "
                "다시 업로드해 주세요."
            ),
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
                message=(
                    "돌연변이 파일에 0이나 1이 아닌 값이 있습니다. 변이 유무를 0 또는 "
                    "1로 수정해 주세요."
                ),
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
            message=(
                "유전자 발현량 파일의 첫 번째 열 제목이 올바르지 않습니다. 첫 "
                "번째 열 제목을 비워 주세요."
            ),
            details=[error_detail("expression_file", "blank_first_header")],
        )
    patient_id = row[0].strip()
    if not patient_id:
        raise AppError(
            status_code=422,
            code="MISSING_PATIENT_ID",
            message=(
                "유전자 발현량 파일의 환자 식별 정보가 비어 있습니다. 정보를 "
                "입력한 뒤 다시 업로드해 주세요."
            ),
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
                message=(
                    "유전자 발현량에 숫자가 아닌 값이 있습니다. 빈칸이나 문자를 "
                    "숫자로 수정해 주세요."
                ),
                details=[error_detail(f"expression_file.{gene_id}", "finite_number")],
            ) from exc
        if not math.isfinite(value):
            raise AppError(
                status_code=422,
                code="INVALID_EXPRESSION_VALUE",
                message=(
                    "유전자 발현량에 계산할 수 없는 값이 있습니다. 무한대나 유효하지 "
                    "않은 숫자를 수정해 주세요."
                ),
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
            message=(
                "파일의 문자 인코딩을 읽을 수 없습니다. UTF-8 형식의 CSV로 저장한 "
                "뒤 다시 업로드해 주세요."
            ),
            details=[error_detail(field, "utf8_csv")],
        ) from exc
    try:
        rows = list(csv.reader(io.StringIO(text)))
    except csv.Error as exc:
        raise AppError(
            status_code=400,
            code="MALFORMED_FILE",
            message=(
                "CSV 파일의 내용을 읽을 수 없습니다. 구분자와 따옴표 등 파일 형식을 확인해 주세요."
            ),
            details=[error_detail(field, "valid_csv")],
        ) from exc
    if len(rows) != 2 or not rows[0] or len(rows[0]) != len(rows[1]):
        raise AppError(
            status_code=422,
            code="INVALID_MATRIX_SHAPE",
            message=(
                "파일의 행 또는 열 구성이 올바르지 않습니다. 제목 한 행과 환자 한 "
                "명의 데이터 한 행을 넣고 두 행의 열 수를 맞춰 주세요."
            ),
            details=[error_detail(field, "one_patient_row")],
        )
    headers, row = rows
    seen: set[str] = set()
    for index, header in enumerate(headers):
        if header == "" and not (allow_first_blank_header and index == 0):
            raise AppError(
                status_code=422,
                code="MALFORMED_FILE",
                message=(
                    "파일에 제목이 비어 있는 열이 있습니다. 열 제목을 채운 뒤 다시 업로드해 주세요."
                ),
                details=[error_detail(field, "non_blank_headers")],
            )
        if header in seen and not allow_duplicate_headers:
            raise AppError(
                status_code=422,
                code="MALFORMED_FILE",
                message=(
                    "파일에 같은 제목의 열이 여러 개 있습니다. 중복된 열 제목을 수정해 주세요."
                ),
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
        message="성별 값이 올바르지 않습니다. 성별 항목에서 여성 또는 남성을 선택해 주세요.",
        details=[error_detail("gender", "female_or_male")],
    )
