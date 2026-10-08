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
  timeout: 15000,
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
  uploadVideo: async (formData: FormData): Promise<VideoRecord> => {
    const res = await apiClient.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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

  // Search History
  getSearchHistory: async (): Promise<SearchHistoryItem[]> => {
    const res = await apiClient.get('/search/history');
    return res.data;
  },
  clearSearchHistory: async (): Promise<void> => {
    await apiClient.delete('/search/history');
  },
};
