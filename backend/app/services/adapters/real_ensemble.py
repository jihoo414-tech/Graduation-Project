from __future__ import annotations

from app.schemas import (
    ExpressionScoreArtifact,
    InferenceResult,
    InferenceSuccessResponse,
    ModelScore,
    PatientReference,
    ResultArtifacts,
    Summary,
)
from app.services.ensemble_runtime import run_ensemble
from app.services.errors import AppError, error_detail
from app.services.model_artifacts import ModelArtifactPaths, artifact_paths_from_env
from app.services.survival_curve import build_km_curve


class RealEnsembleAdapter:
    """Synchronous adapter for the producer-delivered three-model ensemble."""

    name = "real_ensemble"

    def __init__(self, paths: ModelArtifactPaths | None = None) -> None:
        self.paths = paths or artifact_paths_from_env()

    def run(self, patient) -> InferenceSuccessResponse:
        if patient.model_features is None:
            raise AppError(
                status_code=422,
                code="MODEL_FEATURES_REQUIRED",
                message="Real model inference requires mutation and RNA-seq matrix uploads.",
                details=[error_detail("mutation_file", "and_expression_file_required")],
            )
        scores = run_ensemble(patient.model_features.values, self.paths)
        risk_level = "높은 위험" if scores.risk_group == "High" else "낮은 위험"
        return InferenceSuccessResponse(
            result_version="v2",
            patient=PatientReference(deidentified_patient_id=patient.deidentified_patient_id),
            normalized_input=patient,
            result=InferenceResult(
                adapter=self.name,
                summary=Summary(
                    risk_level=risk_level,
                    risk_score=round(scores.ensemble, 6),
                    text="Cox, RSF, DeepSurv 결과를 정규화한 동일 가중치 앙상블 예측입니다.",
                ),
                artifacts=ResultArtifacts(
                    survival_curve=build_km_curve(
                        _load_km_rows(self.paths), risk_group=scores.risk_group
                    ),
                    model_scores={
                        "cox": ModelScore(raw=scores.cox_raw, z_score=scores.cox_z),
                        "rsf": ModelScore(raw=scores.rsf_raw, z_score=scores.rsf_z),
                        "deepsurv": ModelScore(raw=scores.deepsurv_raw, z_score=scores.deepsurv_z),
                    },
                    ensemble_score=scores.ensemble,
                    risk_group=scores.risk_group,
                    risk_threshold=scores.risk_threshold,
                    expression_scores=ExpressionScoreArtifact(
                        stromal=patient.model_features.stromal_score,
                        immune=patient.model_features.immune_score,
                    ),
                    artifact_manifest_digest=scores.artifact_digest,
                ),
            ),
            warnings=[],
        )


def _load_km_rows(paths: ModelArtifactPaths):
    from app.services.model_artifacts import load_km_rows

    return load_km_rows(paths)
