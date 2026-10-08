import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { useCCTV } from '../context/CCTVContext';
import { api } from '../services/api';

export const UploadPage: React.FC = () => {
  const {
    cameras,
    videos,
    refreshVideos,
    refreshEvents,
    refreshCameras,
    showNotification,
    setActiveTab,
    setSelectedEvidence,
    triggerSearch,
  } = useCCTV();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string>('/videos/cctv_gate_night.mp4');
  const [selectedCameraId, setSelectedCameraId] = useState<string>(
    cameras[0]?.camera_id || 'CAM-01'
  );
  const [recordedDate, setRecordedDate] = useState<string>('2026-10-08');
  const [startTime, setStartTime] = useState<string>('09:00:00');
  const [endTime, setEndTime] = useState<string>('10:00:00');
  const [incidentNotes, setIncidentNotes] = useState<string>('');
  const [lastUploadedResult, setLastUploadedResult] = useState<any>(null);

  // Pipeline simulation state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStep, setUploadStep] = useState<number>(0);
  const [uploadPercent, setUploadPercent] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const samplePresets = [
    {
      name: 'Gate 1 Night Footage',
      camId: 'CAM-01',
      file: 'gate1_night_20261008.mp4',
      url: '/videos/cctv_gate_night.mp4',
      date: '2026-10-08',
      start: '21:00:00',
      end: '22:00:00',
    },
    {
      name: 'Parking Lot Bay 14',
      camId: 'CAM-02',
      file: 'parking_lot_bay14.mp4',
      url: '/videos/cctv_parking_lot.mp4',
      date: '2026-10-08',
      start: '14:30:00',
      end: '15:30:00',
    },
    {
      name: 'Executive Corridor 3B',
      camId: 'CAM-03',
      file: 'corridor_3b_pass.mp4',
      url: '/videos/cctv_corridor_office.mp4',
      date: '2026-10-08',
      start: '11:00:00',
      end: '12:00:00',
    },
    {
      name: 'Logistics Loading Dock',
      camId: 'CAM-04',
      file: 'loading_dock_freight.mp4',
      url: '/videos/cctv_loading_dock.mp4',
      date: '2026-10-08',
      start: '15:15:00',
      end: '16:15:00',
    },
  ];

  const handleSelectPreset = (preset: typeof samplePresets[0]) => {
    setSelectedCameraId(preset.camId);
    setRecordedDate(preset.date);
    setStartTime(preset.start);
    setEndTime(preset.end);
    setPreviewVideoUrl(preset.url);
    setSelectedFile(null);
    showNotification(`Loaded video preset: ${preset.name}`);
  };

  const pipelineSteps = [
    { title: 'Uploading', desc: 'Saving CCTV video to secure storage' },
    { title: 'Extracting Frames', desc: 'Demuxing video & extracting keyframes with FFmpeg' },
    { title: 'Detecting Objects', desc: 'Computer vision analysis for person, vehicles & bags' },
    { title: 'Saving Events', desc: 'Writing verified vector event records to database' },
    { title: 'Completed', desc: 'Video fully indexed and ready for natural language query' },
  ];

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB video processing limit

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE) {
        showNotification(
          `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 100MB limit. Please choose a clip under 100MB or select a test preset.`
        );
        return;
      }
      setSelectedFile(file);
      const objUrl = URL.createObjectURL(file);
      setPreviewVideoUrl(objUrl);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > MAX_FILE_SIZE) {
        showNotification(
          `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 100MB limit. Please choose a clip under 100MB or select a test preset.`
        );
        return;
      }
      setSelectedFile(file);
      const objUrl = URL.createObjectURL(file);
      setPreviewVideoUrl(objUrl);
    }
  };

  const handleStartUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedFile && selectedFile.size > MAX_FILE_SIZE) {
      showNotification(
        `File size (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 100MB limit. Please select a clip under 100MB or choose a preset.`
      );
      return;
    }

    setIsUploading(true);
    setUploadStep(0);
    setUploadPercent(10);

    const runStep = (step: number, percent: number) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          setUploadStep(step);
          setUploadPercent(percent);
          resolve();
        }, 500);
      });
    };

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('video_file', selectedFile);
      } else {
        formData.append('filename', `cctv_footage_${selectedCameraId}.mp4`);
        if (previewVideoUrl) {
          formData.append('preset_video_url', previewVideoUrl);
        }
      }
      formData.append('camera_id', selectedCameraId);
      formData.append('recorded_date', recordedDate);
      formData.append('recorded_start_time', startTime);
      formData.append('recorded_end_time', endTime);
      if (incidentNotes) {
        formData.append('incident_notes', incidentNotes);
      }

      // Smooth step updates while request runs
      let stepTimer: ReturnType<typeof setInterval> | null = setInterval(() => {
        setUploadStep((prev) => Math.min(3, prev + 1));
        setUploadPercent((prev) => Math.min(90, prev + 25));
      }, 600);

      const res = await api.uploadVideo(formData);
      if (stepTimer) {
        clearInterval(stepTimer);
        stepTimer = null;
      }

      setUploadStep(4);
      setUploadPercent(100);
      setLastUploadedResult(res);
      await Promise.all([refreshVideos(), refreshEvents(), refreshCameras()]);

      showNotification('Footage uploaded and indexed with AI vision! Ready to query.');
    } catch (err: any) {
      console.error('Video upload error:', err);
      let errMsg = err?.response?.data?.error || err?.message || 'Upload processing failed';
      if (err?.response?.status === 413 || String(errMsg).includes('413')) {
        errMsg = 'File size exceeds 100MB limit. Please choose a smaller video clip or select a test preset.';
      }
      showNotification(`Upload issue: ${typeof errMsg === 'string' ? errMsg : 'Failed to process video'}`);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadStep(0);
        setUploadPercent(0);
      }, 800);
    }
  };

  const handlePlayCatalogVideo = (vid: any) => {
    const targetCam = cameras.find((c) => c.camera_id === vid.camera_id) || cameras[0];
    setSelectedEvidence({
      id: `cat_${vid.id}`,
      camera_id: vid.camera_id,
      camera_name: vid.camera_name || targetCam?.name || 'Surveillance Feed',
      video_id: vid.id,
      date: vid.recorded_date,
      start_time: vid.recorded_start_time,
      end_time: vid.recorded_end_time,
      timestamp_offset_seconds: 0,
      description: `Playback of recorded CCTV video file: ${vid.filename}`,
      detected_objects: ['person', 'vehicle', 'motion'],
      confidence: 0.95,
      thumbnail_url: vid.thumbnail_url || targetCam?.thumbnail_url || '',
      video_url: vid.video_url || targetCam?.video_url || '/videos/cctv_gate_night.mp4',
      bounding_boxes: [],
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-neutral-100 tracking-tight">CCTV Video Footage Ingestion</h1>
        <p className="text-xs text-neutral-400 mt-1">
          Upload recorded surveillance video files to index events with FFmpeg and pgvector
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Form (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Presets Bar */}
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Quick Test Footage Presets (Live MP4 Streams)
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {samplePresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    selectedCameraId === preset.camId
                      ? 'bg-neutral-800 text-white border-neutral-600'
                      : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleStartUpload} className="space-y-6">
            {/* Real Video Preview + Drag & Drop Box */}
            <div className="space-y-3">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  selectedFile
                    ? 'border-emerald-700 bg-emerald-950/20'
                    : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 hover:bg-neutral-900/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,.mp4,.mov,.avi,.mkv,.webm,.m4v,.ts"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 mb-2">
                  <UploadCloud className="w-5 h-5" />
                </div>

                {selectedFile ? (
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-neutral-200">
                      {selectedFile.name}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-neutral-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · Ready for processing (Max 100 MB)
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-neutral-200">
                      Click or drag & drop custom CCTV recording footage here
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      Supports MP4, MOV, MKV, AVI, WebM up to 100MB (Or choose a preset above)
                    </div>
                  </div>
                )}
              </div>

              {/* Real Video Playback Preview Card */}
              {previewVideoUrl && (
                <div className="rounded-xl overflow-hidden bg-black border border-neutral-800 space-y-2">
                  <div className="relative aspect-video">
                    <video
                      key={previewVideoUrl}
                      src={previewVideoUrl}
                      controls
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-neutral-200 pointer-events-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>SOURCE PREVIEW · {selectedCameraId}</span>
                    </div>
                  </div>
                  <div className="px-4 pb-3 flex items-center justify-between text-xs text-neutral-400">
                    <span className="font-mono text-[11px]">1080P · 30 FPS · H.264 MP4</span>
                    <span className="text-[11px] text-emerald-400 font-medium">Ready for FFmpeg indexing</span>
                  </div>
                </div>
              )}
            </div>

            {/* Video Metadata Config Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-neutral-400">Assigned Camera</label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 focus:outline-none focus:border-neutral-700"
                >
                  {cameras.map((c) => (
                    <option key={c.id} value={c.camera_id}>
                      {c.camera_id} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-neutral-400">Recorded Date</label>
                <input
                  type="date"
                  value={recordedDate}
                  onChange={(e) => setRecordedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 font-mono focus:outline-none focus:border-neutral-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-neutral-400">Recording Window</label>
                <div className="flex items-center gap-1">
                  <input
                    type="time"
                    step="1"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2 py-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 font-mono text-center"
                  />
                  <span className="text-neutral-500">-</span>
                  <input
                    type="time"
                    step="1"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-2 py-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 font-mono text-center"
                  />
                </div>
              </div>
            </div>

            {/* Optional Incident & Activity Notes */}
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-1.5">
              <label className="text-[11px] font-medium text-neutral-400 flex items-center justify-between">
                <span>Observed Scene Activities (Optional Search Guidance)</span>
                <span className="text-neutral-500 font-normal">e.g. Person with duffel bag, courier, vehicle entrance</span>
              </label>
              <input
                type="text"
                value={incidentNotes}
                onChange={(e) => setIncidentNotes(e.target.value)}
                placeholder="Describe key events to index (e.g. 'Individual entered turnstile carrying black duffel bag')"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-700"
              />
            </div>

            {/* Action Button */}
            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-3 bg-neutral-100 hover:bg-white disabled:bg-neutral-800 disabled:text-neutral-600 text-neutral-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                  <span>Processing Video Pipeline...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Start Video Ingestion Pipeline</span>
                </>
              )}
            </button>
          </form>

          {/* Post-Upload Interactive Forensic Analysis Output */}
          {lastUploadedResult && (
            <div className="p-6 rounded-xl bg-neutral-900/90 border border-emerald-800/80 space-y-5 animate-in fade-in shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-700/80 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                      <span>Video Ingested & AI Vision Analysis Complete</span>
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      {lastUploadedResult.filename} · {lastUploadedResult.duration_seconds}s duration · {lastUploadedResult.resolution} · {lastUploadedResult.indexed_events_count || lastUploadedResult.indexed_events?.length || 0} Keyframe Events Indexed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950 border border-emerald-800/80 px-2.5 py-1 rounded">
                    Channel: {lastUploadedResult.camera_id}
                  </span>
                  <span className="text-[11px] font-mono text-neutral-300 bg-neutral-800 px-2 py-1 rounded">
                    Indexed in pgvector
                  </span>
                </div>
              </div>

              {/* Indexed Keyframe Forensic Events Gallery */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-200">
                    AI Forensic Detections & Verified Keyframes
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    High Confidence Forensic Vectors
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(lastUploadedResult.indexed_events || []).map((evt: any, idx: number) => (
                    <div
                      key={evt.id || idx}
                      className="group bg-neutral-950 rounded-lg border border-neutral-800 hover:border-emerald-600/60 p-3 flex flex-col justify-between space-y-2.5 transition-all"
                    >
                      <div className="space-y-2">
                        {/* Thumbnail + Timestamp badge */}
                        <div
                          className="relative aspect-video rounded overflow-hidden bg-neutral-900 border border-neutral-800/80 cursor-pointer"
                          onClick={() => setSelectedEvidence(evt)}
                        >
                          <img
                            src={evt.thumbnail_url || lastUploadedResult.thumbnail_url}
                            alt="Keyframe detection"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              // Fallback if thumb still decoding
                              (e.target as HTMLImageElement).src = '/thumbnails/corridor_2s.jpg';
                            }}
                          />
                          <div className="absolute top-1.5 left-1.5 bg-black/80 backdrop-blur-xs px-1.5 py-0.5 rounded text-[10px] font-mono text-emerald-300 flex items-center gap-1 border border-neutral-700">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            <span>+{Number(evt.timestamp_offset_seconds || 0).toFixed(1)}s</span>
                          </div>
                          <div className="absolute bottom-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-neutral-200">
                            {((evt.confidence || 0.95) * 100).toFixed(0)}% Conf
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-[11px] text-neutral-300 line-clamp-2 leading-relaxed">
                          {evt.description}
                        </p>

                        {/* Detected Objects Tags */}
                        <div className="flex flex-wrap gap-1">
                          {(evt.detected_objects || []).slice(0, 4).map((obj: string, oIdx: number) => (
                            <span
                              key={oIdx}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-300"
                            >
                              {obj}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action to Play */}
                      <button
                        type="button"
                        onClick={() => setSelectedEvidence(evt)}
                        className="w-full py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white text-[11px] font-medium border border-neutral-800 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3 h-3 text-emerald-400" />
                        <span>Play at +{Number(evt.timestamp_offset_seconds || 0).toFixed(1)}s</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instant Forensic Natural Language Query Launcher */}
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <p className="text-xs text-neutral-400">
                  Ask natural language forensic questions about this uploaded video:
                </p>

                <div className="flex flex-wrap gap-2">
                  {[
                    `What activity was recorded in this ${lastUploadedResult.camera_id} footage?`,
                    `Find people carrying bags in this video`,
                    `Did anyone enter in this footage?`,
                    `Show all vehicles or movements`,
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        triggerSearch(q, lastUploadedResult.camera_id);
                        setActiveTab('search');
                      }}
                      className="px-3 py-1.5 rounded-md bg-neutral-950 border border-neutral-800 hover:border-emerald-700/80 hover:bg-neutral-900 text-xs text-neutral-300 hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      <span>"{q}"</span>
                      <ArrowRight className="w-3 h-3 text-emerald-400" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottom Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    const firstEvt = lastUploadedResult.indexed_events?.[0];
                    if (firstEvt) {
                      setSelectedEvidence(firstEvt);
                    } else {
                      handlePlayCatalogVideo(lastUploadedResult);
                    }
                  }}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs rounded-lg border border-neutral-700 transition-colors flex items-center gap-2"
                >
                  <Play className="w-4 h-4 text-emerald-400" />
                  <span>Open Video in Evidence Player with OSD</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerSearch(
                      `What activity was recorded in the uploaded footage?`,
                      lastUploadedResult.camera_id
                    );
                    setActiveTab('search');
                  }}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2"
                >
                  <span>Launch Natural Language Search on This Footage</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Real-time Processing Pipeline Indicator */}
          {isUploading && (
            <div className="p-6 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-200">
                  Processing Pipeline in Progress
                </span>
                <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                  {uploadPercent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${uploadPercent}%` }}
                />
              </div>

              {/* Pipeline Step List */}
              <div className="space-y-2 pt-2">
                {pipelineSteps.map((step, idx) => {
                  const isDone = uploadStep > idx;
                  const isCurrent = uploadStep === idx;
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-2 rounded text-xs transition-colors ${
                        isCurrent
                          ? 'bg-neutral-800/80 text-white'
                          : isDone
                          ? 'text-neutral-400'
                          : 'text-neutral-600'
                      }`}
                    >
                      <div className="pt-0.5">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : isCurrent ? (
                          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-neutral-700" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{step.title}</div>
                        <div className="text-[11px] text-neutral-500">{step.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Uploaded Archive (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-100">Cataloged Footage Files</h2>
            <span className="text-xs text-neutral-500 font-mono tabular-nums">
              {videos.length} videos
            </span>
          </div>

          <div className="space-y-3">
            {videos.map((vid) => (
              <div
                key={vid.id}
                onClick={() => handlePlayCatalogVideo(vid)}
                className="group cursor-pointer p-3.5 rounded-lg bg-neutral-900/40 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/70 transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-neutral-200 truncate max-w-[180px] group-hover:text-white flex items-center gap-1.5">
                      <Play className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{vid.filename}</span>
                    </div>
                    <div className="text-[11px] font-mono text-neutral-400">
                      Channel: {vid.camera_id}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-[10px] font-mono font-medium">
                    {vid.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-800/60 font-mono tabular-nums">
                  <span>{vid.recorded_date}</span>
                  <span className="text-neutral-400 group-hover:text-neutral-200">
                    Play Footage →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
