import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  UploadCloud,
  FileVideo,
  CheckCircle2,
  Clock,
  AlertCircle,
  Video,
  Layers,
  ArrowRight,
  HardDrive,
  Eye,
  Play,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Camera as CameraIcon,
  Check,
  RefreshCw,
  FolderPlus,
  Sliders,
  CheckSquare,
} from 'lucide-react';
import { useCCTV } from '../context/CCTVContext';
import { api } from '../services/api';
import { UploadQueueItem, ProcessingStatus } from '../types';

export const UploadPage: React.FC = () => {
  const {
    cameras,
    videos,
    events,
    refreshVideos,
    refreshEvents,
    refreshCameras,
    showNotification,
    setActiveTab,
    setSelectedEvidence,
    triggerSearch,
  } = useCCTV();

  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState<boolean>(false);
  const [activeConcurrency, setActiveConcurrency] = useState<number>(2);
  const [globalRecordedDate, setGlobalRecordedDate] = useState<string>('2026-10-08');
  const [globalStartTime, setGlobalStartTime] = useState<string>('09:00:00');
  const [globalEndTime, setGlobalEndTime] = useState<string>('10:00:00');
  const [globalIncidentNotes, setGlobalIncidentNotes] = useState<string>('');
  const [lastUploadedResult, setLastUploadedResult] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB per video limit

  const samplePresets = [
    {
      name: 'Main Entrance Gate 1',
      camId: 'CAM-01',
      file: 'gate1_night_20261008.mp4',
      url: '/videos/cctv_gate_night.mp4',
      duration: 12.0,
      size: 42 * 1024 * 1024,
      notes: 'Vehicle entry through North Gate, night surveillance',
    },
    {
      name: 'Underground Parking P1',
      camId: 'CAM-02',
      file: 'parking_lot_bay14.mp4',
      url: '/videos/cctv_parking_lot.mp4',
      duration: 12.0,
      size: 38 * 1024 * 1024,
      notes: 'Vehicle movement and pedestrian transit in basement parking',
    },
    {
      name: 'Corporate Corridor 3B',
      camId: 'CAM-03',
      file: 'corridor_3b_pass.mp4',
      url: '/videos/cctv_corridor_office.mp4',
      duration: 12.0,
      size: 29 * 1024 * 1024,
      notes: 'Personnel walking in hallway carrying bags and briefcase',
    },
    {
      name: 'Warehouse Loading Dock',
      camId: 'CAM-04',
      file: 'loading_dock_freight.mp4',
      url: '/videos/cctv_loading_dock.mp4',
      duration: 12.0,
      size: 45 * 1024 * 1024,
      notes: 'Freight delivery truck and logistics workers handling cargo',
    },
  ];

  const cameraNamePresets = [
    'Main Gate',
    'Parking Lot',
    'Lobby Entrance',
    'Warehouse Dock',
    'Perimeter Fence',
    'Elevator Bay',
    'Server Room',
    'East Corridor',
  ];

  // Helper to suggest next camera ID
  const getNextCameraId = useCallback(
    (offset = 0) => {
      const existingCamNumbers = cameras
        .map((c) => {
          const match = c.camera_id.match(/CAM-(\d+)/i);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((n) => !isNaN(n));

      const queueNumbers = queue
        .map((q) => {
          const match = q.cameraId.match(/CAM-(\d+)/i);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((n) => !isNaN(n));

      const maxNumber = Math.max(0, ...existingCamNumbers, ...queueNumbers);
      return `CAM-${String(maxNumber + 1 + offset).padStart(2, '0')}`;
    },
    [cameras, queue]
  );

  // Helper to suggest camera name from file name
  const suggestCameraName = (filename: string, index = 0): string => {
    const clean = filename.toLowerCase();
    if (clean.includes('gate') || clean.includes('entrance')) return 'Main Entrance Gate';
    if (clean.includes('park') || clean.includes('garage')) return 'Underground Parking';
    if (clean.includes('corridor') || clean.includes('hall') || clean.includes('office')) return 'Executive Corridor';
    if (clean.includes('dock') || clean.includes('freight') || clean.includes('load')) return 'Warehouse Loading Dock';
    if (clean.includes('lobby')) return 'Building Lobby';
    if (clean.includes('fence') || clean.includes('perimeter')) return 'Perimeter Security Fence';
    if (clean.includes('server')) return 'Server Facility Room';
    return cameraNamePresets[index % cameraNamePresets.length] || `Camera Feed ${index + 1}`;
  };

  // Add multiple files into queue
  const addFilesToQueue = (files: File[]) => {
    const newItems: UploadQueueItem[] = [];

    files.forEach((file, idx) => {
      if (file.size > MAX_FILE_SIZE) {
        showNotification(
          `File "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 100MB limit and was skipped.`
        );
        return;
      }

      const assignedId = getNextCameraId(newItems.length);
      const assignedName = suggestCameraName(file.name, queue.length + newItems.length);

      const newItem: UploadQueueItem = {
        id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        file,
        videoName: file.name,
        cameraName: assignedName,
        cameraId: assignedId,
        fileSize: file.size,
        duration: 12.0, // default until probe
        uploadProgress: 0,
        processingProgress: 0,
        status: 'waiting',
        createdAt: new Date().toISOString(),
      };

      // Probe browser video metadata to get exact duration
      try {
        const objectUrl = URL.createObjectURL(file);
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        tempVideo.src = objectUrl;
        tempVideo.onloadedmetadata = () => {
          if (tempVideo.duration && !isNaN(tempVideo.duration)) {
            setQueue((prev) =>
              prev.map((item) =>
                item.id === newItem.id ? { ...item, duration: Number(tempVideo.duration.toFixed(1)) } : item
              )
            );
          }
          URL.revokeObjectURL(objectUrl);
        };
      } catch {
        // keep default
      }

      newItems.push(newItem);
    });

    if (newItems.length > 0) {
      setQueue((prev) => [...prev, ...newItems]);
      showNotification(`Added ${newItems.length} video(s) to multi-camera queue.`);
    }
  };

  // Add all presets at once
  const handleAddAllPresets = () => {
    const newItems: UploadQueueItem[] = samplePresets.map((preset, idx) => ({
      id: `queue_preset_${Date.now()}_${idx}`,
      presetUrl: preset.url,
      videoName: preset.file,
      cameraName: preset.name,
      cameraId: preset.camId,
      fileSize: preset.size,
      duration: preset.duration,
      uploadProgress: 0,
      processingProgress: 0,
      status: 'waiting',
      createdAt: new Date().toISOString(),
    }));

    setQueue((prev) => [...prev, ...newItems]);
    showNotification(`Added all 4 multi-camera CCTV presets to queue.`);
  };

  // Add single preset
  const handleAddSinglePreset = (preset: (typeof samplePresets)[0]) => {
    const newItem: UploadQueueItem = {
      id: `queue_preset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      presetUrl: preset.url,
      videoName: preset.file,
      cameraName: preset.name,
      cameraId: preset.camId,
      fileSize: preset.size,
      duration: preset.duration,
      uploadProgress: 0,
      processingProgress: 0,
      status: 'waiting',
      createdAt: new Date().toISOString(),
    };

    setQueue((prev) => [...prev, newItem]);
    showNotification(`Added "${preset.name}" preset to queue.`);
  };

  // Handle file change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      addFilesToQueue(files);
      e.target.value = '';
    }
  };

  // Drag and drop handler
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|m4v|ts)$/i.test(f.name)
      );
      if (files.length === 0) {
        showNotification('Please drop valid video files (MP4, MOV, MKV, AVI, WebM).');
        return;
      }
      addFilesToQueue(files);
    }
  };

  // Update item field in queue
  const updateQueueItem = (id: string, updates: Partial<UploadQueueItem>) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // Remove item from queue
  const removeQueueItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear completed items
  const clearCompleted = () => {
    setQueue((prev) => prev.filter((item) => item.status !== 'completed'));
    showNotification('Cleared completed items from queue.');
  };

  // Process a single item
  const processQueueItem = async (item: UploadQueueItem): Promise<boolean> => {
    try {
      updateQueueItem(item.id, {
        status: 'uploading',
        uploadProgress: 15,
        processingProgress: 10,
        errorMessage: undefined,
      });

      const formData = new FormData();
      if (item.file) {
        formData.append('video_file', item.file);
      } else if (item.presetUrl) {
        formData.append('preset_video_url', item.presetUrl);
        formData.append('filename', item.videoName);
      }
      formData.append('camera_id', item.cameraId);
      formData.append('camera_name', item.cameraName);
      formData.append('create_camera', 'true');
      formData.append('recorded_date', globalRecordedDate);
      formData.append('recorded_start_time', globalStartTime);
      formData.append('recorded_end_time', globalEndTime);
      if (globalIncidentNotes) {
        formData.append('incident_notes', globalIncidentNotes);
      }

      // Smooth simulation of stages during indexing
      const stageTimer = setInterval(() => {
        setQueue((prev) =>
          prev.map((it) => {
            if (it.id !== item.id) return it;
            if (it.uploadProgress < 100) {
              return { ...it, uploadProgress: Math.min(100, it.uploadProgress + 25) };
            }
            if (it.status === 'uploading') {
              return { ...it, status: 'processing', processingProgress: 40 };
            }
            if (it.status === 'processing') {
              return { ...it, status: 'indexing', processingProgress: 75 };
            }
            return it;
          })
        );
      }, 700);

      const res = await api.uploadVideo(formData, (progressEvt) => {
        const percent = Math.round((progressEvt.loaded * 100) / (progressEvt.total || 1));
        updateQueueItem(item.id, {
          uploadProgress: Math.min(100, percent),
          status: percent >= 100 ? 'processing' : 'uploading',
        });
      });

      clearInterval(stageTimer);

      updateQueueItem(item.id, {
        status: 'completed',
        uploadProgress: 100,
        processingProgress: 100,
        uploadedVideoId: res.id,
        indexedEventsCount: res.indexed_events_count || (res as any).indexed_events?.length || 0,
        thumbnailUrl: res.thumbnail_url,
        videoUrl: res.video_url,
      });

      setLastUploadedResult(res);
      await Promise.all([refreshVideos(), refreshEvents(), refreshCameras()]);
      return true;
    } catch (err: any) {
      console.error(`Error processing ${item.videoName}:`, err);
      let errMsg = err?.response?.data?.error || err?.message || 'Processing failed';
      if (err?.response?.status === 413 || String(errMsg).includes('413')) {
        errMsg = 'File size exceeds 100MB limit.';
      }

      updateQueueItem(item.id, {
        status: 'failed',
        errorMessage: typeof errMsg === 'string' ? errMsg : 'Processing error',
        uploadProgress: 0,
        processingProgress: 0,
      });
      return false;
    }
  };

  // Process all waiting / failed items in parallel with concurrency
  const handleStartProcessAll = async () => {
    const pendingItems = queue.filter(
      (item) => item.status === 'waiting' || item.status === 'failed'
    );
    if (pendingItems.length === 0) {
      showNotification('No pending videos to process in queue.');
      return;
    }

    setIsProcessingQueue(true);

    // Concurrency pool (process up to activeConcurrency items simultaneously)
    const itemsToProcess = [...pendingItems];
    let currentIndex = 0;

    const worker = async () => {
      while (currentIndex < itemsToProcess.length) {
        const item = itemsToProcess[currentIndex++];
        if (item) {
          await processQueueItem(item);
        }
      }
    };

    const workers = Array.from({ length: Math.min(activeConcurrency, itemsToProcess.length) }, () =>
      worker()
    );
    await Promise.all(workers);

    setIsProcessingQueue(false);
    await Promise.all([refreshVideos(), refreshEvents(), refreshCameras()]);
    showNotification('Completed multi-camera video queue processing.');
  };

  // Reprocess single item without re-uploading
  const handleReprocessItem = async (item: UploadQueueItem) => {
    if (!item.uploadedVideoId) {
      // Re-upload from scratch
      await processQueueItem(item);
      return;
    }

    try {
      updateQueueItem(item.id, {
        status: 'processing',
        processingProgress: 40,
        errorMessage: undefined,
      });

      const res = await api.reprocessVideo(item.uploadedVideoId, globalIncidentNotes);

      updateQueueItem(item.id, {
        status: 'completed',
        processingProgress: 100,
        indexedEventsCount: res.indexed_events_count,
        thumbnailUrl: res.video.thumbnail_url,
      });

      await Promise.all([refreshVideos(), refreshEvents(), refreshCameras()]);
      showNotification(`Reprocessed ${item.cameraName} (${res.indexed_events_count} events).`);
    } catch (err: any) {
      updateQueueItem(item.id, {
        status: 'failed',
        errorMessage: err?.response?.data?.error || err?.message || 'Reprocessing failed',
      });
      showNotification('Failed to reprocess video.');
    }
  };

  // Metrics calculations
  const totalQueueCount = queue.length;
  const completedCount = queue.filter((i) => i.status === 'completed').length;
  const failedCount = queue.filter((i) => i.status === 'failed').length;
  const inFlightCount = queue.filter(
    (i) => i.status === 'uploading' || i.status === 'processing' || i.status === 'indexing'
  ).length;

  const overallUploadProgress =
    totalQueueCount === 0
      ? 0
      : Math.round(
          queue.reduce((acc, item) => acc + (item.uploadProgress || 0), 0) / totalQueueCount
        );

  const overallProcessingProgress =
    totalQueueCount === 0
      ? 0
      : Math.round(
          queue.reduce((acc, item) => acc + (item.processingProgress || 0), 0) / totalQueueCount
        );

  const totalUploadedCamerasCount = cameras.filter((c) => c.is_uploaded).length;
  const totalIndexedEventsCount = events.length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-100 tracking-tight flex items-center gap-2">
            <span>Multi-Camera Video Upload</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/80">
              Parallel Ingestion
            </span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Upload and process multiple CCTV video files simultaneously. Each video is indexed as an independent camera channel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('camera-dashboard')}
            className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700 text-xs rounded-lg transition-colors flex items-center gap-1.5"
          >
            <CameraIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>View Camera Dashboard</span>
          </button>
        </div>
      </div>

      {/* Top Level Metric Cards (Requirement: Show UI metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-lg bg-neutral-900/60 border border-neutral-800 space-y-1">
          <span className="text-[11px] font-medium text-neutral-400">In Queue</span>
          <div className="text-xl font-bold font-mono text-neutral-100 tabular-nums">
            {totalQueueCount}
          </div>
          <span className="text-[10px] text-neutral-500">{inFlightCount} in flight</span>
        </div>

        <div className="p-3.5 rounded-lg bg-neutral-900/60 border border-neutral-800 space-y-1">
          <span className="text-[11px] font-medium text-neutral-400">Completed</span>
          <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
            {completedCount}
          </div>
          <span className="text-[10px] text-neutral-500">{failedCount} failed</span>
        </div>

        <div className="p-3.5 rounded-lg bg-neutral-900/60 border border-neutral-800 space-y-1">
          <span className="text-[11px] font-medium text-neutral-400">Overall Upload</span>
          <div className="text-xl font-bold font-mono text-sky-400 tabular-nums">
            {overallUploadProgress}%
          </div>
          <div className="w-full bg-neutral-950 h-1 rounded-full overflow-hidden mt-1">
            <div
              className="bg-sky-500 h-full transition-all duration-300"
              style={{ width: `${overallUploadProgress}%` }}
            />
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-neutral-900/60 border border-neutral-800 space-y-1">
          <span className="text-[11px] font-medium text-neutral-400">Overall Processing</span>
          <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
            {overallProcessingProgress}%
          </div>
          <div className="w-full bg-neutral-950 h-1 rounded-full overflow-hidden mt-1">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${overallProcessingProgress}%` }}
            />
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-neutral-900/60 border border-neutral-800 space-y-1">
          <span className="text-[11px] font-medium text-neutral-400">Uploaded Cameras</span>
          <div className="text-xl font-bold font-mono text-neutral-100 tabular-nums">
            {totalUploadedCamerasCount || cameras.length}
          </div>
          <span className="text-[10px] text-neutral-500">{cameras.length} registered</span>
        </div>

        <div className="p-3.5 rounded-lg bg-neutral-900/60 border border-neutral-800 space-y-1">
          <span className="text-[11px] font-medium text-neutral-400">Total Indexed Events</span>
          <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
            {totalIndexedEventsCount}
          </div>
          <span className="text-[10px] text-neutral-500">Vector search ready</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Left Section: Upload Dropzone + Queue (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Multi-file Drag & Drop Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all border-neutral-800 bg-neutral-900/40 hover:border-emerald-600/60 hover:bg-neutral-900/70 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*,.mp4,.mov,.avi,.mkv,.webm,.m4v,.ts"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 group-hover:border-emerald-500/50 flex items-center justify-center text-neutral-400 group-hover:text-emerald-400 transition-colors mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-semibold text-neutral-200">
              Drag & Drop Multiple CCTV Videos Here, or Click to Browse
            </h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-md">
              Select 1 to 10+ video files simultaneously. Supports MP4, MOV, AVI, MKV, WebM up to 100MB per file.
            </p>
            <div className="flex items-center gap-2 mt-4 text-[11px] text-neutral-500 font-mono">
              <span>Automatic Camera ID assignment</span>
              <span>·</span>
              <span>Independent processing</span>
            </div>
          </div>

          {/* Quick Test Presets Bar */}
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Quick Test Footage Presets (4 Independent Cameras)
              </div>
              <button
                type="button"
                onClick={handleAddAllPresets}
                className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-[11px] font-medium transition-colors flex items-center gap-1 border border-neutral-700"
              >
                <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add All 4 Presets to Queue</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {samplePresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddSinglePreset(preset)}
                  className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 text-left transition-all space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-emerald-400 font-semibold">{preset.camId}</span>
                    <span className="text-[10px] text-neutral-500 font-mono">{preset.duration}s</span>
                  </div>
                  <div className="text-xs font-medium text-neutral-200 truncate">{preset.name}</div>
                  <div className="text-[10px] text-neutral-500 truncate">{preset.file}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Global Recording Settings (Applied to Queue) */}
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Batch Metadata Settings (Applied to Uploaded Cameras)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-400">Recording Date</label>
                <input
                  type="date"
                  value={globalRecordedDate}
                  onChange={(e) => setGlobalRecordedDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 font-mono focus:outline-none focus:border-neutral-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-400">Recording Window</label>
                <div className="flex items-center gap-1">
                  <input
                    type="time"
                    step="1"
                    value={globalStartTime}
                    onChange={(e) => setGlobalStartTime(e.target.value)}
                    className="w-full px-2 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 font-mono text-center"
                  />
                  <span className="text-neutral-500">-</span>
                  <input
                    type="time"
                    step="1"
                    value={globalEndTime}
                    onChange={(e) => setGlobalEndTime(e.target.value)}
                    className="w-full px-2 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 font-mono text-center"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-400">Concurrency Level</label>
                <select
                  value={activeConcurrency}
                  onChange={(e) => setActiveConcurrency(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 font-mono"
                >
                  <option value={1}>1 Video at a time (Sequential)</option>
                  <option value={2}>2 Videos in Parallel (Recommended)</option>
                  <option value={3}>3 Videos in Parallel (Fast)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-medium text-neutral-400">
                Surveillance Activity Notes (Optional Guidance for All Videos)
              </label>
              <input
                type="text"
                value={globalIncidentNotes}
                onChange={(e) => setGlobalIncidentNotes(e.target.value)}
                placeholder="e.g. Ingesting footage for multi-zone security inspection"
                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-700"
              />
            </div>
          </div>

          {/* Upload Queue Section (Requirement: Display Upload Queue) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                  <span>Upload Queue</span>
                  <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono text-[11px]">
                    {queue.length}
                  </span>
                </h2>
                {isProcessingQueue && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Processing in Parallel...</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => addMoreInputRef.current?.click()}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-800 text-xs rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Add More Videos</span>
                </button>
                <input
                  ref={addMoreInputRef}
                  type="file"
                  multiple
                  accept="video/*,.mp4,.mov,.avi,.mkv,.webm,.m4v,.ts"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {completedCount > 0 && (
                  <button
                    type="button"
                    onClick={clearCompleted}
                    className="px-2.5 py-1.5 text-neutral-400 hover:text-white text-xs transition-colors"
                  >
                    Clear Completed
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleStartProcessAll}
                  disabled={isProcessingQueue || queue.length === 0}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-600 text-neutral-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {isProcessingQueue ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                      <span>Processing ({inFlightCount} active)...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Start Processing All ({queue.filter((i) => i.status !== 'completed').length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {queue.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-neutral-900/30 border border-neutral-800 text-neutral-400 space-y-2">
                <Video className="w-8 h-8 text-neutral-600 mx-auto" />
                <div className="text-xs font-semibold text-neutral-300">Queue is empty</div>
                <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
                  Drag and drop CCTV video files above, select files with the browser, or click "Add All 4 Presets" to test multi-camera ingestion.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {queue.map((item, idx) => {
                  const statusColors: Record<ProcessingStatus, { bg: string; text: string; border: string }> = {
                    waiting: { bg: 'bg-neutral-800/80', text: 'text-neutral-300', border: 'border-neutral-700' },
                    uploading: { bg: 'bg-sky-950/80', text: 'text-sky-300', border: 'border-sky-800' },
                    processing: { bg: 'bg-amber-950/80', text: 'text-amber-300', border: 'border-amber-800' },
                    indexing: { bg: 'bg-purple-950/80', text: 'text-purple-300', border: 'border-purple-800' },
                    completed: { bg: 'bg-emerald-950/80', text: 'text-emerald-300', border: 'border-emerald-800' },
                    failed: { bg: 'bg-red-950/80', text: 'text-red-300', border: 'border-red-800' },
                  };

                  const currentStyle = statusColors[item.status] || statusColors.waiting;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-all ${
                        item.status === 'completed'
                          ? 'bg-neutral-900/60 border-emerald-900/40'
                          : item.status === 'failed'
                          ? 'bg-red-950/20 border-red-900/50'
                          : item.status === 'uploading' || item.status === 'processing' || item.status === 'indexing'
                          ? 'bg-neutral-900/90 border-neutral-700 shadow-md'
                          : 'bg-neutral-900/40 border-neutral-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        {/* Left: Video details + Camera Assignment */}
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-200">
                              #{idx + 1}
                            </span>

                            {/* Camera ID (Editable) */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-neutral-500 font-mono">ID:</span>
                              <input
                                type="text"
                                value={item.cameraId}
                                disabled={item.status === 'uploading' || item.status === 'processing' || item.status === 'indexing'}
                                onChange={(e) => updateQueueItem(item.id, { cameraId: e.target.value.toUpperCase() })}
                                className="w-20 px-2 py-0.5 bg-neutral-950 border border-neutral-800 rounded font-mono text-xs font-semibold text-emerald-400 focus:outline-none focus:border-neutral-600 disabled:opacity-70"
                              />
                            </div>

                            {/* Camera Name (Editable inline before processing) */}
                            <div className="flex items-center gap-1 flex-1 min-w-[200px]">
                              <span className="text-[10px] text-neutral-500 font-mono">Name:</span>
                              <input
                                type="text"
                                value={item.cameraName}
                                disabled={item.status === 'uploading' || item.status === 'processing' || item.status === 'indexing'}
                                onChange={(e) => updateQueueItem(item.id, { cameraName: e.target.value })}
                                placeholder="Assign Camera Name (e.g. Main Gate)"
                                className="w-full max-w-xs px-2 py-0.5 bg-neutral-950 border border-neutral-800 rounded text-xs font-medium text-neutral-100 focus:outline-none focus:border-neutral-600 disabled:opacity-70"
                              />
                            </div>

                            {/* Status Badge */}
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase border ${currentStyle.bg} ${currentStyle.text} ${currentStyle.border}`}
                            >
                              {item.status}
                            </span>
                          </div>

                          {/* Quick suggestions for Camera Name */}
                          {item.status === 'waiting' && (
                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                              <span className="text-[10px] text-neutral-500">Quick Name:</span>
                              {cameraNamePresets.slice(0, 4).map((presetName, pIdx) => (
                                <button
                                  key={pIdx}
                                  type="button"
                                  onClick={() => updateQueueItem(item.id, { cameraName: presetName })}
                                  className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
                                >
                                  {presetName}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Video metadata row */}
                          <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-400">
                            <span className="truncate max-w-[200px] text-neutral-300 font-medium">
                              {item.videoName}
                            </span>
                            <span>·</span>
                            <span>{(item.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                            <span>·</span>
                            <span>{item.duration.toFixed(1)}s duration</span>
                            {item.indexedEventsCount !== undefined && (
                              <>
                                <span>·</span>
                                <span className="text-emerald-400 font-semibold">
                                  {item.indexedEventsCount} events indexed
                                </span>
                              </>
                            )}
                          </div>

                          {/* Error message if failed */}
                          {item.errorMessage && (
                            <div className="text-[11px] text-red-400 bg-red-950/40 border border-red-900/60 rounded p-2 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{item.errorMessage}</span>
                            </div>
                          )}
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {item.status === 'waiting' && (
                            <button
                              type="button"
                              onClick={() => processQueueItem(item)}
                              disabled={isProcessingQueue}
                              className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-medium rounded transition-colors"
                            >
                              Process
                            </button>
                          )}

                          {item.status === 'failed' && (
                            <button
                              type="button"
                              onClick={() => processQueueItem(item)}
                              className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-medium rounded transition-colors flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Retry</span>
                            </button>
                          )}

                          {item.status === 'completed' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleReprocessItem(item)}
                                className="px-2.5 py-1 rounded bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs transition-colors flex items-center gap-1"
                                title="Reprocess this video without re-uploading"
                              >
                                <RefreshCw className="w-3 h-3 text-emerald-400" />
                                <span>Reprocess</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedEvidence({
                                    id: `queue_${item.id}`,
                                    camera_id: item.cameraId,
                                    camera_name: item.cameraName,
                                    video_id: item.uploadedVideoId || item.id,
                                    date: globalRecordedDate,
                                    start_time: globalStartTime,
                                    end_time: globalEndTime,
                                    timestamp_offset_seconds: 0,
                                    description: `Playback of uploaded CCTV footage for ${item.cameraName} (${item.cameraId})`,
                                    detected_objects: ['person', 'vehicle'],
                                    confidence: 0.95,
                                    thumbnail_url: item.thumbnailUrl || '/thumbnails/corridor_2s.jpg',
                                    video_url: item.videoUrl || item.presetUrl || '/videos/cctv_gate_night.mp4',
                                    bounding_boxes: [],
                                  });
                                }}
                                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded transition-colors flex items-center gap-1"
                              >
                                <Play className="w-3 h-3" />
                                <span>Play</span>
                              </button>
                            </>
                          )}

                          {item.status !== 'uploading' && item.status !== 'processing' && item.status !== 'indexing' && (
                            <button
                              type="button"
                              onClick={() => removeQueueItem(item.id)}
                              className="p-1 rounded text-neutral-500 hover:text-red-400 transition-colors"
                              title="Remove from queue"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Progress bar per item (Requirement: Individual Upload Progress & Status) */}
                      {(item.status === 'uploading' ||
                        item.status === 'processing' ||
                        item.status === 'indexing') && (
                        <div className="space-y-1.5 pt-3 border-t border-neutral-800/80 mt-2">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-neutral-400">
                              {item.status === 'uploading'
                                ? 'Uploading footage...'
                                : item.status === 'processing'
                                ? 'Extracting frames with FFmpeg...'
                                : 'Analyzing objects with Computer Vision...'}
                            </span>
                            <span className="text-emerald-400 font-semibold tabular-nums">
                              {item.status === 'uploading'
                                ? `${item.uploadProgress}%`
                                : `${item.processingProgress}%`}
                            </span>
                          </div>
                          <div className="w-full bg-neutral-950 h-1.5 rounded-full overflow-hidden border border-neutral-800">
                            <div
                              className="bg-emerald-500 h-full transition-all duration-300"
                              style={{
                                width: `${
                                  item.status === 'uploading'
                                    ? item.uploadProgress
                                    : item.processingProgress
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Forensic Result Card from last upload */}
          {lastUploadedResult && (
            <div className="p-6 rounded-xl bg-neutral-900/90 border border-emerald-800/80 space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Camera Channel Successfully Indexed
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      Channel: {lastUploadedResult.camera_id} · {lastUploadedResult.camera_name || 'Assigned Camera'} · {lastUploadedResult.indexed_events_count || lastUploadedResult.indexed_events?.length || 0} Keyframe Events Generated
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerSearch(
                        `What activity was recorded in ${lastUploadedResult.camera_id}?`,
                        lastUploadedResult.camera_id
                      );
                      setActiveTab('search');
                    }}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded transition-colors flex items-center gap-1.5"
                  >
                    <span>Search This Camera</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cataloged Cameras & Footage Archive (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-100">All Registered Cameras</h2>
            <span className="text-xs text-neutral-500 font-mono tabular-nums">
              {cameras.length} channels
            </span>
          </div>

          <div className="space-y-3">
            {cameras.map((cam) => (
              <div
                key={cam.id}
                onClick={() => {
                  setSelectedEvidence({
                    id: `cam_${cam.id}`,
                    camera_id: cam.camera_id,
                    camera_name: cam.name,
                    video_id: 'cam_feed',
                    date: cam.upload_date || '2026-10-08',
                    start_time: '09:00:00',
                    end_time: '10:00:00',
                    timestamp_offset_seconds: 0,
                    description: `Live video stream / recording for ${cam.name} (${cam.location})`,
                    detected_objects: ['person', 'security'],
                    confidence: 0.95,
                    thumbnail_url: cam.thumbnail_url || '/thumbnails/gate_2s.jpg',
                    video_url: cam.video_url || '/videos/cctv_gate_night.mp4',
                    bounding_boxes: [],
                  });
                }}
                className="group cursor-pointer p-3.5 rounded-lg bg-neutral-900/40 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/70 transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-neutral-200 truncate max-w-[180px] group-hover:text-white flex items-center gap-1.5">
                      <Play className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{cam.name}</span>
                    </div>
                    <div className="text-[11px] font-mono text-neutral-400">
                      ID: {cam.camera_id} · {cam.location}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-[10px] font-mono font-medium">
                    {cam.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-800/60 font-mono tabular-nums">
                  <span>{cam.event_count} events indexed</span>
                  <span className="text-neutral-400 group-hover:text-neutral-200">
                    Watch Stream →
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={() => setActiveTab('camera-dashboard')}
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 hover:text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <CameraIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Open Dedicated Camera Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
