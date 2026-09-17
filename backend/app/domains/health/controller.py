from fastapi import APIRouter

from app.domains.health.schemas import HealthResponse
from app.domains.health.service import get_health

router = APIRouter()


@router.get("/api/v1/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return get_health()
