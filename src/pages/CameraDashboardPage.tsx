import React, { useState } from 'react';
import {
  Video,
  Play,
  Search,
  ArrowRight,
  RefreshCw,
  Clock,
  Calendar,
  Database,
  Eye,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  HardDrive,
  Camera as CameraIcon,
  Plus,
} from 'lucide-react';
import { useCCTV } from '../context/CCTVContext';
import { Camera, ProcessingStatus } from '../types';
import { api } from '../services/api';

export const CameraDashboardPage: React.FC = () => {
  const {
    cameras,
    videos,
    events,
    refreshCameras,
    refreshVideos,
    refreshEvents,
    setSelectedEvidence,
    triggerSearch,
    setActiveTab,
    showNotification,
  } = useCCTV();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reprocessingCamId, setReprocessingCamId] = useState<string | null>(null);

  // Filter cameras
  const filteredCameras = cameras.filter((cam) => {
    const matchesSearch =
      cam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cam.camera_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cam.location.toLowerCase().includes(searchTerm.toLowerCase());

    const effectiveStatus = cam.processing_status || 'completed';
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'completed' && (effectiveStatus === 'completed' || cam.status === 'online')) ||
      (statusFilter === 'processing' && (effectiveStatus === 'processing' || effectiveStatus === 'uploading' || effectiveStatus === 'indexing')) ||
      (statusFilter === 'failed' && effectiveStatus === 'failed');

    return matchesSearch && matchesStatus;
  });

  const totalCameras = cameras.length;
  const totalUploadedCameras = cameras.filter((c) => c.is_uploaded).length;
  const totalEventsIndexed = events.length;

  const handlePlayCamera = (cam: Camera) => {
    setSelectedEvidence({
      id: `dash_${cam.id}`,
      camera_id: cam.camera_id,
      camera_name: cam.name,
      video_id: 'camera_feed',
      date: cam.upload_date || '2026-10-08',
      start_time: '09:00:00',
      end_time: '10:00:00',
      timestamp_offset_seconds: 0,
      description: `Active footage playback for ${cam.name} (${cam.location}). Recording resolution: ${cam.resolution} @ ${cam.fps} FPS.`,
      detected_objects: ['person', 'security', 'vehicle'],
      confidence: 0.98,
      thumbnail_url: cam.thumbnail_url || '/thumbnails/gate_2s.jpg',
      video_url: cam.video_url || '/videos/cctv_gate_night.mp4',
      bounding_boxes: [],
      metadata: {
        camera_id: cam.camera_id,
        duration: cam.duration_seconds || 12.0,
        source: 'Uploaded CCTV Camera Feed',
      },
    });
  };

  const handleSearchCamera = (cam: Camera) => {
    triggerSearch(`Show all events and activity in ${cam.name}`, cam.camera_id);
    setActiveTab('search');
  };

  const handleReprocessCamera = async (cam: Camera, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetVideo = videos.find((v) => v.camera_id === cam.camera_id);
    if (!targetVideo) {
      showNotification(`No source video file found to reprocess for ${cam.camera_id}`);
      return;
    }

    try {
      setReprocessingCamId(cam.camera_id);
      showNotification(`Reprocessing video pipeline for ${cam.name}...`);
      await api.reprocessVideo(targetVideo.id);
      await Promise.all([refreshCameras(), refreshVideos(), refreshEvents()]);
      showNotification(`Successfully reprocessed ${cam.name}!`);
    } catch (err: any) {
      showNotification(`Reprocessing failed: ${err?.message || 'Error running pipeline'}`);
    } finally {
      setReprocessingCamId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-100 tracking-tight flex items-center gap-2">
            <span>Camera Dashboard</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/80">
              Multi-Camera Channels
            </span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Browse all uploaded CCTV cameras, monitor processing status, inspect keyframes, and launch targeted searches
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('upload')}
            className="px-3.5 py-2 bg-neutral-100 hover:bg-white text-neutral-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload New Cameras</span>
          </button>

          <button
            onClick={() => {
              triggerSearch('Show all recorded events across all cameras');
              setActiveTab('search');
            }}
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            <span>Search All Footage</span>
          </button>
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Total Cameras</span>
            <CameraIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-100 tabular-nums">
            {totalCameras}
          </div>
          <div className="text-[11px] text-neutral-500 font-mono">
            {cameras.filter((c) => c.status === 'online').length} online feeds
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Uploaded Cameras</span>
            <HardDrive className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400 tabular-nums">
            {totalUploadedCameras || totalCameras}
          </div>
          <div className="text-[11px] text-neutral-500 font-mono">
            Distinct CCTV files
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Total Indexed Events</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {totalEventsIndexed}
          </div>
          <div className="text-[11px] text-neutral-500 font-mono">
            pgvector searchable
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Cataloged Footage</span>
            <Video className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-100 tabular-nums">
            {videos.length}
          </div>
          <div className="text-[11px] text-neutral-500 font-mono">
            MP4 H.264 video clips
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search cameras by name, ID or location..."
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-700"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-neutral-950 rounded-lg border border-neutral-800">
          {[
            { id: 'all', label: 'All Cameras' },
            { id: 'completed', label: 'Completed' },
            { id: 'processing', label: 'Processing' },
            { id: 'failed', label: 'Failed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-neutral-800 text-neutral-100 font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Camera Cards Grid (Requirement: Camera Dashboard displays Camera Name, Video Thumbnail, Video Duration, Upload Date, Number of Indexed Events, Processing Status) */}
      {filteredCameras.length === 0 ? (
        <div className="py-20 text-center rounded-xl bg-neutral-900/30 border border-neutral-800 text-neutral-400 space-y-3">
          <CameraIcon className="w-10 h-10 text-neutral-600 mx-auto" />
          <h3 className="text-sm font-semibold text-neutral-200">No cameras match your filter</h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Try adjusting your search query or upload new CCTV video files to add more camera channels.
          </p>
          <button
            onClick={() => setActiveTab('upload')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Cameras</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCameras.map((cam) => {
            const effectiveStatus: ProcessingStatus = cam.processing_status || 'completed';
            const durationSec = cam.duration_seconds || 12.0;
            const uploadDate = cam.upload_date || cam.created_at?.split('T')[0] || '2026-10-08';
            const isReprocessing = reprocessingCamId === cam.camera_id;

            const statusBadgeMap: Record<ProcessingStatus, { label: string; bg: string; text: string; border: string }> = {
              waiting: { label: 'Waiting', bg: 'bg-neutral-800', text: 'text-neutral-300', border: 'border-neutral-700' },
              uploading: { label: 'Uploading', bg: 'bg-sky-950', text: 'text-sky-300', border: 'border-sky-800' },
              processing: { label: 'Processing', bg: 'bg-amber-950', text: 'text-amber-300', border: 'border-amber-800' },
              indexing: { label: 'Indexing', bg: 'bg-purple-950', text: 'text-purple-300', border: 'border-purple-800' },
              completed: { label: 'Completed', bg: 'bg-emerald-950', text: 'text-emerald-300', border: 'border-emerald-800' },
              failed: { label: 'Failed', bg: 'bg-red-950', text: 'text-red-300', border: 'border-red-800' },
            };

            const badge = statusBadgeMap[effectiveStatus] || statusBadgeMap.completed;

            return (
              <div
                key={cam.id}
                className="group rounded-xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md"
              >
                <div>
                  {/* Video Thumbnail (Requirement: Video Thumbnail) */}
                  <div
                    onClick={() => handlePlayCamera(cam)}
                    className="relative aspect-video bg-neutral-950 cursor-pointer overflow-hidden"
                  >
                    {cam.video_url ? (
                      <video
                        src={cam.video_url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <img
                        src={cam.thumbnail_url || '/thumbnails/gate_2s.jpg'}
                        alt={cam.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/thumbnails/corridor_2s.jpg';
                        }}
                      />
                    )}

                    {/* Subtle scanline overlay */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-20"
                      style={{
                        backgroundImage:
                          'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.3) 50%)',
                        backgroundSize: '100% 3px',
                      }}
                    />

                    {/* Top Left OSD */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/80 backdrop-blur-xs px-2 py-0.5 rounded text-[11px] font-mono text-neutral-200 border border-neutral-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-semibold text-emerald-400">{cam.camera_id}</span>
                      <span className="text-neutral-500">·</span>
                      <span className="text-neutral-300">{cam.resolution.split(' ')[0]}</span>
                    </div>

                    {/* Top Right Processing Status Badge (Requirement: Processing Status) */}
                    <div className="absolute top-2 right-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {/* Hover Play Icon */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-neutral-900/90 border border-neutral-700 flex items-center justify-center text-white shadow-xl">
                        <Play className="w-5 h-5 ml-0.5" />
                      </div>
                    </div>

                    {/* Bottom Strip: Video Duration (Requirement: Video Duration) */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] font-mono tabular-nums text-neutral-300 bg-black/80 px-2 py-1 rounded border border-neutral-800">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        <span>{durationSec.toFixed(1)}s Duration</span>
                      </span>
                      <span>{cam.fps} FPS</span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-3">
                    {/* Camera Name (Requirement: Camera Name) */}
                    <div>
                      <h3 className="text-sm font-bold text-neutral-100 group-hover:text-white transition-colors truncate">
                        {cam.name}
                      </h3>
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5">{cam.location}</p>
                    </div>

                    {/* Upload Date & Number of Indexed Events (Requirements: Upload Date & Number of Indexed Events) */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800/80 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                          Upload Date
                        </span>
                        <div className="font-mono text-[11px] text-neutral-300 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-neutral-500" />
                          <span>{uploadDate}</span>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                          Indexed Events
                        </span>
                        <div className="font-mono text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                          <Database className="w-3 h-3 text-emerald-500" />
                          <span>{cam.event_count} AI Events</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="p-4 pt-0 border-t border-neutral-800/80 flex items-center justify-between gap-2 mt-2">
                  <button
                    type="button"
                    onClick={(e) => handleReprocessCamera(cam, e)}
                    disabled={isReprocessing}
                    className="p-2 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
                    title="Reprocess video without re-uploading"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isReprocessing ? 'animate-spin text-emerald-400' : ''}`} />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSearchCamera(cam)}
                      className="px-3 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-200 hover:text-white transition-colors flex items-center gap-1"
                    >
                      <Search className="w-3 h-3 text-emerald-400" />
                      <span>Search</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePlayCamera(cam)}
                      className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-colors flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" />
                      <span>Play</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
