from app.domain.user import SupabaseUser
from app.dto.request.inference import InferenceUploadRequest
from app.dto.response.inference import InferenceSuccessResponse
from app.repository.model_artifacts import artifact_paths_from_env
from app.service.analysis_service import save_analysis_result
from app.service.inference.adapters import get_inference_adapter
from app.service.inference.feature_builder import build_model_patient


def run_analysis(
    *,
    mutation_bytes: bytes,
    expression_bytes: bytes,
    age: int,
    request: InferenceUploadRequest,
    access_token: str,
    user: SupabaseUser,
) -> InferenceSuccessResponse:
    patient = build_model_patient(
        mutation_bytes=mutation_bytes,
        expression_bytes=expression_bytes,
        age=age,
        gender=request.gender,
        stage=request.stage,
        paths=artifact_paths_from_env(),
    )
    result = get_inference_adapter().run(patient)
    save_analysis_result(access_token, user, result)
    return result
