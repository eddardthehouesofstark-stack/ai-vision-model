from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException
from backend.app.models.schemas import Event

router = APIRouter(prefix="/events", tags=["events"])

SAMPLE_EVENTS = [
    {
        "id": "evt-01",
        "camera_id": "CAM-01",
        "camera_name": "Main Entrance Gate 1",
        "video_id": "vid_01",
        "date": "2026-10-08",
        "start_time": "21:14:05",
        "end_time": "21:14:38",
        "timestamp_offset_seconds": 845.0,
        "description": "Person entered through Gate 1 turnstile carrying a black duffel bag after 9 PM",
        "detected_objects": ["person", "bag", "door"],
        "confidence": 0.94,
        "thumbnail_url": "/assets/cctv_gate_night.jpg",
        "created_at": datetime.utcnow(),
        "bounding_boxes": [
            {"label": "person", "confidence": 0.95, "x": 0.38, "y": 0.22, "width": 0.24, "height": 0.65},
            {"label": "bag", "confidence": 0.89, "x": 0.48, "y": 0.45, "width": 0.14, "height": 0.22}
        ],
        "metadata": {"entry_point": "Turnstile 2", "direction": "inbound"}
    },
    {
        "id": "evt-02",
        "camera_id": "CAM-02",
        "camera_name": "Underground Parking P1",
        "video_id": "vid_02",
        "date": "2026-10-08",
        "start_time": "14:32:10",
        "end_time": "14:33:05",
        "timestamp_offset_seconds": 1930.0,
        "description": "Red sedan automobile entered underground parking ramp and parked in Bay 14",
        "detected_objects": ["car", "vehicle", "red car"],
        "confidence": 0.96,
        "thumbnail_url": "/assets/cctv_parking_lot.jpg",
        "created_at": datetime.utcnow(),
        "bounding_boxes": [
            {"label": "car", "confidence": 0.97, "x": 0.25, "y": 0.40, "width": 0.48, "height": 0.38}
        ],
        "metadata": {"vehicle_type": "Sedan", "color": "Red", "plate_partial": "7XYZ"}
    },
    {
        "id": "evt-03",
        "camera_id": "CAM-03",
        "camera_name": "Corporate Corridor 3B",
        "video_id": "vid_03",
        "date": "2026-10-08",
        "start_time": "11:05:22",
        "end_time": "11:06:14",
        "timestamp_offset_seconds": 322.0,
        "description": "Courier courier carrying large yellow package and backpack passing through executive hallway",
        "detected_objects": ["person", "bag", "backpack"],
        "confidence": 0.91,
        "thumbnail_url": "/assets/cctv_corridor_office.jpg",
        "created_at": datetime.utcnow(),
        "bounding_boxes": [
            {"label": "person", "confidence": 0.92, "x": 0.42, "y": 0.18, "width": 0.22, "height": 0.70},
            {"label": "backpack", "confidence": 0.88, "x": 0.39, "y": 0.29, "width": 0.12, "height": 0.25}
        ],
        "metadata": {"badge_scanned": True, "access_point": "East Door"}
    },
    {
        "id": "evt-04",
        "camera_id": "CAM-04",
        "camera_name": "Warehouse Loading Dock",
        "video_id": "vid_04",
        "date": "2026-10-08",
        "start_time": "15:20:00",
        "end_time": "15:24:45",
        "timestamp_offset_seconds": 1200.0,
        "description": "White delivery freight truck backed into Loading Bay 2 with worker guiding cargo pallet",
        "detected_objects": ["truck", "van", "delivery", "person"],
        "confidence": 0.95,
        "thumbnail_url": "/assets/cctv_loading_dock.jpg",
        "created_at": datetime.utcnow(),
        "bounding_boxes": [
            {"label": "truck", "confidence": 0.96, "x": 0.18, "y": 0.28, "width": 0.55, "height": 0.52},
            {"label": "person", "confidence": 0.91, "x": 0.72, "y": 0.48, "width": 0.12, "height": 0.38}
        ],
        "metadata": {"dock_number": 2, "manifest_id": "MNF-8891"}
    },
    {
        "id": "evt-05",
        "camera_id": "CAM-02",
        "camera_name": "Underground Parking P1",
        "video_id": "vid_02",
        "date": "2026-10-08",
        "start_time": "08:42:12",
        "end_time": "08:43:01",
        "timestamp_offset_seconds": 2532.0,
        "description": "Commuter riding bicycle passed through parking entrance gate barrier towards bike storage rack",
        "detected_objects": ["bike", "bicycle", "person"],
        "confidence": 0.92,
        "thumbnail_url": "/assets/cctv_parking_lot.jpg",
        "created_at": datetime.utcnow(),
        "bounding_boxes": [
            {"label": "person", "confidence": 0.93, "x": 0.44, "y": 0.32, "width": 0.20, "height": 0.52},
            {"label": "bicycle", "confidence": 0.91, "x": 0.40, "y": 0.46, "width": 0.28, "height": 0.39}
        ],
        "metadata": {"speed_mph": 8.4, "helmet_detected": True}
    },
    {
        "id": "evt-06",
        "camera_id": "CAM-01",
        "camera_name": "Main Entrance Gate 1",
        "video_id": "vid_01",
        "date": "2026-10-08",
        "start_time": "22:45:10",
        "end_time": "22:47:30",
        "timestamp_offset_seconds": 6310.0,
        "description": "Individual loitering near Gate 1 outer perimeter turnstiles after business hours",
        "detected_objects": ["person", "loitering"],
        "confidence": 0.88,
        "thumbnail_url": "/assets/cctv_gate_night.jpg",
        "created_at": datetime.utcnow(),
        "bounding_boxes": [
            {"label": "person", "confidence": 0.90, "x": 0.52, "y": 0.35, "width": 0.18, "height": 0.58}
        ],
        "metadata": {"dwell_time_seconds": 140, "security_alert": "Advisory"}
    }
]

@router.get("", response_model=List[Event])
async def list_events():
    return SAMPLE_EVENTS

@router.get("/{event_id}", response_model=Event)
async def get_event(event_id: str):
    for evt in SAMPLE_EVENTS:
        if evt["id"] == event_id:
            return evt
    raise HTTPException(status_code=404, detail="Event not found")
