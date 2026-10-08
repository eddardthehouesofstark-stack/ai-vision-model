import time
import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter
from backend.app.models.schemas import SearchQuery, SearchResponse, SearchHistoryItem
from backend.app.api.events import SAMPLE_EVENTS
from backend.app.services.nlp_search import nlp_search

router = APIRouter(prefix="/search", tags=["search"])

SEARCH_HISTORY_DB: List[dict] = [
    {
        "id": "sh_1",
        "query": "Did anyone enter through Gate 1 after 9 PM?",
        "camera_filter": "CAM-01",
        "results_count": 2,
        "created_at": datetime.utcnow(),
        "status": "completed"
    },
    {
        "id": "sh_2",
        "query": "Show all red cars.",
        "camera_filter": None,
        "results_count": 1,
        "created_at": datetime.utcnow(),
        "status": "completed"
    },
    {
        "id": "sh_3",
        "query": "Find people carrying bags.",
        "camera_filter": None,
        "results_count": 2,
        "created_at": datetime.utcnow(),
        "status": "completed"
    }
]

@router.post("", response_model=SearchResponse)
async def search_events(search_in: SearchQuery):
    t_start = time.perf_counter()
    
    # Filter candidates by camera if provided
    candidates = SAMPLE_EVENTS
    if search_in.camera_id:
        candidates = [e for e in candidates if e["camera_id"] == search_in.camera_id]

    ranked_items = nlp_search.rank_events(
        query=search_in.query,
        events=candidates,
        min_confidence=search_in.min_confidence or 0.5
    )

    elapsed_ms = (time.perf_counter() - t_start) * 1000

    # Save to search history
    SEARCH_HISTORY_DB.insert(0, {
        "id": f"sh_{uuid.uuid4().hex[:6]}",
        "query": search_in.query,
        "camera_filter": search_in.camera_id,
        "results_count": len(ranked_items),
        "created_at": datetime.utcnow(),
        "status": "completed"
    })

    return SearchResponse(
        query=search_in.query,
        total_results=len(ranked_items),
        execution_time_ms=round(elapsed_ms, 2),
        results=ranked_items[:search_in.limit]
    )

@router.get("/history", response_model=List[SearchHistoryItem])
async def get_search_history():
    return SEARCH_HISTORY_DB

@router.delete("/history")
async def clear_search_history():
    global SEARCH_HISTORY_DB
    SEARCH_HISTORY_DB = []
    return {"status": "cleared"}
