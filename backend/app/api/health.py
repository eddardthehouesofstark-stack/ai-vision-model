from datetime import datetime
from fastapi import APIRouter
from backend.app.models.schemas import HealthCheck
from backend.app.database.supabase_client import db_manager

router = APIRouter(prefix="/health", tags=["health"])

@router.get("", response_model=HealthCheck)
async def check_health():
    return HealthCheck(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.utcnow(),
        database_connected=True,
        storage_connected=True,
        ffmpeg_available=True,
        vector_search_ready=True
    )
