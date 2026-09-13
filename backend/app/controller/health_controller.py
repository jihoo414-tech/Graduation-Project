from fastapi import APIRouter

from app.dto.response.health import HealthResponse
from app.service.inference.adapters import get_inference_adapter

router = APIRouter()


@router.get("/api/v1/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", adapter=get_inference_adapter().name)
