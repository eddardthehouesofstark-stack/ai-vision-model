import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from backend.app.models.schemas import Video
from backend.app.services.video_indexer import video_pipeline

router = APIRouter(prefix="/videos", tags=["videos"])

VIDEOS_DB = [
    {
        "id": "vid_01",
        "camera_id": "CAM-01",
        "filename": "gate1_20261008_night_shift.mp4",
        "file_size_bytes": 142589000,
        "duration_seconds": 3600.0,
        "recorded_date": "2026-10-08",
        "recorded_start_time": "20:00:00",
        "recorded_end_time": "21:00:00",
        "storage_path": "cctv-footage/CAM-01/gate1_20261008_night_shift.mp4",
        "status": "completed",
        "processing_progress": 100,
        "fps": 30,
        "resolution": "1920x1080",
        "created_at": datetime.utcnow(),
        "indexed_events_count": 14
    },
    {
        "id": "vid_02",
        "camera_id": "CAM-02",
        "filename": "parking_p1_20261008_afternoon.mp4",
        "file_size_bytes": 285120000,
        "duration_seconds": 7200.0,
        "recorded_date": "2026-10-08",
        "recorded_start_time": "14:00:00",
        "recorded_end_time": "16:00:00",
        "storage_path": "cctv-footage/CAM-02/parking_p1_20261008_afternoon.mp4",
        "status": "completed",
        "processing_progress": 100,
        "fps": 25,
        "resolution": "3840x2160",
        "created_at": datetime.utcnow(),
        "indexed_events_count": 28
    }
]

@router.get("", response_model=List[Video])
async def list_videos():
    return VIDEOS_DB

@router.post("/upload", response_model=Video)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    camera_id: str = Form(...),
    recorded_date: str = Form(default="2026-10-08"),
    start_time: str = Form(default="09:00:00"),
    end_time: str = Form(default="10:00:00")
):
    video_id = f"vid_{uuid.uuid4().hex[:6]}"
    new_video = {
        "id": video_id,
        "camera_id": camera_id,
        "filename": file.filename or "cctv_recording.mp4",
        "file_size_bytes": 85000000,
        "duration_seconds": 3600.0,
        "recorded_date": recorded_date,
        "recorded_start_time": start_time,
        "recorded_end_time": end_time,
        "storage_path": f"cctv-footage/{camera_id}/{file.filename}",
        "status": "processing",
        "processing_progress": 15,
        "fps": 30,
        "resolution": "1920x1080",
        "created_at": datetime.utcnow(),
        "indexed_events_count": 0
    }
    VIDEOS_DB.append(new_video)
    
    background_tasks.add_task(
        video_pipeline.extract_and_index_video,
        video_id=video_id,
        camera_id=camera_id,
        file_path=new_video["storage_path"]
    )
    
    return new_video

@router.get("/{video_id}", response_model=Video)
async def get_video(video_id: str):
    for v in VIDEOS_DB:
        if v["id"] == video_id:
            return v
    raise HTTPException(status_code=404, detail="Video not found")

@router.get("/{video_id}/clip")
async def get_video_clip(video_id: str, offset: float = 0.0, duration: float = 30.0):
    return {
        "video_id": video_id,
        "offset": offset,
        "duration": duration,
        "stream_url": f"/api/stream/{video_id}?t={offset}",
        "format": "mp4"
    }
