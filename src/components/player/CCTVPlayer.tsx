import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Camera as CameraIcon,
  Download,
  RotateCcw,
} from 'lucide-react';
import { BoundingBox } from '../../types';

interface CCTVPlayerProps {
  videoUrl?: string;
  thumbnailUrl: string;
  cameraId: string;
  cameraName: string;
  recordedDate: string;
  startTime: string;
  endTime?: string;
  offsetSeconds?: number;
  durationSeconds?: number;
  boundingBoxes?: BoundingBox[];
  autoPlay?: boolean;
}

export const CCTVPlayer: React.FC<CCTVPlayerProps> = ({
  videoUrl,
  thumbnailUrl,
  cameraId,
  cameraName,
  recordedDate,
  startTime,
  endTime,
  offsetSeconds = 0,
  durationSeconds = 60,
  boundingBoxes = [],
  autoPlay = true,
}) => {
  // Determine effective playable video stream URL
  const getFallbackVideoUrl = (camId: string, thumb: string) => {
    if (camId === 'CAM-01' || thumb.includes('gate')) return '/videos/cctv_gate_night.mp4';
    if (camId === 'CAM-02' || thumb.includes('parking')) return '/videos/cctv_parking_lot.mp4';
    if (camId === 'CAM-03' || thumb.includes('corridor')) return '/videos/cctv_corridor_office.mp4';
    return '/videos/cctv_loading_dock.mp4';
  };

  const effectiveVideoUrl = videoUrl || getFallbackVideoUrl(cameraId, thumbnailUrl);

  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(12);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [isPtzTracking, setIsPtzTracking] = useState<boolean>(false);
  const [isNightVision, setIsNightVision] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [videoError, setVideoError] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Compute dynamic trajectory for bounding boxes as video plays
  const getDynamicBox = (box: BoundingBox, idx: number) => {
    if (!isPlaying && currentVideoTime === 0) {
      return { x: box.x, y: box.y };
    }
    const t = currentVideoTime;
    const vx = box.vx ?? (idx % 2 === 0 ? 0.012 : -0.010);
    const vy = box.vy ?? (idx % 2 === 0 ? 0.003 : -0.004);
    const cycleTime = (t % (videoDuration || 12)) - (videoDuration || 12) / 2;
    const curX = Math.max(0.04, Math.min(0.84, box.x + vx * cycleTime));
    const curY = Math.max(0.06, Math.min(0.80, box.y + vy * cycleTime));
    return { x: curX, y: curY };
  };

  const primaryTarget = boundingBoxes[0];
  const dynamicPrimary = primaryTarget ? getDynamicBox(primaryTarget, 0) : null;

  // Sync playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Handle play/pause
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {
        // Autoplay may be restricted without user interaction
        setIsPlaying(false);
      });
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Initial video seek based on offset
  useEffect(() => {
    if (videoRef.current && offsetSeconds > 0) {
      // Loop within duration if offset exceeds length
      const seekTarget = offsetSeconds % (videoDuration || 12);
      videoRef.current.currentTime = seekTarget;
    }
  }, [offsetSeconds, videoDuration]);

  // Compute live timestamp based on video time
  const getDisplayTimestamp = () => {
    const [hh, mm, ss] = startTime.split(':').map((s) => parseInt(s, 10) || 0);
    const totalSecs = hh * 3600 + mm * 60 + ss + Math.floor(currentVideoTime);
    const h = Math.floor(totalSecs / 3600) % 24;
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = Math.floor(totalSecs % 60);
    const millis = Math.floor((currentVideoTime % 1) * 100);

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${recordedDate} ${pad(h)}:${pad(m)}:${pad(s)}.${pad(millis)}`;
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentVideoTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration || 12);
      if (offsetSeconds > 0) {
        const seek = offsetSeconds % (videoRef.current.duration || 12);
        videoRef.current.currentTime = seek;
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = clickRatio * (videoDuration || 12);
    videoRef.current.currentTime = newTime;
    setCurrentVideoTime(newTime);
  };

  const handleStepFrame = (forward: boolean) => {
    if (!videoRef.current) return;
    setIsPlaying(false);
    const frameDuration = 1 / 30; // 30 fps
    const nextTime = forward
      ? videoRef.current.currentTime + frameDuration
      : videoRef.current.currentTime - frameDuration;
    videoRef.current.currentTime = Math.max(0, Math.min(videoDuration, nextTime));
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullscreen(false);
    }
  };

  const handleSnapshotCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      // Burn forensic metadata watermark
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(0, canvas.height - 48, canvas.width, 48);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`[${cameraId}] ${cameraName} · FORENSIC SNAPSHOT`, 24, canvas.height - 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px monospace';
      ctx.fillText(getDisplayTimestamp(), canvas.width - 320, canvas.height - 18);

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `cctv_evidence_${cameraId}_${Date.now()}.png`;
      a.click();
    }
  };

  const progressPercent = videoDuration > 0 ? (currentVideoTime / videoDuration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden border border-neutral-800 select-none flex flex-col ${
        isFullscreen ? 'w-screen h-screen' : 'w-full aspect-video'
      }`}
    >
      {/* Video Viewport */}
      <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center bg-neutral-950">
        <div
          className="w-full h-full transition-transform duration-500 ease-out flex items-center justify-center"
          style={{
            transform:
              isPtzTracking && dynamicPrimary
                ? `scale(1.18) translate(${(0.5 - dynamicPrimary.x) * 18}%, ${(0.5 - dynamicPrimary.y) * 18}%)`
                : 'none',
          }}
        >
          {!videoError ? (
            <video
              ref={videoRef}
              src={effectiveVideoUrl}
              autoPlay={autoPlay}
              loop
              muted={isMuted}
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onError={() => setVideoError(true)}
              onClick={() => setIsPlaying(!isPlaying)}
              className={`w-full h-full object-cover cursor-pointer transition-all duration-300 ${
                isNightVision
                  ? 'contrast-125 saturate-50 hue-rotate-90 brightness-110 sepia-[0.3]'
                  : ''
              }`}
            />
          ) : (
            <img
              src={thumbnailUrl}
              alt={cameraName}
              className={`w-full h-full object-cover transition-all duration-300 ${
                isNightVision ? 'contrast-125 saturate-50 hue-rotate-90 brightness-110' : ''
              }`}
            />
          )}
        </div>

        {/* Real-time CCTV scanlines / grain texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.3) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))',
            backgroundSize: '100% 3px, 6px 100%',
          }}
        />

        {/* Dynamic CCTV OSD Overlay */}
        <div className="absolute top-3 left-4 right-4 flex items-start justify-between pointer-events-none text-[12px] font-mono tracking-wider text-neutral-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] z-20">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-red-600 animate-pulse' : 'bg-neutral-500'}`} />
              <span className={`font-semibold ${isPlaying ? 'text-red-500' : 'text-neutral-400'}`}>
                {isPlaying ? 'LIVE / REC' : 'PAUSED'}
              </span>
              <span className="text-white/90">[{cameraId}]</span>
              <span className="text-neutral-300 font-medium">{cameraName}</span>
            </div>
            <div className="text-emerald-400 text-[11px] font-medium flex items-center gap-2">
              <span>STREAM: 1080P @ 30FPS · H.264 MP4</span>
              {isPtzTracking && <span className="bg-emerald-950/90 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-700/80">PTZ TRACK ON</span>}
              {isNightVision && <span className="bg-neutral-800 text-neutral-200 px-1 rounded">IR ACTIVE</span>}
            </div>
          </div>

          <div className="text-right space-y-0.5">
            <div className="tabular-nums font-semibold text-white text-[13px]">{getDisplayTimestamp()}</div>
            <div className="text-neutral-400 text-[11px]">
              CLIP POS: {currentVideoTime.toFixed(2)}s / {(videoDuration || 12).toFixed(1)}s
            </div>
          </div>
        </div>

        {/* Dynamic Active Bounding Boxes Tracking Overlay */}
        {showBoundingBoxes &&
          boundingBoxes.map((box, idx) => {
            const dyn = getDynamicBox(box, idx);
            return (
              <div
                key={idx}
                className="absolute border-2 border-emerald-400 pointer-events-none transition-all duration-150 ease-linear z-10"
                style={{
                  left: `${dyn.x * 100}%`,
                  top: `${dyn.y * 100}%`,
                  width: `${box.width * 100}%`,
                  height: `${box.height * 100}%`,
                  boxShadow: '0 0 14px rgba(16, 185, 129, 0.55)',
                }}
              >
                {/* Crosshair target reticle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-70">
                  <div className="w-full h-0.5 bg-emerald-400 absolute top-1/2 -translate-y-1/2" />
                  <div className="h-full w-0.5 bg-emerald-400 absolute left-1/2 -translate-x-1/2" />
                </div>

                {/* Target Label */}
                <div className="absolute -top-5 left-0 bg-emerald-500 text-neutral-950 font-mono font-semibold text-[10px] px-1.5 py-0.5 uppercase tracking-wide flex items-center gap-1.5 shadow-sm">
                  <span>{box.label}</span>
                  <span className="opacity-80">{(box.confidence * 100).toFixed(0)}%</span>
                  {showVectors && <span className="text-[9px] opacity-75">1.3 m/s</span>}
                </div>
              </div>
            );
          })}

        {/* Center Pause Watermark */}
        {!isPlaying && (
          <div
            onClick={() => setIsPlaying(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-20"
          >
            <div className="w-14 h-14 rounded-full bg-neutral-900/90 border border-neutral-700 flex items-center justify-center text-white shadow-xl hover:scale-105 transition-transform">
              <Play className="w-6 h-6 ml-1 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Scrubber & Timeline Bar */}
      <div className="bg-neutral-950 border-t border-neutral-900 px-4 pt-2 pb-3 space-y-2">
        <div
          className="relative w-full h-2.5 bg-neutral-800 rounded cursor-pointer group"
          onClick={handleSeek}
        >
          {/* Active play progress */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-neutral-200 rounded"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
          {/* Event start marker */}
          <div
            className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 z-10"
            style={{ left: '20%' }}
            title="Evidence incident point"
          />
          {/* Scrub handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow border border-neutral-900 -ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>

        {/* Playback Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-300">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 hover:bg-neutral-800 rounded transition-colors text-white"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={() => handleStepFrame(false)}
              className="p-1.5 hover:bg-neutral-800 rounded transition-colors text-neutral-400 hover:text-white"
              title="Previous Frame (1/30s)"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleStepFrame(true)}
              className="p-1.5 hover:bg-neutral-800 rounded transition-colors text-neutral-400 hover:text-white"
              title="Next Frame (1/30s)"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                }
              }}
              className="p-1.5 hover:bg-neutral-800 rounded transition-colors text-neutral-400 hover:text-white"
              title="Restart Video Clip"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-neutral-800 mx-1" />

            <div className="flex items-center gap-1">
              {[0.5, 1, 2, 4].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-1.5 py-0.5 rounded font-mono text-[11px] tabular-nums transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-neutral-800 text-white font-semibold'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                showBoundingBoxes
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                  : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
              }`}
              title="Toggle AI Detection Bounding Boxes"
            >
              {showBoundingBoxes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>Boxes</span>
            </button>

            <button
              onClick={() => setIsPtzTracking(!isPtzTracking)}
              className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                isPtzTracking
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80 font-semibold'
                  : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-neutral-200'
              }`}
              title="Toggle PTZ Auto-Follow Camera Framing"
            >
              PTZ Track
            </button>

            <button
              onClick={() => setIsNightVision(!isNightVision)}
              className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                isNightVision
                  ? 'bg-neutral-800 text-neutral-100 border-neutral-700'
                  : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-neutral-200'
              }`}
              title="Toggle Night Vision Simulation"
            >
              Night-Vision
            </button>

            <button
              onClick={handleSnapshotCapture}
              className="p-1.5 hover:bg-neutral-800 rounded transition-colors text-neutral-400 hover:text-white"
              title="Capture Video Frame Snapshot with Watermark"
            >
              <CameraIcon className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 hover:bg-neutral-800 rounded transition-colors text-neutral-400 hover:text-white"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-neutral-800 rounded transition-colors text-neutral-400 hover:text-white"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
