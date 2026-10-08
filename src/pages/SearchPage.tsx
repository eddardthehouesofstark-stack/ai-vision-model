import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Play,
  Clock,
  Video,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Info,
  Loader2,
} from 'lucide-react';
import { useCCTV } from '../context/CCTVContext';
import { SearchResultItem } from '../types';
import { api } from '../services/api';

export const SearchPage: React.FC = () => {
  const {
    cameras,
    activeQuery,
    setActiveQuery,
    searchResults,
    searchExecutionTime,
    answerSummary,
    triggerSearch,
    isSearching,
    setSelectedEvidence,
    setActiveTab,
  } = useCCTV();

  const [inputQuery, setInputQuery] = useState<string>(activeQuery || '');
  const [selectedCameraIds, setSelectedCameraIds] = useState<string[]>([]);
  const [scopeFilter, setScopeFilter] = useState<'all' | 'uploaded' | 'cameras'>('all');
  const [minConfidence, setMinConfidence] = useState<number>(0.55);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [activeIndexingJob, setActiveIndexingJob] = useState<{
    status: string;
    step: string;
    progress: number;
  } | null>(null);

  useEffect(() => {
    let timer: any = null;
    const pollStatus = async () => {
      try {
        const job = await api.getIndexingStatus();
        if (job && job.status !== 'completed' && job.status !== 'failed' && job.progress < 100) {
          setActiveIndexingJob(job);
        } else {
          setActiveIndexingJob(null);
        }
      } catch {
        // ignore
      }
    };
    pollStatus();
    timer = setInterval(pollStatus, 2500);
    return () => clearInterval(timer);
  }, []);

  const examplePrompts = [
    'Did anyone enter through Gate 1 after 9 PM?',
    'Show all red cars.',
    'Find people carrying bags.',
    'Did anyone enter in the uploaded footage?',
    'Did a bike pass through the parking entrance?',
    'What activity was recorded in the uploaded video?',
    'White delivery freight truck at loading dock',
  ];

  const handleToggleCamera = (camId: string) => {
    setSelectedCameraIds((prev) =>
      prev.includes(camId) ? prev.filter((id) => id !== camId) : [...prev, camId]
    );
  };

  const handleSelectAllCameras = () => {
    setSelectedCameraIds([]);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;
    const filterParam =
      selectedCameraIds.length === 0
        ? undefined
        : selectedCameraIds.length === 1
        ? selectedCameraIds[0]
        : selectedCameraIds;
    triggerSearch(inputQuery, filterParam, minConfidence);
  };

  const handlePromptClick = (promptText: string) => {
    setInputQuery(promptText);
    const filterParam =
      selectedCameraIds.length === 0
        ? undefined
        : selectedCameraIds.length === 1
        ? selectedCameraIds[0]
        : selectedCameraIds;
    triggerSearch(promptText, filterParam, minConfidence);
  };

  // Filter results by selected scope
  const effectiveResults = searchResults.filter((r) => {
    if (scopeFilter === 'uploaded') return r.is_uploaded || r.source_type === 'upload' || r.metadata?.source?.includes('Uploaded');
    if (scopeFilter === 'cameras') return !r.is_uploaded && r.source_type !== 'upload' && !r.metadata?.source?.includes('Uploaded');
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-100 tracking-tight">
            Natural Language Video Search
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Search indexed CCTV surveillance video recordings using descriptive natural language
          </p>
        </div>

        {/* Scope Selector Chips */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('image-search')}
            className="px-3 py-1.5 rounded-lg font-medium text-xs bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Search by Image</span>
          </button>

          <div className="flex items-center gap-1.5 p-1 bg-neutral-900 border border-neutral-800 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setScopeFilter('all')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                scopeFilter === 'all'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              All Sources
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('uploaded')}
              className={`px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
                scopeFilter === 'uploaded'
                  ? 'bg-sky-950 text-sky-200 border border-sky-800 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>Uploaded Footage Only</span>
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('cameras')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                scopeFilter === 'cameras'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Connected Cameras
            </button>
          </div>
        </div>
      </div>

      {/* Background Indexing Progress Alert */}
      {activeIndexingJob && (
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-amber-200 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            <div>
              <span className="font-semibold text-white">Video Indexing Pipeline Active:</span>{' '}
              <span className="text-amber-300 font-medium">Stage: {activeIndexingJob.step}</span>{' '}
              <span className="text-amber-400 font-mono">({activeIndexingJob.progress}%)</span>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Searching is locked while video frames are being extracted and analyzed. Will unlock automatically upon completion.
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto px-2 py-0.5 rounded bg-amber-900/60 border border-amber-700/60 text-[10px] font-mono text-amber-300">
            PROCESSING
          </span>
        </div>
      )}

      {/* Prominent Large Search Bar */}
      <form onSubmit={handleSearchSubmit} className="space-y-3">
        <div className="relative flex items-center">
          <div className="absolute left-4 text-neutral-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask a question about your CCTV footage..."
            className="w-full pl-12 pr-32 py-3.5 bg-neutral-900 border border-neutral-700/80 rounded-xl text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-all shadow-inner"
          />
          <div className="absolute right-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border transition-colors ${
                showFilters || selectedCameraIds.length > 0 || minConfidence !== 0.60
                  ? 'bg-neutral-800 text-neutral-100 border-neutral-600'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
              }`}
              title="Toggle Multi-Camera Filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <button
              type="submit"
              disabled={isSearching || !inputQuery.trim() || !!activeIndexingJob}
              className="px-4 py-2 bg-neutral-100 hover:bg-white disabled:bg-neutral-800 disabled:text-neutral-600 text-neutral-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
            >
              {isSearching ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                  <span>Searching...</span>
                </>
              ) : activeIndexingJob ? (
                <span>Indexing Active...</span>
              ) : (
                <span>Search Footage</span>
              )}
            </button>
          </div>
        </div>

        {/* Example Prompt Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-neutral-500 text-[11px] font-medium mr-1">Examples:</span>
          {examplePrompts.map((promptText, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handlePromptClick(promptText)}
              className="px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/80 text-[11px] text-neutral-300 hover:text-white transition-colors"
            >
              {promptText}
            </button>
          ))}
        </div>
      </form>

      {/* Collapsible Filter Bar */}
      {showFilters && (
        <div className="p-4 rounded-lg bg-neutral-900/60 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
            <span>Query Filters & Multi-Camera Constraints</span>
            <button
              onClick={() => {
                setSelectedCameraIds([]);
                setMinConfidence(0.60);
              }}
              className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          </div>

          {/* Multi-Camera Selection Chips (Requirement: search within specific camera, multiple selected cameras, or all cameras) */}
          <div className="space-y-2 pt-1 border-b border-neutral-800/80 pb-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-neutral-400">
                Target Cameras: {selectedCameraIds.length === 0 ? (
                  <span className="text-emerald-400 font-semibold">All Cameras (Default)</span>
                ) : (
                  <span className="text-sky-300 font-semibold">{selectedCameraIds.length} Camera(s) Selected</span>
                )}
              </span>
              <button
                type="button"
                onClick={handleSelectAllCameras}
                className="text-xs text-neutral-400 hover:text-emerald-400 transition-colors"
              >
                Select All Cameras
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSelectAllCameras}
                className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                  selectedCameraIds.length === 0
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                }`}
              >
                All Cameras
              </button>

              {cameras.map((c) => {
                const isSelected = selectedCameraIds.includes(c.camera_id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleToggleCamera(c.camera_id)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-neutral-800 text-white border-neutral-600 shadow-sm'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                    }`}
                  >
                    <span className="font-mono text-[10px] text-emerald-400">{c.camera_id}</span>
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Min Confidence Threshold */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-medium text-neutral-400">
                <span>Minimum Confidence Score</span>
                <span className="font-mono tabular-nums text-neutral-200">
                  {(minConfidence * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.4"
                max="0.95"
                step="0.05"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                className="w-full accent-neutral-200"
              />
            </div>

            {/* Date Constraint */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-neutral-400">Footage Date</label>
              <input
                type="date"
                defaultValue="2026-10-08"
                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Query Status Bar */}
      <div className="flex items-center justify-between text-xs text-neutral-400 border-b border-neutral-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span>
            Found{' '}
            <strong className="text-neutral-100 font-mono tabular-nums">
              {effectiveResults.length}
            </strong>{' '}
            evidence incidents {scopeFilter !== 'all' && `(${scopeFilter})`}
          </span>
          {activeQuery && (
            <>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span className="text-neutral-400 truncate max-w-md">
                Matching: <em className="text-neutral-300 not-italic">"{activeQuery}"</em>
              </span>
            </>
          )}
        </div>

        <div className="font-mono text-[11px] tabular-nums text-neutral-500">
          Query Execution: {searchExecutionTime.toFixed(1)}ms
        </div>
      </div>

      {/* Natural Language Question Analysis & Direct Answer Card */}
      {answerSummary && !isSearching && (
        <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-700/80 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-neutral-300 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Forensic Query Answer</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
                Gemini 3.8 Flash + pgvector Verified
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-neutral-100 leading-relaxed font-medium">
            {answerSummary}
          </p>
          <div className="text-[11px] text-neutral-400 flex items-center gap-2 pt-1 border-t border-neutral-800">
            <span>Click any matching evidence card below to view video playback with auto-seeked timestamp.</span>
          </div>
        </div>
      )}

      {/* Evidence Results Grid */}
      {isSearching ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 text-neutral-400">
          <div className="w-8 h-8 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
          <p className="text-xs">Processing vector embeddings and temporal filters...</p>
        </div>
      ) : effectiveResults.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-neutral-900/20 border border-neutral-800/60 rounded-xl p-8">
          <Info className="w-8 h-8 text-neutral-500 mx-auto" />
          <h3 className="text-sm font-semibold text-neutral-200">No matching events detected</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            Try adjusting your natural language query, lowering the confidence threshold, or clearing the camera channel filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {effectiveResults.map((result: SearchResultItem) => (
            <div
              key={result.event_id}
              className="group rounded-xl bg-neutral-900/50 border border-neutral-800 overflow-hidden hover:border-neutral-700 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Evidence Thumbnail / Video Preview */}
                <div
                  onClick={() => setSelectedEvidence(result)}
                  className="relative aspect-video bg-neutral-950 cursor-pointer overflow-hidden"
                >
                  {result.video_url ? (
                    <video
                      src={result.video_url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <img
                      src={result.thumbnail_url}
                      alt={result.camera_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}

                  {/* Scanline overlay */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                      backgroundImage:
                        'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.3) 50%)',
                      backgroundSize: '100% 3px',
                    }}
                  />

                  {/* OSD Bar on Thumbnail */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/80 px-2 py-0.5 rounded text-[11px] font-mono text-neutral-200">
                    <span className="font-semibold text-emerald-400">{result.camera_id}</span>
                    <span className="text-neutral-400">·</span>
                    <span className="truncate max-w-[120px]">{result.camera_name}</span>
                  </div>

                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    {result.is_uploaded && (
                      <span className="bg-sky-950/90 border border-sky-800 text-sky-300 px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase">
                        Uploaded
                      </span>
                    )}
                    <span className="bg-emerald-950/90 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded text-[11px] font-mono font-semibold tabular-nums">
                      {(result.confidence * 100).toFixed(0)}% Match
                    </span>
                  </div>

                  {/* Play Clip Overlay Hover */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-neutral-900/90 border border-neutral-700 flex items-center justify-center text-white shadow-xl">
                      <Play className="w-5 h-5 ml-0.5" />
                    </div>
                  </div>

                  {/* Time interval at bottom of image */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] font-mono tabular-nums text-neutral-300 bg-black/80 px-2 py-1 rounded">
                    <span>{result.date}</span>
                    <span>
                      {result.start_time} - {result.end_time}
                    </span>
                  </div>
                </div>

                {/* Evidence Details */}
                <div className="p-4 space-y-3">
                  <p className="text-xs text-neutral-200 leading-relaxed line-clamp-2">
                    {result.description}
                  </p>

                  {/* Matched Rationale Reason */}
                  {result.matched_reasons && result.matched_reasons.length > 0 && (
                    <div className="text-[10px] text-emerald-400/90 bg-emerald-950/40 border border-emerald-900/50 rounded px-2 py-1">
                      {result.matched_reasons[0]}
                    </div>
                  )}

                  {/* Detected object tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {result.detected_objects.map((obj, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-300 font-medium"
                      >
                        {obj}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 pt-0 border-t border-neutral-800/80 flex items-center justify-between gap-2 mt-2">
                <span className="text-[11px] font-mono text-neutral-500 tabular-nums">
                  Score: {(result.similarity_score * 100).toFixed(1)}%
                </span>
                <button
                  onClick={() => setSelectedEvidence(result)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white rounded transition-colors flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Play Clip</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
