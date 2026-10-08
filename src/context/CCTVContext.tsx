import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  VideoRecord,
  CCTVEvent,
  SearchResultItem,
  SearchHistoryItem,
  SystemSettings,
  ActiveTab,
} from '../types';
import { api } from '../services/api';

interface CCTVContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  cameras: Camera[];
  videos: VideoRecord[];
  events: CCTVEvent[];
  searchHistory: SearchHistoryItem[];
  settings: SystemSettings | null;
  loading: boolean;
  selectedEvidence: SearchResultItem | CCTVEvent | null;
  setSelectedEvidence: (item: SearchResultItem | CCTVEvent | null) => void;
  refreshCameras: () => Promise<void>;
  refreshVideos: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  activeQuery: string;
  setActiveQuery: (q: string) => void;
  searchResults: SearchResultItem[];
  setSearchResults: (res: SearchResultItem[]) => void;
  searchExecutionTime: number;
  answerSummary: string | null;
  triggerSearch: (query: string, cameraId?: string, minConfidence?: number) => Promise<void>;
  isSearching: boolean;
  notification: string | null;
  showNotification: (msg: string) => void;
}

const CCTVContext = createContext<CCTVContextType | undefined>(undefined);

export const CCTVProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [events, setEvents] = useState<CCTVEvent[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEvidence, setSelectedEvidence] = useState<SearchResultItem | CCTVEvent | null>(null);

  // Search state
  const [activeQuery, setActiveQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchExecutionTime, setSearchExecutionTime] = useState<number>(0);
  const [answerSummary, setAnswerSummary] = useState<string | null>(
    'Forensic indexing verified 2 entry occurrences at Gate 1 after 21:00 UTC, including an individual carrying a handheld black duffel bag.'
  );
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const refreshCameras = useCallback(async () => {
    try {
      const data = await api.getCameras();
      setCameras(data);
    } catch (err) {
      console.error('Failed to load cameras', err);
    }
  }, []);

  const refreshVideos = useCallback(async () => {
    try {
      const data = await api.getVideos();
      setVideos(data);
    } catch (err) {
      console.error('Failed to load videos', err);
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      const data = await api.getSearchHistory();
      setSearchHistory(data);
    } catch (err) {
      console.error('Failed to load history', err);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  }, []);

  const triggerSearch = useCallback(
    async (queryText: string, cameraId?: string, minConfidence?: number) => {
      if (!queryText.trim()) return;
      setIsSearching(true);
      setActiveQuery(queryText);
      try {
        const res = await api.searchEvents({
          query: queryText,
          camera_id: cameraId,
          min_confidence: minConfidence ?? (settings?.default_confidence_threshold || 0.55),
        });
        setSearchResults(res.results);
        setSearchExecutionTime(res.execution_time_ms);
        setAnswerSummary(res.answer_summary || null);
        await refreshHistory();
      } catch (err) {
        console.error('Search failed', err);
        showNotification('Search execution failed. Check backend connection.');
      } finally {
        setIsSearching(false);
      }
    },
    [settings?.default_confidence_threshold, refreshHistory]
  );

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const [cams, vids, evts, hist, sett] = await Promise.all([
          api.getCameras().catch(() => []),
          api.getVideos().catch(() => []),
          api.getEvents().catch(() => []),
          api.getSearchHistory().catch(() => []),
          api.getSettings().catch(() => null),
        ]);
        setCameras(cams);
        setVideos(vids);
        setEvents(evts);
        setSearchHistory(hist);
        setSettings(sett);

        // Preload an initial search result for demonstration
        if (evts.length > 0) {
          const initialResults: SearchResultItem[] = evts.slice(0, 4).map((e) => ({
            event_id: e.id,
            camera_id: e.camera_id,
            camera_name: e.camera_name,
            video_id: e.video_id,
            date: e.date,
            start_time: e.start_time,
            end_time: e.end_time,
            timestamp_offset_seconds: e.timestamp_offset_seconds,
            description: e.description,
            confidence: e.confidence,
            similarity_score: 0.94,
            detected_objects: e.detected_objects,
            thumbnail_url: e.thumbnail_url,
            video_url: e.video_url,
            bounding_boxes: e.bounding_boxes,
            metadata: e.metadata,
          }));
          setSearchResults(initialResults);
          setActiveQuery('Did anyone enter through Gate 1 after 9 PM?');
          setSearchExecutionTime(32.4);
        }
      } catch (e) {
        console.error('Initialization error:', e);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  return (
    <CCTVContext.Provider
      value={{
        activeTab,
        setActiveTab,
        cameras,
        videos,
        events,
        searchHistory,
        settings,
        loading,
        selectedEvidence,
        setSelectedEvidence,
        refreshCameras,
        refreshVideos,
        refreshHistory,
        refreshSettings,
        activeQuery,
        setActiveQuery,
        searchResults,
        setSearchResults,
        searchExecutionTime,
        answerSummary,
        triggerSearch,
        isSearching,
        notification,
        showNotification,
      }}
    >
      {children}
    </CCTVContext.Provider>
  );
};

export const useCCTV = () => {
  const context = useContext(CCTVContext);
  if (!context) {
    throw new Error('useCCTV must be used within a CCTVProvider');
  }
  return context;
};
