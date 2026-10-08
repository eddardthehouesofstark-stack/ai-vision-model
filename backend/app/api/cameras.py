from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, status
from backend.app.models.schemas import Camera, CameraCreate, CameraUpdate

router = APIRouter(prefix="/cameras", tags=["cameras"])

# In-memory storage for demonstration / fallback
CAMERAS_DB = [
    {
        "id": "cam_01",
        "camera_id": "CAM-01",
        "name": "Main Entrance Gate 1",
        "location": "North Gate Turnstiles",
        "resolution": "1080p (1920x1080)",
        "fps": 30,
        "rtsp_url": "rtsp://192.168.10.11:554/ch0/main",
        "status": "online",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "video_count": 8,
        "event_count": 42,
        "thumbnail_url": "/assets/cctv_gate_night.jpg"
    },
    {
        "id": "cam_02",
        "camera_id": "CAM-02",
        "name": "Underground Parking P1",
        "location": "Basement Level East Wing",
        "resolution": "4K (3840x2160)",
        "fps": 25,
        "rtsp_url": "rtsp://192.168.10.12:554/ch0/main",
        "status": "online",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "video_count": 12,
        "event_count": 87,
        "thumbnail_url": "/assets/cctv_parking_lot.jpg"
    },
    {
        "id": "cam_03",
        "camera_id": "CAM-03",
        "name": "Corporate Corridor 3B",
        "location": "Level 3 Executive Suite",
        "resolution": "1080p (1920x1080)",
        "fps": 30,
        "rtsp_url": "rtsp://192.168.10.13:554/ch0/main",
        "status": "online",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "video_count": 5,
        "event_count": 29,
        "thumbnail_url": "/assets/cctv_corridor_office.jpg"
    },
    {
        "id": "cam_04",
        "camera_id": "CAM-04",
        "name": "Warehouse Loading Dock",
        "location": "West Logistics Bay 2",
        "resolution": "4K (3840x2160)",
        "fps": 30,
        "rtsp_url": "rtsp://192.168.10.14:554/ch0/main",
        "status": "online",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "video_count": 9,
        "event_count": 64,
        "thumbnail_url": "/assets/cctv_loading_dock.jpg"
    },
    {
        "id": "cam_05",
        "camera_id": "CAM-05",
        "name": "Perimeter Fence West",
        "location": "Outer Perimeter Fence Line",
        "resolution": "1080p (1920x1080)",
        "fps": 20,
        "rtsp_url": "rtsp://192.168.10.15:554/ch0/main",
        "status": "offline",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "video_count": 2,
        "event_count": 6,
        "thumbnail_url": "/assets/cctv_loading_dock.jpg"
    }
]

@router.get("", response_model=List[Camera])
async def list_cameras():
    return CAMERAS_DB

@router.post("", response_model=Camera, status_code=status.HTTP_201_CREATED)
async def register_camera(camera_in: CameraCreate):
    new_cam = {
        "id": f"cam_{len(CAMERAS_DB)+1:02d}",
        "camera_id": camera_in.camera_id,
        "name": camera_in.name,
        "location": camera_in.location,
        "resolution": camera_in.resolution,
        "fps": camera_in.fps,
        "rtsp_url": camera_in.rtsp_url,
        "status": camera_in.status,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "video_count": 0,
        "event_count": 0,
        "thumbnail_url": "/assets/cctv_corridor_office.jpg"
    }
    CAMERAS_DB.append(new_cam)
    return new_cam

@router.get("/{camera_id}", response_model=Camera)
async def get_camera(camera_id: str):
    for c in CAMERAS_DB:
        if c["id"] == camera_id or c["camera_id"] == camera_id:
            return c
    raise HTTPException(status_code=404, detail="Camera not found")

@router.put("/{camera_id}", response_model=Camera)
async def update_camera(camera_id: str, camera_update: CameraUpdate):
    for c in CAMERAS_DB:
        if c["id"] == camera_id or c["camera_id"] == camera_id:
            update_data = camera_update.dict(exclude_unset=True)
            for k, v in update_data.items():
                c[k] = v
            c["updated_at"] = datetime.utcnow()
            return c
    raise HTTPException(status_code=404, detail="Camera not found")

@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_camera(camera_id: str):
    global CAMERAS_DB
    CAMERAS_DB = [c for c in CAMERAS_DB if c["id"] != camera_id and c["camera_id"] != camera_id]
    return None
