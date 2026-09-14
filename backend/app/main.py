from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.common.config import cors_origins
from app.common.error_handlers import register_exception_handlers
from app.controller import (
    analysis_controller,
    auth_controller,
    health_controller,
    patient_controller,
)

app = FastAPI(title="Graduation Project Backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_exception_handlers(app)
app.include_router(auth_controller.router)
app.include_router(patient_controller.router)
app.include_router(health_controller.router)
app.include_router(analysis_controller.router)
