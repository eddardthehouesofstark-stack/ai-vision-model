import re
from typing import List, Dict, Any
from backend.app.models.schemas import SearchResultItem, BoundingBox

class NLPSearchEngine:
    """
    Parses natural language CCTV queries, extracts semantic keywords, temporal filters,
    target entities, and computes ranking scores against indexed CCTV events.
    """
    
    @staticmethod
    def parse_query(query: str) -> Dict[str, Any]:
        lower_q = query.lower()
        
        # Temporal analysis (e.g., "after 9 PM", "between 14:00 and 16:00", "after midnight")
        time_filter = None
        if "after 9 pm" in lower_q or "after 21" in lower_q:
            time_filter = {"min_hour": 21}
        elif "after midnight" in lower_q:
            time_filter = {"min_hour": 0, "max_hour": 5}
        elif "after dark" in lower_q or "night" in lower_q:
            time_filter = {"is_night": True}

        # Camera / Gate extraction
        camera_hints = []
        if "gate 1" in lower_q or "gate-1" in lower_q or "entrance" in lower_q:
            camera_hints.append("CAM-01")
        if "parking" in lower_q:
            camera_hints.append("CAM-02")
        if "corridor" in lower_q or "office" in lower_q:
            camera_hints.append("CAM-03")
        if "dock" in lower_q or "warehouse" in lower_q or "delivery" in lower_q:
            camera_hints.append("CAM-04")

        # Entity targets
        target_entities = []
        for word in ["person", "people", "man", "woman", "bag", "backpack", "car", "cars", "red car", "bike", "bicycle", "van", "truck", "delivery"]:
            if word in lower_q:
                target_entities.append(word)

        return {
            "cleaned_query": query.strip(),
            "time_filter": time_filter,
            "camera_hints": camera_hints,
            "target_entities": target_entities
        }

    @classmethod
    def rank_events(cls, query: str, events: List[Dict[str, Any]], min_confidence: float = 0.5) -> List[SearchResultItem]:
        parsed = cls.parse_query(query)
        lower_q = query.lower()
        scored_results: List[SearchResultItem] = []

        for evt in events:
            score = 0.5  # Base score
            evt_desc = evt.get("description", "").lower()
            evt_cam = evt.get("camera_id", "")
            evt_name = evt.get("camera_name", "").lower()
            evt_objs = [o.lower() for o in evt.get("detected_objects", [])]
            evt_time = evt.get("start_time", "00:00:00")
            hour = int(evt_time.split(":")[0]) if ":" in evt_time else 12

            # Camera hint match
            if evt_cam in parsed["camera_hints"]:
                score += 0.35
            
            # Entity matching
            for ent in parsed["target_entities"]:
                if ent in evt_desc or any(ent in obj for obj in evt_objs):
                    score += 0.25

            # Word tokens overlap
            query_words = set(re.findall(r'\b\w+\b', lower_q))
            desc_words = set(re.findall(r'\b\w+\b', evt_desc))
            overlap = query_words.intersection(desc_words)
            score += len(overlap) * 0.08

            # Temporal match
            if parsed["time_filter"]:
                tf = parsed["time_filter"]
                if tf.get("min_hour") is not None and hour >= tf["min_hour"]:
                    score += 0.3
                if tf.get("is_night") and (hour >= 20 or hour <= 6):
                    score += 0.25

            # Clamp between 0.0 and 0.99
            final_similarity = min(0.99, max(0.40, score))
            
            if final_similarity >= min_confidence:
                bboxes = [
                    BoundingBox(**box) if isinstance(box, dict) else box
                    for box in evt.get("bounding_boxes", [])
                ]
                item = SearchResultItem(
                    event_id=evt["id"],
                    camera_id=evt["camera_id"],
                    camera_name=evt["camera_name"],
                    video_id=evt["video_id"],
                    date=evt["date"],
                    start_time=evt["start_time"],
                    end_time=evt["end_time"],
                    timestamp_offset_seconds=evt.get("timestamp_offset_seconds", 0.0),
                    description=evt["description"],
                    confidence=evt.get("confidence", 0.9),
                    similarity_score=round(final_similarity, 3),
                    detected_objects=evt.get("detected_objects", []),
                    thumbnail_url=evt.get("thumbnail_url", ""),
                    bounding_boxes=bboxes
                )
                scored_results.append(item)

        # Sort descending by similarity
        scored_results.sort(key=lambda x: x.similarity_score, reverse=True)
        return scored_results

nlp_search = NLPSearchEngine()
