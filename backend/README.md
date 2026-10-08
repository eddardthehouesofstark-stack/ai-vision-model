# ArgusEye CCTV Video Search - Backend (FastAPI + Supabase + pgvector)

## Architecture

- **FastAPI**: Asynchronous high-performance REST API.
- **Supabase PostgreSQL**: Persistent camera, video metadata, and incident logs.
- **pgvector**: High-dimensional vector indexing (`vector(512)`) for Vision-Language video search.
- **FFmpeg Pipeline**: Keyframe extraction (1 FPS), container demuxing, and timestamp synchronization.

## Running FastAPI Standalone

```bash
# 1. Install dependencies
pip install -r backend/requirements.txt

# 2. Run with Uvicorn
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

## API Documentation
Interactive Swagger UI available at:
`http://localhost:8000/docs`

## Supabase Database Schema

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Cameras table
CREATE TABLE cameras (
    id TEXT PRIMARY KEY,
    camera_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    resolution TEXT DEFAULT '1080p',
    fps INT DEFAULT 30,
    rtsp_url TEXT,
    status TEXT DEFAULT 'online',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Videos table
CREATE TABLE videos (
    id TEXT PRIMARY KEY,
    camera_id TEXT REFERENCES cameras(camera_id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    duration_seconds FLOAT NOT NULL,
    recorded_date DATE NOT NULL,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table with pgvector column
CREATE TABLE events (
    id TEXT PRIMARY KEY,
    camera_id TEXT REFERENCES cameras(camera_id),
    video_id TEXT REFERENCES videos(id),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timestamp_offset_seconds FLOAT NOT NULL,
    description TEXT NOT NULL,
    detected_objects TEXT[],
    confidence FLOAT NOT NULL,
    thumbnail_url TEXT,
    embedding vector(512),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search history table
CREATE TABLE search_history (
    id TEXT PRIMARY KEY,
    query TEXT NOT NULL,
    camera_filter TEXT,
    results_count INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```
