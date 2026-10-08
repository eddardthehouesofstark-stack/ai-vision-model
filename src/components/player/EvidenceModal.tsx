import React from 'react';
import {
  X,
  Calendar,
  Clock,
  Video,
  MapPin,
  Download,
  Share2,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useCCTV } from '../../context/CCTVContext';
import { CCTVPlayer } from './CCTVPlayer';

export const EvidenceModal: React.FC = () => {
  const { selectedEvidence, setSelectedEvidence, showNotification } = useCCTV();

  if (!selectedEvidence) return null;

  const handleExportClip = () => {
    showNotification(`Exporting 1080p MP4 clip: ${selectedEvidence.camera_id}_${selectedEvidence.start_time.replace(/:/g, '')}.mp4`);
  };

  const handleExportReport = () => {
    const evidenceId =
      'id' in selectedEvidence ? selectedEvidence.id : (selectedEvidence as any).event_id;
    const reportData = {
      evidence_id: evidenceId || 'evt-unknown',
      camera_id: selectedEvidence.camera_id,
      camera_name: selectedEvidence.camera_name,
      date: selectedEvidence.date,
      start_time: selectedEvidence.start_time,
      end_time: selectedEvidence.end_time,
      description: selectedEvidence.description,
      confidence: selectedEvidence.confidence,
      detected_objects: selectedEvidence.detected_objects,
      metadata: selectedEvidence.metadata || {},
      generated_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident_evidence_report_${selectedEvidence.camera_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Incident Evidence Report exported successfully');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-semibold text-neutral-300 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">
              {selectedEvidence.camera_id}
            </span>
            <h2 className="text-sm font-semibold text-white tracking-tight">
              {selectedEvidence.camera_name} · Incident Playback
            </h2>
          </div>
          <button
            onClick={() => setSelectedEvidence(null)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Video Player */}
          <CCTVPlayer
            videoUrl={selectedEvidence.video_url}
            thumbnailUrl={selectedEvidence.thumbnail_url}
            cameraId={selectedEvidence.camera_id}
            cameraName={selectedEvidence.camera_name}
            recordedDate={selectedEvidence.date}
            startTime={selectedEvidence.start_time}
            endTime={selectedEvidence.end_time}
            offsetSeconds={selectedEvidence.timestamp_offset_seconds || 0}
            boundingBoxes={selectedEvidence.bounding_boxes}
          />

          {/* Details & Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Description & Incident Details */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Event Analysis
                </h3>
                <p className="text-sm text-neutral-200 leading-relaxed bg-neutral-900/60 border border-neutral-800/80 rounded-lg p-4">
                  {selectedEvidence.description}
                </p>
              </div>

              {selectedEvidence.metadata?.ai_reasoning && (
                <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-3 text-xs text-neutral-300 space-y-1">
                  <div className="font-semibold text-neutral-200">Vision-Language Match Rationale:</div>
                  <div className="text-neutral-400">{selectedEvidence.metadata.ai_reasoning}</div>
                </div>
              )}

              {/* Detected Entities */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Detected Objects
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedEvidence.detected_objects.map((obj, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-300"
                    >
                      {obj}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Metrics & Actions */}
            <div className="space-y-4 bg-neutral-900/40 border border-neutral-800 rounded-lg p-4 h-fit">
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Telemetry & Timecode
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-neutral-300">
                  <span className="text-neutral-500">Recorded Date</span>
                  <span className="font-mono tabular-nums text-neutral-200">{selectedEvidence.date}</span>
                </div>

                <div className="flex items-center justify-between text-neutral-300">
                  <span className="text-neutral-500">Incident Window</span>
                  <span className="font-mono tabular-nums text-neutral-200">
                    {selectedEvidence.start_time} - {selectedEvidence.end_time}
                  </span>
                </div>

                <div className="flex items-center justify-between text-neutral-300">
                  <span className="text-neutral-500">Confidence Score</span>
                  <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                    {((selectedEvidence.confidence || 0.9) * 100).toFixed(1)}%
                  </span>
                </div>

                {'similarity_score' in selectedEvidence &&
                  typeof selectedEvidence.similarity_score === 'number' && (
                    <div className="flex items-center justify-between text-neutral-300">
                      <span className="text-neutral-500">Visual Similarity</span>
                      <span className="font-mono tabular-nums text-sky-400 font-semibold">
                        {(selectedEvidence.similarity_score * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}

                {selectedEvidence.timestamp_offset_seconds !== undefined && (
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="text-neutral-500">Frame Offset</span>
                    <span className="font-mono tabular-nums text-neutral-200">
                      +{selectedEvidence.timestamp_offset_seconds}s
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-neutral-800 space-y-2">
                <button
                  onClick={handleExportClip}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-neutral-100 hover:bg-white text-neutral-950 font-medium text-xs rounded transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Video Clip</span>
                </button>

                <button
                  onClick={handleExportReport}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-xs rounded transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download Incident Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
