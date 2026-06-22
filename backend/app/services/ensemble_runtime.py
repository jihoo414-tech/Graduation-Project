from __future__ import annotations

import hashlib
import math
from collections.abc import Sequence
from dataclasses import dataclass
from functools import lru_cache

from app.services.errors import AppError, error_detail
from app.services.model_artifacts import (
    ModelArtifactPaths,
    load_ensemble_stats,
    load_km_rows,
    load_ordered_feature_coefficients,
    require_artifacts,
)


@dataclass(frozen=True)
class EnsembleScores:
    cox_raw: float
    rsf_raw: float
    deepsurv_raw: float
    cox_z: float
    rsf_z: float
    deepsurv_z: float
    ensemble: float
    risk_threshold: float
    risk_group: str
    artifact_digest: str


def run_ensemble(features: Sequence[float], paths: ModelArtifactPaths) -> EnsembleScores:
    if len(features) != 293 or not all(math.isfinite(value) for value in features):
        raise AppError(
            status_code=503,
            code="MODEL_INFERENCE_FAILED",
            message="Real model inference requires 293 finite feature values.",
            details=[error_detail("features", "293_finite_values")],
        )
    runtime = _load_runtime(paths)
    cox_raw = _cox_score(features, runtime.coefficients)
    rsf_raw = _rsf_score(features, runtime.rsf_model)
    deepsurv_raw = _deepsurv_score(features, runtime.deepsurv_model)
    cox_z = _z_score(cox_raw, runtime.stats["cox_mean"], runtime.stats["cox_std"], "cox")
    rsf_z = _z_score(rsf_raw, runtime.stats["rsf_mean"], runtime.stats["rsf_std"], "rsf")
    deepsurv_z = _z_score(
        deepsurv_raw, runtime.stats["ds_mean"], runtime.stats["ds_std"], "deepsurv"
    )
    ensemble = (cox_z + rsf_z + deepsurv_z) / 3
    if not math.isfinite(ensemble):
        raise _runtime_error("ensemble_score", "finite_equal_weight_average")
    risk_threshold = _derive_risk_threshold(runtime.km_rows)
    risk_group = "High" if ensemble >= risk_threshold else "Low"
    return EnsembleScores(
        cox_raw=cox_raw,
        rsf_raw=rsf_raw,
        deepsurv_raw=deepsurv_raw,
        cox_z=cox_z,
        rsf_z=rsf_z,
        deepsurv_z=deepsurv_z,
        ensemble=ensemble,
        risk_threshold=risk_threshold,
        risk_group=risk_group,
        artifact_digest=runtime.artifact_digest,
    )


@dataclass(frozen=True)
class _Runtime:
    coefficients: tuple[float, ...]
    stats: dict[str, float]
    km_rows: list[dict[str, str]]
    rsf_model: object
    deepsurv_model: object
    artifact_digest: str


@lru_cache(maxsize=4)
def _load_runtime(paths: ModelArtifactPaths) -> _Runtime:
    require_artifacts(paths)
    try:
        import joblib
        import torch
        from torch import nn
    except ImportError as exc:
        raise AppError(
            status_code=503,
            code="MODEL_RUNTIME_UNAVAILABLE",
            message="Real model runtime dependencies are not installed.",
            details=[error_detail("backend_dependencies", "torch_joblib_scikit_survival")],
        ) from exc

    ordered_coefficients = load_ordered_feature_coefficients(paths)
    try:
        rsf_model = joblib.load(paths.rsf_model)
    except Exception as exc:
        raise AppError(
            status_code=503,
            code="MODEL_ARTIFACT_INVALID",
            message="Unable to load the trusted RSF model artifact.",
            details=[error_detail("rsf.model.pkl", "compatible_joblib_scikit_survival")],
        ) from exc
    if not hasattr(rsf_model, "predict"):
        raise AppError(
            status_code=503,
            code="MODEL_ARTIFACT_INVALID",
            message="RSF artifact does not expose a prediction method.",
            details=[error_detail("rsf.model.pkl", "predict_method")],
        )

    try:
        checkpoint = torch.load(paths.deepsurv_model, map_location="cpu", weights_only=True)
    except Exception as exc:
        raise AppError(
            status_code=503,
            code="MODEL_ARTIFACT_INVALID",
            message="Unable to load the DeepSurv model artifact.",
            details=[error_detail("deepsurv_model.pt", "compatible_torch_checkpoint")],
        ) from exc
    deepsurv_model = nn.Sequential(
        nn.Linear(293, 64),
        nn.BatchNorm1d(64),
        nn.ReLU(),
        nn.Dropout(),
        nn.Linear(64, 32),
        nn.BatchNorm1d(32),
        nn.ReLU(),
        nn.Dropout(),
        nn.Linear(32, 1),
    )
    try:
        deepsurv_model.load_state_dict(checkpoint, strict=True)
    except Exception as exc:
        raise AppError(
            status_code=503,
            code="MODEL_ARTIFACT_INVALID",
            message="DeepSurv checkpoint does not match the expected 293-64-32-1 architecture.",
            details=[error_detail("deepsurv_model.pt", "state_dict_architecture")],
        ) from exc
    deepsurv_model.eval()

    digest = _artifact_digest(paths)
    return _Runtime(
        coefficients=tuple(coefficient for _, coefficient in ordered_coefficients),
        stats=load_ensemble_stats(paths),
        km_rows=load_km_rows(paths),
        rsf_model=rsf_model,
        deepsurv_model=deepsurv_model,
        artifact_digest=digest,
    )


