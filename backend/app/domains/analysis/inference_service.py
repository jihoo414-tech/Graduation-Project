from app.domains.analysis.inference.adapters import get_inference_adapter
from app.domains.analysis.inference.feature_builder import build_model_patient
from app.domains.analysis.model_artifacts import artifact_paths_from_env
from app.domains.analysis.schemas.inference_response import InferenceSuccessResponse
from app.domains.analysis.schemas.patient import PatientReference
from app.domains.analysis.schemas.request import InferenceUploadRequest
from app.domains.analysis.service import save_analysis_result
from app.domains.auth.models import SupabaseUser


def run_analysis(
    *,
    mutation_bytes: bytes,
    expression_bytes: bytes,
    age: int,
    request: InferenceUploadRequest,
    access_token: str,
    user: SupabaseUser,
    patient_user_id: str,
    patient_name: str | None,
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
    result = result.model_copy(
        update={
            "patient": PatientReference(
                deidentified_patient_id=patient_user_id,
                display_name=patient_name,
            )
        }
    )
    save_analysis_result(access_token, user, patient_user_id, result)
    return result
