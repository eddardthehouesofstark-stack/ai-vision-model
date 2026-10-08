from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# Camera Schemas
class CameraBase(BaseModel):
    name: str = Field(..., example="Main Entrance Gate 1")
    camera_id: str = Field(..., example="CAM-01")
    location: str = Field(..., example="North Gate / Turnstiles")
    resolution: str = Field(default="1080p (1920x1080)", example="1080p")
    fps: int = Field(default=30, example=30)
    rtsp_url: Optional[str] = Field(default=None, example="rtsp://192.168.1.101:554/live")
    status: str = Field(default="online", example="online")  # online, offline, maintenance

class CameraCreate(CameraBase):
    pass

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    resolution: Optional[str] = None
    fps: Optional[int] = None
    rtsp_url: Optional[str] = None
    status: Optional[str] = None

class Camera(CameraBase):
    id: str
    created_at: datetime
    updated_at: datetime
    video_count: int = 0
    event_count: int = 0
    thumbnail_url: Optional[str] = None

    class Config:
        from_attributes = True

# Video Schemas
class VideoBase(BaseModel):
    camera_id: str
    filename: str
    file_size_bytes: int
    duration_seconds: float
    recorded_date: str
    recorded_start_time: str
    recorded_end_time: str

class VideoCreate(VideoBase):
    storage_path: str

class Video(VideoBase):
    id: str
    storage_path: str
    status: str = "completed"  # pending, processing, completed, failed
    processing_progress: int = 100
    fps: int = 30
    resolution: str = "1920x1080"
    created_at: datetime
    indexed_events_count: int = 0

    class Config:
        from_attributes = True

# Detection Bounding Box Schema
class BoundingBox(BaseModel):
    label: str
    confidence: float
    x: float  # Normalized 0-1
    y: float
    width: float
    height: float

# Event Schemas
class EventBase(BaseModel):
    camera_id: str
    camera_name: str
    video_id: str
    date: str
    start_time: str
    end_time: str
    timestamp_offset_seconds: float
    description: str
    detected_objects: List[str]
    confidence: float
    thumbnail_url: str

class EventCreate(EventBase):
    embedding: Optional[List[float]] = None
    bounding_boxes: Optional[List[BoundingBox]] = None

class Event(EventBase):
    id: str
    created_at: datetime
    bounding_boxes: List[BoundingBox] = []
    metadata: Dict[str, Any] = {}

    class Config:
        from_attributes = True

# Search Schemas
class SearchQuery(BaseModel):
    query: str = Field(..., example="Did anyone enter through Gate 1 after 9 PM?")
    camera_id: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    min_confidence: Optional[float] = Field(default=0.60, ge=0.0, le=1.0)
    limit: int = Field(default=20, ge=1, le=100)

class SearchResultItem(BaseModel):
    event_id: str
    camera_id: str
    camera_name: str
    video_id: str
    date: str
    start_time: str
    end_time: str
    timestamp_offset_seconds: float
    description: str
    confidence: float
    similarity_score: float
    detected_objects: List[str]
    thumbnail_url: str
    bounding_boxes: List[BoundingBox] = []

class SearchResponse(BaseModel):
    query: str
    total_results: int
    execution_time_ms: float
    results: List[SearchResultItem]

# Search History
class SearchHistoryItem(BaseModel):
    id: str
    query: str
    camera_filter: Optional[str] = None
    results_count: int
    created_at: datetime
    status: str = "completed"

# System / Health Schemas
class HealthCheck(BaseModel):
    status: str
    version: str
    timestamp: datetime
    database_connected: bool
    storage_connected: bool
    ffmpeg_available: bool
    vector_search_ready: bool
