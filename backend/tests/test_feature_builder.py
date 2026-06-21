from __future__ import annotations

from pathlib import Path

import pytest

from app.services.errors import AppError
from app.services.expression_scores import ExpressionScores
from app.services.feature_builder import build_model_patient
from app.services.model_artifacts import ModelArtifactPaths

ZERO_FILL = ["ADAM21P1", "BAGE2", "MALAT1", "RP11-193H5.1", "SSPO"]


def _paths_with_coefficients(tmp_path: Path) -> ModelArtifactPaths:
    genes = [*ZERO_FILL, *(f"G{index}" for index in range(283))]
    rows = ["significant_genes,coef"]
    rows.extend(f"{gene},1.0" for gene in genes)
    rows.extend(
        [
            "age,0.1",
            "gender_encoded,0.2",
            "stage_encoded,0.3",
            "Stromal,0.4",
            "Immune,0.5",
        ]
    )
    (tmp_path / "gene_coef.csv").write_text("\n".join(rows), encoding="utf-8")
    return ModelArtifactPaths.from_directory(tmp_path)


def _mutation_csv(patient_id: str = "P-001") -> bytes:
    headers = ["Patient_ID", "OS_days", "OS_event", *(f"G{index}" for index in range(283))]
    values = [patient_id, "700", "0", *("1" if index == 0 else "0" for index in range(283))]
    return (",".join(headers) + "\n" + ",".join(values) + "\n").encode()


def _expression_csv(patient_id: str = "P-001") -> bytes:
    return f",ENSG00000000003.10\n{patient_id},1.25\n".encode()


def _fixed_scores(_: dict[str, float], __: str) -> ExpressionScores:
    return ExpressionScores(stromal=2.5, immune=-0.5)


def test_build_model_patient_orders_288_genes_and_zero_fills_approved_absences(
    tmp_path: Path,
) -> None:
    patient = build_model_patient(
        mutation_bytes=_mutation_csv(),
        expression_bytes=_expression_csv(),
        age=67,
        gender="male",
        stage=3,
        paths=_paths_with_coefficients(tmp_path),
        score_calculator=_fixed_scores,
    )

    assert patient.deidentified_patient_id == "P-001"
    assert patient.model_features is not None
    values = patient.model_features.values
    assert len(values) == 293
    assert values[:5] == [0.0] * 5
    assert values[5] == 1.0
    assert values[-5:] == [67.0, 1.0, 3.0, 2.5, -0.5]


def test_build_model_patient_rejects_mismatched_patient_ids(tmp_path: Path) -> None:
    with pytest.raises(AppError) as error:
        build_model_patient(
            mutation_bytes=_mutation_csv("P-001"),
            expression_bytes=_expression_csv("P-002"),
            age=67,
            gender="female",
            stage=1,
            paths=_paths_with_coefficients(tmp_path),
            score_calculator=_fixed_scores,
        )
    assert error.value.code == "PATIENT_ID_MISMATCH"


def test_build_model_patient_rejects_non_binary_mutation_value(tmp_path: Path) -> None:
    payload = _mutation_csv().replace(b",1,0,0,0", b",2,0,0,0", 1)
    with pytest.raises(AppError) as error:
        build_model_patient(
            mutation_bytes=payload,
            expression_bytes=_expression_csv(),
            age=67,
            gender="female",
            stage=1,
            paths=_paths_with_coefficients(tmp_path),
            score_calculator=_fixed_scores,
        )
    assert error.value.code == "INVALID_MUTATION_VALUE"
