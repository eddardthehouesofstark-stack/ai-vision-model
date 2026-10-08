export type CameraStatus = 'online' | 'offline' | 'maintenance';
export type ProcessingStatus = 'waiting' | 'uploading' | 'processing' | 'indexing' | 'completed' | 'failed';

export interface Camera {
  id: string;
  camera_id: string;
  name: string;
  location: string;
  resolution: string;
  fps: number;
  rtsp_url?: string;
  status: CameraStatus;
  created_at: string;
  updated_at: string;
  video_count: number;
  event_count: number;
  thumbnail_url?: string;
  video_url?: string;
  is_uploaded?: boolean;
  duration_seconds?: number;
  upload_date?: string;
  processing_status?: ProcessingStatus;
}

export interface VideoRecord {
  id: string;
  camera_id: string;
  camera_name?: string;
  filename: string;
  file_size_bytes: number;
  duration_seconds: number;
  recorded_date: string;
  recorded_start_time: string;
  recorded_end_time: string;
  storage_path: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_progress: number;
  fps: number;
  resolution: string;
  created_at: string;
  indexed_events_count: number;
  thumbnail_url?: string;
  video_url?: string;
  is_uploaded?: boolean;
  indexed_events?: any[];
}

export interface BoundingBox {
  label: string;
  confidence: number;
  x: number; // 0.0 - 1.0 normalized
  y: number;
  width: number;
  height: number;
  vx?: number; // optional motion velocity delta X
  vy?: number; // optional motion velocity delta Y
}

export interface CCTVEvent {
  id: string;
  camera_id: string;
  camera_name: string;
  video_id: string;
  date: string;
  start_time: string;
  end_time: string;
  timestamp_offset_seconds: number;
  description: string;
  detected_objects: string[];
  confidence: number;
  thumbnail_url: string;
  video_url?: string;
  created_at?: string;
  bounding_boxes: BoundingBox[];
  metadata?: Record<string, any>;
  is_uploaded?: boolean;
  source_type?: 'camera' | 'upload';
}

export interface SearchResultItem {
  event_id: string;
  camera_id: string;
  camera_name: string;
  video_id: string;
  date: string;
  start_time: string;
  end_time: string;
  timestamp_offset_seconds: number;
  description: string;
  confidence: number;
  similarity_score: number;
  detected_objects: string[];
  thumbnail_url: string;
  video_url?: string;
  bounding_boxes: BoundingBox[];
  matched_reasons?: string[];
  metadata?: Record<string, any>;
  is_uploaded?: boolean;
  source_type?: 'camera' | 'upload';
}

export interface SearchResponse {
  query: string;
  total_results: number;
  execution_time_ms: number;
  answer_summary?: string;
  ai_forensic_verdict?: string;
  ai_engine?: string;
  results: SearchResultItem[];
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  camera_filter: string | null;
  results_count: number;
  created_at: string;
  status: string;
}

export interface SystemSettings {
  supabase_url: string;
  supabase_connected: boolean;
  pgvector_enabled: boolean;
  ffmpeg_version: string;
  ffmpeg_available: boolean;
  backend_status: string;
  osd_overlay_enabled: boolean;
  auto_seek_enabled: boolean;
  default_confidence_threshold: number;
  storage_usage_bytes: number;
  storage_capacity_bytes: number;
}

export type ActiveTab =
  | 'dashboard'
  | 'search'
  | 'cameras'
  | 'camera-dashboard'
  | 'upload'
  | 'history'
  | 'settings';

export interface UploadQueueItem {
  id: string;
  file?: File;
  presetUrl?: string;
  videoName: string;
  cameraName: string;
  cameraId: string;
  fileSize: number;
  duration: number;
  uploadProgress: number;
  processingProgress: number;
  status: ProcessingStatus;
  errorMessage?: string;
  uploadedVideoId?: string;
  indexedEventsCount?: number;
  thumbnailUrl?: string;
  videoUrl?: string;
  createdAt?: string;
}