def clear_runtime_cache() -> None:
    _load_runtime.cache_clear()


def _cox_score(features: Sequence[float], coefficients: Sequence[float]) -> float:
    score = sum(
        feature * coefficient for feature, coefficient in zip(features, coefficients, strict=True)
    )
    if not math.isfinite(score):
        raise _runtime_error("cox", "finite_linear_score")
    return score


def _rsf_score(features: Sequence[float], model: object) -> float:
    try:
        import numpy as np

        feature_names = getattr(model, "feature_names_in_", None)
        if feature_names is not None:
            import pandas as pd

            model_input = pd.DataFrame([features], columns=list(feature_names))
        else:
            model_input = np.asarray([features], dtype=float)
        predicted = model.predict(model_input)  # type: ignore[attr-defined]
        score = float(predicted[0])
    except Exception as exc:
        raise _runtime_error("rsf", "scalar_predict_output") from exc
    if not math.isfinite(score):
        raise _runtime_error("rsf", "finite_scalar_output")
    return score


def _deepsurv_score(features: Sequence[float], model: object) -> float:
    try:
        import torch

        with torch.no_grad():
            output = model(torch.tensor([features], dtype=torch.float32))
        score = float(output.reshape(-1)[0].item())
    except Exception as exc:
        raise _runtime_error("deepsurv", "scalar_eval_output") from exc
    if not math.isfinite(score):
        raise _runtime_error("deepsurv", "finite_scalar_output")
    return score


def _z_score(value: float, mean: float, standard_deviation: float, model_name: str) -> float:
    if (
        not all(math.isfinite(item) for item in (value, mean, standard_deviation))
        or standard_deviation <= 0
    ):
        raise _runtime_error(model_name, "finite_positive_standard_deviation")
    result = (value - mean) / standard_deviation
    if not math.isfinite(result):
        raise _runtime_error(model_name, "finite_z_score")
    return result


def _derive_risk_threshold(rows: list[dict[str, str]]) -> float:
    observations: list[tuple[float, str]] = []
    for row in rows:
        try:
            score = float(row["ensemble_risk"])
        except (KeyError, TypeError, ValueError) as exc:
            raise _threshold_error("finite_ensemble_risk") from exc
        group = (row.get("risk_group") or "").strip()
        if group not in {"High", "Low"} or not math.isfinite(score):
            raise _threshold_error("valid_high_low_groups")
        observations.append((score, group))
    unique_scores = sorted({score for score, _ in observations})
    if len(unique_scores) < 2 or {group for _, group in observations} != {"High", "Low"}:
        raise _threshold_error("both_groups_and_multiple_scores")
    candidates = [
        (left + right) / 2
        for left, right in zip(unique_scores, unique_scores[1:], strict=False)
    ]
    perfect = [
        candidate
        for candidate in candidates
        if all(("High" if score >= candidate else "Low") == group for score, group in observations)
    ]
    if len(perfect) != 1:
        raise _threshold_error("unique_perfect_threshold")
    return perfect[0]


def _artifact_digest(paths: ModelArtifactPaths) -> str:
    digest = hashlib.sha256()
    for path in (
        paths.gene_coefficients,
        paths.ensemble_stats,
        paths.km_data,
        paths.rsf_model,
        paths.deepsurv_model,
    ):
        digest.update(path.name.encode("utf-8"))
        with path.open("rb") as file:
            for chunk in iter(lambda: file.read(1024 * 1024), b""):
                digest.update(chunk)
    return f"sha256:{digest.hexdigest()}"


def _runtime_error(field: str, rule: str) -> AppError:
    return AppError(
        status_code=503,
        code="MODEL_INFERENCE_FAILED",
        message="Real model inference could not produce a valid result.",
        details=[error_detail(field, rule)],
    )


def _threshold_error(rule: str) -> AppError:
    return AppError(
        status_code=503,
        code="RISK_THRESHOLD_UNRESOLVED",
        message="Unable to derive a reliable risk-group threshold from the model artifact.",
        details=[error_detail("km_data.csv", rule)],
    )
