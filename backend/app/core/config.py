import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ArgusEye CCTV Video Search Platform"
    API_V1_STR: str = "/api"
    
    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://xyzcompany.supabase.co")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # Storage and Processing
    STORAGE_BUCKET: str = "cctv-footage"
    THUMBNAIL_BUCKET: str = "cctv-thumbnails"
    FFMPEG_PATH: str = os.getenv("FFMPEG_PATH", "ffmpeg")
    FRAME_EXTRACTION_FPS: float = 1.0  # Extract 1 frame per second for vector embedding
    EMBEDDING_DIMENSION: int = 512    # Vector dimension for pgvector
    
    # Search Thresholds
    DEFAULT_CONFIDENCE_THRESHOLD: float = 0.65
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
