import React, { useState } from 'react';
import {
  Video,
  Database,
  Search,
  HardDrive,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  Sparkles,
  Play,
  Radio,
  Eye,
} from 'lucide-react';
import { useCCTV } from '../context/CCTVContext';

export const DashboardPage: React.FC = () => {
  const {
    cameras,
    videos,
    events,
    searchHistory,
    setActiveTab,
    triggerSearch,
    setSelectedEvidence,
  } = useCCTV();

  const [liveStreamMatrix, setLiveStreamMatrix] = useState<boolean>(true);
  const totalCameras = cameras.length;
  const onlineCameras = cameras.filter((c) => c.status === 'online').length;
  const totalVideos = videos.length;
  const totalEvents = events.length;

  const quickPrompts = [
    'Did anyone enter through Gate 1 after 9 PM?',
    'Show all red cars.',
    'Find people carrying bags.',
    'Did a bike pass through the parking entrance?',
  ];

  const handleWatchCameraLive = (cam: any) => {
    setSelectedEvidence({
      id: `live_${cam.camera_id}`,
      camera_id: cam.camera_id,
      camera_name: cam.name,
      video_id: 'live_stream',
      date: '2026-10-08',
      start_time: '09:00:00',
      end_time: '10:00:00',
      timestamp_offset_seconds: 0,
      description: `Active real-time CCTV stream on ${cam.name} (${cam.location}). Recording resolution: ${cam.resolution} @ ${cam.fps} FPS.`,
      detected_objects: ['person', 'security', 'monitoring'],
      confidence: 0.98,
      thumbnail_url: cam.thumbnail_url || '',
      video_url: cam.video_url || '/videos/cctv_gate_night.mp4',
      bounding_boxes: [
        { label: 'Security Zone', confidence: 0.95, x: 0.2, y: 0.2, width: 0.6, height: 0.6 },
      ],
      metadata: {
        stream_mode: 'Real-Time Surveillance Stream',
        rtsp_url: cam.rtsp_url,
        codec: 'H.264 High Profile',
      },
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-100 tracking-tight">
            Surveillance Command Overview
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time multi-camera video streaming feeds and natural language indexing pipeline
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('camera-dashboard')}
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700 font-medium text-xs rounded-md transition-colors flex items-center gap-2"
          >
            <Video className="w-3.5 h-3.5 text-emerald-400" />
            <span>Camera Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className="px-4 py-2 bg-neutral-100 hover:bg-white text-neutral-950 font-medium text-xs rounded-md transition-colors flex items-center gap-2"
          >
            <span>Upload CCTV Footage</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4 Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cameras */}
        <div className="p-4 rounded-lg bg-neutral-900/60 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">Total Cameras</span>
            <Video className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-neutral-100">
              {totalCameras}
            </span>
            <span className="text-xs text-emerald-400 font-mono tabular-nums">
              {onlineCameras} Online
            </span>
          </div>
          <div className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-800/80">
            {cameras.filter((c) => c.status === 'maintenance').length} in maintenance check
          </div>
        </div>

        {/* Uploaded Videos */}
        <div className="p-4 rounded-lg bg-neutral-900/60 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">Uploaded Videos</span>
            <HardDrive className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-neutral-100">
              {totalVideos}
            </span>
            <span className="text-xs text-neutral-400 font-mono tabular-nums">
              ~{(videos.reduce((acc, v) => acc + v.duration_seconds, 0) / 3600).toFixed(1)} hrs
            </span>
          </div>
          <div className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-800/80">
            Real MP4 video files indexed in Supabase
          </div>
        </div>

        {/* Indexed Events */}
        <div className="p-4 rounded-lg bg-neutral-900/60 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">Indexed Events</span>
            <Database className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-neutral-100">
              {totalEvents}
            </span>
            <span className="text-xs text-emerald-400 font-mono tabular-nums">
              pgvector 512d
            </span>
          </div>
          <div className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-800/80">
            FFmpeg 1 FPS keyframes analyzed
          </div>
        </div>

        {/* Recent Searches */}
        <div className="p-4 rounded-lg bg-neutral-900/60 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">Recent Searches</span>
            <Search className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-neutral-100">
              {searchHistory.length}
            </span>
            <span className="text-xs text-neutral-400 font-mono tabular-nums">
              Avg 34ms
            </span>
          </div>
          <div className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-800/80">
            Natural language semantic index
          </div>
        </div>
      </div>

      {/* Quick Natural Language Search Banner */}
      <div className="p-6 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-100">
            Natural Language Surveillance Search
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Query across all camera streams using plain English questions
          </p>
        </div>

        {/* Suggested Query Buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          {quickPrompts.map((promptText, idx) => (
            <button
              key={idx}
              onClick={() => {
                triggerSearch(promptText);
                setActiveTab('search');
              }}
              className="px-3 py-1.5 rounded bg-neutral-950 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 text-xs text-neutral-300 hover:text-white transition-colors text-left"
            >
              "{promptText}"
            </button>
          ))}
        </div>
      </div>

      {/* Live Video Camera Matrix */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                <span>Active Camera Video Matrix</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h2>
              <p className="text-xs text-neutral-400">Live multi-channel surveillance feeds</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLiveStreamMatrix(!liveStreamMatrix)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors flex items-center gap-1.5 ${
                liveStreamMatrix
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{liveStreamMatrix ? 'Live Video Streaming' : 'Static Snapshots'}</span>
            </button>

            <button
              onClick={() => setActiveTab('cameras')}
              className="text-xs text-neutral-400 hover:text-white transition-colors ml-2"
            >
              Manage Channels →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cameras.slice(0, 4).map((cam) => (
            <div
              key={cam.id}
              onClick={() => handleWatchCameraLive(cam)}
              className="group cursor-pointer rounded-lg bg-neutral-900/40 border border-neutral-800 overflow-hidden hover:border-neutral-600 transition-all flex flex-col"
            >
              <div className="relative aspect-video bg-neutral-950 overflow-hidden">
                {liveStreamMatrix && cam.video_url ? (
                  <video
                    src={cam.video_url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : cam.thumbnail_url ? (
                  <img
                    src={cam.thumbnail_url}
                    alt={cam.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600">
                    <Video className="w-8 h-8" />
                  </div>
                )}

                {/* Subtle scanline texture overlay */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.3) 50%)',
                    backgroundSize: '100% 3px',
                  }}
                />

                {/* OSD tag on video */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-neutral-200">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      cam.status === 'online' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  <span className="text-red-400 font-bold">REC</span>
                  <span>{cam.camera_id}</span>
                </div>

                <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums text-neutral-300">
                  {cam.resolution.split(' ')[0]}
                </div>

                {/* Hover Play Prompt */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="px-3 py-1.5 rounded-md bg-neutral-900/90 border border-neutral-700 text-white text-[11px] font-medium flex items-center gap-1.5 shadow-xl">
                    <Play className="w-3.5 h-3.5" />
                    <span>Watch Full Feed</span>
                  </div>
                </div>
              </div>

              <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-neutral-200 truncate group-hover:text-white">
                    {cam.name}
                  </div>
                  <div className="text-[11px] text-neutral-500 truncate">{cam.location}</div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/60">
                  <span className="font-mono tabular-nums">{cam.video_count} video archives</span>
                  <span className="text-emerald-400 font-mono">{cam.fps} FPS</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Indexed Incidents Stream */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">Recent Incident Video Detections</h2>
            <p className="text-xs text-neutral-400">Click any incident to open video player</p>
          </div>
          <button
            onClick={() => setActiveTab('search')}
            className="text-xs text-neutral-400 hover:text-white transition-colors"
          >
            Open Full Search →
          </button>
        </div>

        <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/30 divide-y divide-neutral-800/80">
          {events.slice(0, 4).map((evt) => (
            <div
              key={evt.id}
              onClick={() => setSelectedEvidence(evt)}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-900/60 transition-colors cursor-pointer group"
            >
              <div className="flex items-start gap-4">
                <div className="relative w-28 h-18 rounded bg-neutral-950 overflow-hidden shrink-0 border border-neutral-800">
                  {evt.video_url ? (
                    <video
                      src={evt.video_url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={evt.thumbnail_url}
                      alt={evt.camera_name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.2 rounded text-[9px] font-mono text-neutral-300">
                    VIDEO
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-neutral-300">
                      {evt.camera_id}
                    </span>
                    <span aria-hidden="true" className="text-neutral-600">·</span>
                    <span className="text-neutral-200 font-medium">{evt.camera_name}</span>
                    <span aria-hidden="true" className="text-neutral-600">·</span>
                    <span className="font-mono tabular-nums text-neutral-400">
                      {evt.start_time} - {evt.end_time}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400 line-clamp-1">{evt.description}</p>

                  <div className="flex items-center gap-1.5 pt-0.5">
                    {evt.detected_objects.map((obj, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-300 font-medium"
                      >
                        {obj}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center sm:self-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-mono font-semibold text-emerald-400 tabular-nums">
                    {(evt.confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-neutral-500">Confidence</div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEvidence(evt);
                  }}
                  className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white transition-colors flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Play Video Clip</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
