import axios from 'axios';
import {
  Camera,
  VideoRecord,
  CCTVEvent,
  SearchResponse,
  SearchHistoryItem,
  SystemSettings,
} from '../types';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 60000, // 60 seconds default timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Health
  checkHealth: async () => {
    const res = await apiClient.get('/health');
    return res.data;
  },

  // Settings
  getSettings: async (): Promise<SystemSettings> => {
    const res = await apiClient.get('/settings/status');
    return res.data;
  },
  updateSettings: async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
    const res = await apiClient.post('/settings', settings);
    return res.data;
  },

  // Cameras
  getCameras: async (): Promise<Camera[]> => {
    const res = await apiClient.get('/cameras');
    return res.data;
  },
  getCamera: async (id: string): Promise<Camera> => {
    const res = await apiClient.get(`/cameras/${id}`);
    return res.data;
  },
  createCamera: async (camera: Partial<Camera>): Promise<Camera> => {
    const res = await apiClient.post('/cameras', camera);
    return res.data;
  },
  updateCamera: async (id: string, camera: Partial<Camera>): Promise<Camera> => {
    const res = await apiClient.put(`/cameras/${id}`, camera);
    return res.data;
  },
  deleteCamera: async (id: string): Promise<void> => {
    await apiClient.delete(`/cameras/${id}`);
  },

  // Videos
  getVideos: async (): Promise<VideoRecord[]> => {
    const res = await apiClient.get('/videos');
    return res.data;
  },
  uploadVideo: async (
    formData: FormData,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<VideoRecord> => {
    // Note: Do NOT explicitly pass 'Content-Type': 'multipart/form-data'.
    // In browser Axios, setting that header explicitly strips the multipart boundary,
    // causing multer/busboy to fail with 'Multipart: Boundary not found'.
    // Calling axios.post directly without Content-Type lets the browser set the boundary automatically.
    const res = await axios.post('/api/videos/upload', formData, {
      timeout: 180000, // 3 minutes for video processing and AI frame analysis
      onUploadProgress,
    });
    return res.data;
  },
  reprocessVideo: async (videoId: string, incidentNotes?: string): Promise<{ success: boolean; video: VideoRecord; indexed_events_count: number }> => {
    const res = await apiClient.post('/videos/reprocess', { video_id: videoId, incident_notes: incidentNotes });
    return res.data;
  },

  // Events
  getEvents: async (): Promise<CCTVEvent[]> => {
    const res = await apiClient.get('/events');
    return res.data;
  },
  getEvent: async (id: string): Promise<CCTVEvent> => {
    const res = await apiClient.get(`/events/${id}`);
    return res.data;
  },

  // Natural Language Video Search
  searchEvents: async (params: {
    query: string;
    camera_id?: string;
    camera_ids?: string[];
    min_confidence?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<SearchResponse> => {
    const res = await apiClient.post('/search', params);
    return res.data;
  },

  // Vision AI Frame Detection & Interactive Target Refinement
  detectFrame: async (params: {
    video_url?: string;
    current_time_seconds?: number;
    event_id?: string;
    image_base64?: string;
  }): Promise<{ bounding_boxes: any[]; detected_count: number; message?: string }> => {
    const res = await apiClient.post('/vision/detect-frame', params);
    return res.data;
  },
  updateEventBoxes: async (
    eventId: string,
    boxes: any[]
  ): Promise<{ success: boolean; event: CCTVEvent }> => {
    const res = await apiClient.put(`/events/${eventId}/boxes`, { bounding_boxes: boxes });
    return res.data;
  },

  // Indexing status
  getIndexingStatus: async (jobId?: string) => {
    const res = await apiClient.get(jobId ? `/indexing-status/${jobId}` : '/indexing-status');
    return res.data;
  },

  // Search History
  getSearchHistory: async (): Promise<SearchHistoryItem[]> => {
    const res = await apiClient.get('/search/history');
    return res.data;
  },
  clearSearchHistory: async (): Promise<void> => {
    await apiClient.delete('/search/history');
  },
};
