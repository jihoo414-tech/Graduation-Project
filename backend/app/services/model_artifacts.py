from __future__ import annotations

import csv
import json
import math
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.services.errors import AppError, error_detail

MODEL_ARTIFACT_DIR_ENV = "MODEL_ARTIFACT_DIR"
SAFE_PREVIEW_FILES = ("ensemble_stats.json", "gene_coef.csv", "km_data.csv")
BINARY_MODEL_FILES = ("deepsurv_model.pt", "rsf.model.pkl")
EXPECTED_ARTIFACT_FILES = (*BINARY_MODEL_FILES, *SAFE_PREVIEW_FILES)


@dataclass(frozen=True)
class ModelArtifactPaths:
    root: Path
    deepsurv_model: Path
    rsf_model: Path
    ensemble_stats: Path
    gene_coefficients: Path
    km_data: Path

    @classmethod
    def from_directory(cls, artifact_dir: str | Path) -> "ModelArtifactPaths":
        root = Path(artifact_dir).expanduser()
        return cls(
            root=root,
            deepsurv_model=root / "deepsurv_model.pt",
            rsf_model=root / "rsf.model.pkl",
            ensemble_stats=root / "ensemble_stats.json",
            gene_coefficients=root / "gene_coef.csv",
            km_data=root / "km_data.csv",
        )

    def missing(self, filenames: tuple[str, ...] = EXPECTED_ARTIFACT_FILES) -> list[str]:
        return [filename for filename in filenames if not (self.root / filename).is_file()]


def artifact_paths_from_env() -> ModelArtifactPaths:
    configured_dir = os.getenv(MODEL_ARTIFACT_DIR_ENV, "").strip()
    if not configured_dir:
        raise AppError(
            status_code=500,
            code="MODEL_ARTIFACT_DIR_REQUIRED",
            message="Model artifact directory is not configured.",
            details=[error_detail(MODEL_ARTIFACT_DIR_ENV, "required")],
        )

    return ModelArtifactPaths.from_directory(configured_dir)


def require_artifacts(
    paths: ModelArtifactPaths,
    filenames: tuple[str, ...] = EXPECTED_ARTIFACT_FILES,
) -> None:
    missing = paths.missing(filenames)
    if missing:
        raise AppError(
            status_code=500,
            code="MODEL_ARTIFACTS_MISSING",
            message="Configured model artifact directory is incomplete.",
            details=[error_detail(filename, "missing") for filename in missing],
        )


def load_ensemble_stats(paths: ModelArtifactPaths) -> dict[str, float]:
    require_artifacts(paths, ("ensemble_stats.json",))
    with paths.ensemble_stats.open(encoding="utf-8") as file:
        raw_stats: dict[str, Any] = json.load(file)

    required_keys = {"cox_mean", "cox_std", "rsf_mean", "rsf_std", "ds_mean", "ds_std"}
    missing_keys = sorted(required_keys - set(raw_stats))
    if missing_keys:
        raise AppError(
            status_code=500,
            code="MODEL_ARTIFACT_INVALID",
            message="Ensemble statistics artifact is missing required keys.",
            details=[error_detail(key, "required") for key in missing_keys],
        )

    try:
        return {key: float(raw_stats[key]) for key in required_keys}
    except (TypeError, ValueError) as exc:
        raise AppError(
            status_code=500,
            code="MODEL_ARTIFACT_INVALID",
            message="Ensemble statistics artifact contains non-numeric values.",
            details=[error_detail("ensemble_stats.json", "numeric_values")],
        ) from exc


def load_gene_coefficients(paths: ModelArtifactPaths) -> dict[str, float]:
    require_artifacts(paths, ("gene_coef.csv",))
    coefficients: dict[str, float] = {}

    with paths.gene_coefficients.open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        if reader.fieldnames != ["significant_genes", "coef"]:
            raise AppError(
                status_code=500,
                code="MODEL_ARTIFACT_INVALID",
                message="Gene coefficient artifact has an unexpected schema.",
                details=[error_detail("gene_coef.csv", "expected_significant_genes_and_coef")],
            )

        for row_index, row in enumerate(reader, start=2):
            gene = (row.get("significant_genes") or "").strip()
            raw_coef = (row.get("coef") or "").strip()
            if not gene or not raw_coef:
                raise AppError(
                    status_code=500,
                    code="MODEL_ARTIFACT_INVALID",
                    message="Gene coefficient artifact contains an empty value.",
                    details=[error_detail(f"gene_coef.csv:{row_index}", "non_empty")],
                )
            try:
                coefficients[gene.upper()] = float(raw_coef)
            except ValueError as exc:
                raise AppError(
                    status_code=500,
                    code="MODEL_ARTIFACT_INVALID",
                    message="Gene coefficient artifact contains a non-numeric coefficient.",
                    details=[error_detail(f"gene_coef.csv:{row_index}", "numeric_coef")],
                ) from exc

    return coefficients


def load_ordered_feature_coefficients(paths: ModelArtifactPaths) -> list[tuple[str, float]]:
    """Load the producer's feature order without collapsing or reordering it."""

    require_artifacts(paths, ("gene_coef.csv",))
    ordered: list[tuple[str, float]] = []

    with paths.gene_coefficients.open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        if reader.fieldnames != ["significant_genes", "coef"]:
            raise AppError(
                status_code=503,
                code="MODEL_ARTIFACT_INVALID",
                message="Gene coefficient artifact has an unexpected schema.",
                details=[error_detail("gene_coef.csv", "expected_significant_genes_and_coef")],
            )

        for row_index, row in enumerate(reader, start=2):
            name = (row.get("significant_genes") or "").strip()
            raw_coef = (row.get("coef") or "").strip()
            if not name:
                raise AppError(
                    status_code=503,
                    code="MODEL_ARTIFACT_INVALID",
                    message="Gene coefficient artifact contains an empty feature name.",
                    details=[error_detail(f"gene_coef.csv:{row_index}", "feature_name")],
                )
            try:
                coefficient = float(raw_coef)
            except ValueError as exc:
                raise AppError(
                    status_code=503,
                    code="MODEL_ARTIFACT_INVALID",
                    message="Gene coefficient artifact contains a non-numeric coefficient.",
                    details=[error_detail(f"gene_coef.csv:{row_index}", "numeric_coef")],
                ) from exc
            if not math.isfinite(coefficient):
                raise AppError(
                    status_code=503,
                    code="MODEL_ARTIFACT_INVALID",
                    message="Gene coefficient artifact contains a non-finite coefficient.",
                    details=[error_detail(f"gene_coef.csv:{row_index}", "finite_coef")],
                )
            ordered.append((name, coefficient))

    expected_tail = ["age", "gender_encoded", "stage_encoded", "Stromal", "Immune"]
    if len(ordered) != 293 or [name for name, _ in ordered[-5:]] != expected_tail:
        raise AppError(
            status_code=503,
            code="MODEL_ARTIFACT_INVALID",
            message="Gene coefficient artifact does not match the expected 293-feature contract.",
            details=[error_detail("gene_coef.csv", "expected_293_feature_order")],
        )
    return ordered


def load_km_rows(paths: ModelArtifactPaths) -> list[dict[str, str]]:
    require_artifacts(paths, ("km_data.csv",))
    with paths.km_data.open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        if reader.fieldnames != ["time", "event", "ensemble_risk", "risk_group"]:
            raise AppError(
                status_code=500,
                code="MODEL_ARTIFACT_INVALID",
                message="Kaplan-Meier artifact has an unexpected schema.",
                details=[error_detail("km_data.csv", "expected_km_columns")],
            )
        return list(reader)
