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
    { title: 'Uploading Video Binary', desc: 'Pushing file chunks to Supabase Storage' },
    { title: 'Demuxing Video Streams', desc: 'Container parsing & timestamp alignment' },
    { title: 'FFmpeg Keyframe Extraction', desc: 'Extracting 1 frame per second (1 FPS)' },
    { title: 'Vision-Language Embeddings', desc: 'Computing 512-dim visual vector features' },
    { title: 'Supabase pgvector Indexing', desc: 'Writing vector records to PostgreSQL' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const objUrl = URL.createObjectURL(file);
      setPreviewVideoUrl(objUrl);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      const objUrl = URL.createObjectURL(file);
      setPreviewVideoUrl(objUrl);
    }
  };

  const handleStartUpload = async (e: React.FormEvent) => {
    e.preventDefault();

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
      await runStep(1, 30);
      await runStep(2, 55);
      await runStep(3, 80);
      await runStep(4, 95);

      const formData = new FormData();
      if (selectedFile) {
        formData.append('video_file', selectedFile);
      } else {
        formData.append('filename', `cctv_footage_${selectedCameraId}.mp4`);
      }
      formData.append('camera_id', selectedCameraId);
      formData.append('recorded_date', recordedDate);
      formData.append('recorded_start_time', startTime);
      formData.append('recorded_end_time', endTime);
      if (incidentNotes) {
        formData.append('incident_notes', incidentNotes);
      }

      const res = await api.uploadVideo(formData);
      setUploadPercent(100);
      setLastUploadedResult(res);
      await refreshVideos();

      showNotification('Footage uploaded and indexed in pgvector! Ready to query.');
    } catch (err) {
      console.error(err);
      showNotification('Video upload encountered an issue.');
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
                  accept="video/mp4,video/x-matroska,video/avi,video/quicktime"
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
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · Ready for processing
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-neutral-200">
                      Click or drag & drop custom CCTV recording footage here
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      Supports MP4, MKV, AVI, MOV (Or choose a preset above)
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

          {/* Post-Upload Interactive Question Answering Launcher */}
          {lastUploadedResult && (
            <div className="p-6 rounded-xl bg-emerald-950/30 border border-emerald-800/70 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Footage Indexed in pgvector — Ready to Answer Questions</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded">
                  {lastUploadedResult.camera_id} · Active
                </span>
              </div>

              <p className="text-xs text-neutral-300">
                Your video is indexed! You can now ask questions about this footage in natural language. Click a question below:
              </p>

              {/* Instant Clickable Questions */}
              <div className="flex flex-wrap gap-2">
                {[
                  `Did anyone enter in this ${lastUploadedResult.camera_id} video?`,
                  `Find people carrying bags in this footage`,
                  `Show all movement and vehicles`,
                  `What activity was recorded in the uploaded footage?`,
                ].map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      triggerSearch(q, lastUploadedResult.camera_id);
                      setActiveTab('search');
                    }}
                    className="px-3 py-1.5 rounded-md bg-neutral-900 border border-emerald-800/80 hover:bg-neutral-800 text-xs text-emerald-200 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <span>"{q}"</span>
                    <ArrowRight className="w-3 h-3 text-emerald-400" />
                  </button>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    triggerSearch('What activity was recorded in the uploaded footage?', lastUploadedResult.camera_id);
                    setActiveTab('search');
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs rounded transition-colors flex items-center gap-2"
                >
                  <span>Launch Natural Language Search on This Video</span>
                  <ArrowRight className="w-3.5 h-3.5" />
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
