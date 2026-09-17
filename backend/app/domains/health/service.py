from app.domains.analysis.inference.adapters import get_inference_adapter
from app.domains.health.schemas import HealthResponse


def get_health() -> HealthResponse:
    return HealthResponse(status="ok", adapter=get_inference_adapter().name)
