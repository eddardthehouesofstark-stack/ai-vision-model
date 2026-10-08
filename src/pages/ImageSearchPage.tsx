import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Search,
  Play,
  Video,
  SlidersHorizontal,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera as CameraIcon,
  Clock,
  Calendar,
  Cpu,
  History,
  Crosshair,
  Image as ImageIcon,
  Plus,
} from 'lucide-react';
import { useCCTV } from '../context/CCTVContext';
import { api } from '../services/api';
import {
  ReferenceImageRecord,
  ImageSearchResponse,
  SearchResultItem,
} from '../types';

export const ImageSearchPage: React.FC = () => {
  const {
    cameras,
    videos,
    refreshVideos,
    refreshEvents,
    refreshCameras,
    refreshHistory,
    setSelectedEvidence,
    showNotification,
  } = useCCTV();

  // Reference image state
  const [referenceImage, setReferenceImage] = useState<ReferenceImageRecord | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);
  const [isSearchingImage, setIsSearchingImage] = useState<boolean>(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState<boolean>(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState<number>(0);

  // Search Filters (Camera, Date, Time, Similarity Threshold, Object Type)
  const [selectedCameraId, setSelectedCameraId] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [timeFrom, setTimeFrom] = useState<string>('');
  const [timeTo, setTimeTo] = useState<string>('');
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.60);
  const [objectTypeFilter, setObjectTypeFilter] = useState<string>('all');

  // Results & Past Searches state
  const [searchResponse, setSearchResponse] = useState<ImageSearchResponse | null>(null);
  const [pastSearches, setPastSearches] = useState<ImageSearchResponse[]>([]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const sampleReferenceImages = [
    {
      label: 'Person + Backpack / Bag',
      sub: 'Night Turnstile Subject',
      url: '/thumbnails/ref_person_bag.jpg',
      fallbackUrl: '/thumbnails/gate_night_2s.jpg',
    },
    {
      label: 'Red Car',
      sub: 'Sedan Vehicle Profile',
      url: '/thumbnails/ref_red_car.jpg',
      fallbackUrl: '/thumbnails/parking_3s.jpg',
    },
    {
      label: 'Motorcycle',
      sub: 'Two-Wheel Motorbike',
      url: '/thumbnails/ref_motorcycle.jpg',
      fallbackUrl: '/thumbnails/parking_3s.jpg',
    },
    {
      label: 'Bicycle',
      sub: 'Commuter Cyclist',
      url: '/thumbnails/ref_bicycle.jpg',
      fallbackUrl: '/thumbnails/parking_7s.jpg',
    },
    {
      label: 'Suitcase / Briefcase',
      sub: 'Corridor Luggage Subject',
      url: '/thumbnails/ref_suitcase_briefcase.jpg',
      fallbackUrl: '/thumbnails/corridor_2s.jpg',
    },
    {
      label: 'Freight Truck',
      sub: 'Delivery Vehicle',
      url: '/thumbnails/ref_freight_truck.jpg',
      fallbackUrl: '/thumbnails/dock_3s.jpg',
    },
  ];

  const loadPastImageSearches = async () => {
    try {
      const data = await api.getImageSearchResults();
      if (data && Array.isArray(data.searches)) {
        setPastSearches(data.searches);
      }
    } catch {
      // ignore initial load error
    }
  };

  useEffect(() => {
    loadPastImageSearches();
  }, []);

  // Step 1: Allow uploading a new CCTV video directly from the Search by Image workflow
  const handleQuickVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files: File[] = Array.from(e.target.files);
    e.target.value = '';

    setIsUploadingVideo(true);
    setVideoUploadProgress(10);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const nextCamNum = cameras.length + i + 1;
        const camId = `CAM-${String(nextCamNum).padStart(2, '0')}`;
        const formData = new FormData();
        formData.append('video_file', file);
        formData.append('camera_id', camId);
        formData.append('camera_name', `Uploaded Camera ${camId}`);
        formData.append('create_camera', 'true');
        formData.append('recorded_date', '2026-10-08');
        formData.append('recorded_start_time', '09:00:00');
        formData.append('recorded_end_time', '09:00:12');

        await api.uploadVideo(formData, (prog) => {
          const pct = Math.round((prog.loaded * 100) / (prog.total || 1));
          setVideoUploadProgress(Math.min(95, pct));
        });
      }

      await Promise.all([refreshVideos(), refreshEvents(), refreshCameras()]);
      setVideoUploadProgress(100);
      showNotification(`Uploaded and indexed ${files.length} CCTV video(s) for visual search.`);

      // If a reference image is already loaded, automatically re-run similarity search across the newly uploaded video
      if (referenceImage) {
        await executeSimilaritySearch(referenceImage.id);
      }
    } catch (err: any) {
      showNotification(err?.response?.data?.error || 'Failed to upload CCTV video.');
    } finally {
      setIsUploadingVideo(false);
      setVideoUploadProgress(0);
    }
  };

  // Step 2 & 3: Upload Reference Image & Extract Visual Embeddings
  const processReferenceImageFile = async (file: File) => {
    setIsAnalyzingImage(true);
    try {
      const formData = new FormData();
      formData.append('reference_image', file);

      const uploadedRef = await api.uploadReferenceImage(formData);
      setReferenceImage(uploadedRef);
      showNotification(
        `Extracted ${uploadedRef.embedding_dim}-D visual embedding: ${uploadedRef.visual_features.primary_class.toUpperCase()} detected.`
      );

      // Automatically run similarity search after extracting reference embedding
      await executeSimilaritySearch(uploadedRef.id);
    } catch (err: any) {
      showNotification(
        err?.response?.data?.error || 'Failed to analyze reference image with Vision model.'
      );
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processReferenceImageFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith('image/')) {
        showNotification('Please drop a valid image file (JPG, PNG, WebP).');
        return;
      }
      processReferenceImageFile(file);
    }
  };

  // Load a sample reference crop by fetching its binary bytes and uploading as a real image blob
  const handleSelectSampleReference = async (sample: (typeof sampleReferenceImages)[0]) => {
    setIsAnalyzingImage(true);
    try {
      let res = await fetch(sample.url);
      if (!res.ok) {
        res = await fetch(sample.fallbackUrl);
      }
      const blob = await res.blob();
      const file = new File([blob], 'reference_query.jpg', { type: blob.type || 'image/jpeg' });
      await processReferenceImageFile(file);
    } catch {
      showNotification('Failed to load sample reference image.');
      setIsAnalyzingImage(false);
    }
  };

  // Step 5 & 6: Compare reference image embedding against detected objects in CCTV videos
  const executeSimilaritySearch = async (refIdOverride?: string) => {
    const targetRefId = refIdOverride || referenceImage?.id;
    if (!targetRefId) {
      showNotification('Please upload a reference image first.');
      return;
    }

    setIsSearchingImage(true);
    try {
      const response = await api.searchByImage({
        reference_image_id: targetRefId,
        camera_id: selectedCameraId === 'all' ? undefined : selectedCameraId,
        date: dateFilter || undefined,
        time_from: timeFrom || undefined,
        time_to: timeTo || undefined,
        similarity_threshold: similarityThreshold,
        object_type: objectTypeFilter === 'all' ? undefined : objectTypeFilter,
      });

      setSearchResponse(response);
      await Promise.all([loadPastImageSearches(), refreshHistory()]);
    } catch (err: any) {
      showNotification(err?.response?.data?.error || 'Visual similarity search failed.');
    } finally {
      setIsSearchingImage(false);
    }
  };

  // Load a previous search session by ID via GET /image-search/{id}
  const handleLoadPastSession = async (sessionId: string) => {
    try {
      const session = await api.getImageSearchById(sessionId);
      setSearchResponse(session);
      showNotification(`Loaded image search session (${session.total_results} matches).`);
    } catch {
      showNotification('Could not load image search session.');
    }
  };

  const handleResetFilters = () => {
    setSelectedCameraId('all');
    setDateFilter('');
    setTimeFrom('');
    setTimeTo('');
    setSimilarityThreshold(0.60);
    setObjectTypeFilter('all');
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-100 tracking-tight flex items-center gap-2.5">
            <span>Search by Image (Visual Re-Identification)</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/80">
              128-D Vision Embeddings
            </span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Upload a reference image of a person, vehicle, bag, or object to locate every visual occurrence across uploaded CCTV videos
          </p>
        </div>

        {/* Step 1: Inline CCTV Video Upload Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <input
            ref={videoInputRef}
            type="file"
            multiple
            accept="video/*,.mp4,.mov,.avi,.mkv,.webm"
            onChange={handleQuickVideoUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={isUploadingVideo}
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {isUploadingVideo ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                <span>Indexing Video ({videoUploadProgress}%)...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Upload CCTV Video ({videos.length} Indexed)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Top Section: Reference Image Upload + Visual Feature Embedding Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Reference Image Dropzone & Quick Reference Objects */}
        <div className="lg:col-span-2 space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleImageDrop}
            onClick={() => imageInputRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all border-neutral-800 bg-neutral-900/40 hover:border-emerald-600/60 hover:bg-neutral-900/70 group"
          >
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="hidden"
            />

            <div className="w-11 h-11 rounded-full bg-neutral-900 border border-neutral-800 group-hover:border-emerald-500/50 flex items-center justify-center text-neutral-400 group-hover:text-emerald-400 transition-colors mb-2.5">
              {isAnalyzingImage ? (
                <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
              ) : (
                <UploadCloud className="w-5 h-5" />
              )}
            </div>

            <h3 className="text-sm font-semibold text-neutral-200">
              {isAnalyzingImage
                ? 'Extracting Visual Features & Embeddings with Vision Model...'
                : 'Drag & Drop Reference Image Here, or Click to Upload'}
            </h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-md">
              Upload a photo of a Person, Backpack, Red Car, Motorcycle, Suitcase, Bicycle, or Truck to search all CCTV footage by visual similarity.
            </p>
          </div>

          {/* Quick Reference Image Samples */}
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Sample Reference Objects (Click to Extract Embedding & Search)
              </span>
              <span className="text-[11px] font-mono text-neutral-500">
                Pure Visual Feature Matching
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {sampleReferenceImages.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isAnalyzingImage || isSearchingImage}
                  onClick={() => handleSelectSampleReference(sample)}
                  className="group rounded-lg bg-neutral-950 border border-neutral-800 hover:border-emerald-600/60 overflow-hidden text-left transition-all flex flex-col"
                >
                  <div className="relative h-16 w-full bg-neutral-900 overflow-hidden">
                    <img
                      src={sample.url}
                      alt={sample.label}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = sample.fallbackUrl;
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-2 space-y-0.5">
                    <div className="text-[11px] font-semibold text-neutral-200 truncate group-hover:text-emerald-400">
                      {sample.label}
                    </div>
                    <div className="text-[10px] text-neutral-500 truncate">{sample.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Active Reference Image & Extracted Embedding Telemetry */}
        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-neutral-200">
                Reference Target & Embedding
              </span>
            </div>
            {referenceImage && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                {referenceImage.embedding_dim}-D Vector Ready
              </span>
            )}
          </div>

          {!referenceImage ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-neutral-500 space-y-2">
              <ImageIcon className="w-8 h-8 text-neutral-700" />
              <div className="text-xs font-medium text-neutral-400">No Reference Image Loaded</div>
              <p className="text-[11px] text-neutral-500 max-w-xs">
                Upload an image or select a sample object on the left to extract visual embeddings.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Reference Image Preview with Detected Subject Bounding Box */}
              <div className="relative h-36 w-full rounded-lg overflow-hidden bg-black border border-neutral-800">
                <img
                  src={referenceImage.image_url}
                  alt="Uploaded Reference"
                  className="w-full h-full object-contain"
                />
                {referenceImage.visual_features.bounding_box && (
                  <div
                    className="absolute border-2 border-emerald-400 pointer-events-none"
                    style={{
                      left: `${referenceImage.visual_features.bounding_box.x * 100}%`,
                      top: `${referenceImage.visual_features.bounding_box.y * 100}%`,
                      width: `${referenceImage.visual_features.bounding_box.width * 100}%`,
                      height: `${referenceImage.visual_features.bounding_box.height * 100}%`,
                      boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
                    }}
                  >
                    <span className="absolute -top-4 left-0 bg-emerald-500 text-neutral-950 font-mono font-bold text-[9px] px-1 uppercase">
                      {referenceImage.visual_features.primary_class}
                    </span>
                  </div>
                )}
              </div>

              {/* Extracted Visual Features */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Detected Class:</span>
                  <span className="font-mono font-semibold text-emerald-400 uppercase">
                    {referenceImage.visual_features.primary_class} (
                    {(referenceImage.visual_features.confidence * 100).toFixed(0)}%)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Visual Colors:</span>
                  <span className="font-mono text-neutral-200">
                    {referenceImage.visual_features.colors.length > 0
                      ? referenceImage.visual_features.colors.join(', ')
                      : 'neutral'}
                  </span>
                </div>

                <div className="text-[11px] text-neutral-300 bg-neutral-950 p-2 rounded border border-neutral-800 truncate">
                  {referenceImage.visual_features.description}
                </div>
              </div>

              {/* 128-D Embedding Vector Bar Preview */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                  <span>EMBEDDING SIGNATURE (L2 NORMALIZED)</span>
                  <span>COSINE METRIC</span>
                </div>
                <div className="h-6 bg-neutral-950 border border-neutral-800 rounded p-1 flex items-end gap-0.5 overflow-hidden">
                  {referenceImage.embedding.slice(0, 48).map((val, i) => {
                    const heightPct = Math.min(100, Math.max(12, Math.abs(val) * 320));
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-emerald-500/80 rounded-t"
                        style={{ height: `${heightPct}%` }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search Filters Bar (Camera, Date, Time, Similarity Threshold, Object Type) */}
      <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            <span>Visual Similarity Search Filters</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1 rounded text-[11px] text-neutral-400 hover:text-white flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>

            <button
              type="button"
              onClick={() => executeSimilaritySearch()}
              disabled={!referenceImage || isSearchingImage || isAnalyzingImage}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-600 text-neutral-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
            >
              {isSearchingImage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Comparing Embeddings...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Run Similarity Search</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
          {/* 1. Camera Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
              <CameraIcon className="w-3 h-3 text-neutral-500" />
              <span>Camera Channel</span>
            </label>
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 font-mono focus:outline-none focus:border-neutral-700"
            >
              <option value="all">All Cameras ({cameras.length})</option>
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.camera_id}>
                  {cam.camera_id} · {cam.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Object Type Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-neutral-500" />
              <span>Object Type</span>
            </label>
            <select
              value={objectTypeFilter}
              onChange={(e) => setObjectTypeFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 focus:outline-none focus:border-neutral-700"
            >
              <option value="all">Auto (From Reference Image)</option>
              <option value="person">Person</option>
              <option value="backpack">Backpack</option>
              <option value="bag">Bag / Duffel / Handbag</option>
              <option value="suitcase">Suitcase / Briefcase</option>
              <option value="car">Car / Sedan</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="bicycle">Bicycle</option>
              <option value="truck">Truck / Freight</option>
              <option value="bus">Bus</option>
            </select>
          </div>

          {/* 3. Date Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-neutral-500" />
              <span>Recording Date</span>
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 font-mono focus:outline-none focus:border-neutral-700"
            />
          </div>

          {/* 4. Time Window Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-neutral-500" />
              <span>Time Window (From - To)</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="time"
                value={timeFrom}
                onChange={(e) => setTimeFrom(e.target.value)}
                className="w-full px-2 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 font-mono"
              />
              <span className="text-neutral-500">-</span>
              <input
                type="time"
                value={timeTo}
                onChange={(e) => setTimeTo(e.target.value)}
                className="w-full px-2 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 font-mono"
              />
            </div>
          </div>

          {/* 5. Similarity Threshold Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-neutral-400">
              <span>Similarity Threshold</span>
              <span className="font-mono text-emerald-400 font-semibold tabular-nums">
                {(similarityThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.40"
              max="0.95"
              step="0.05"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
              className="w-full accent-emerald-400 mt-1"
            />
          </div>
        </div>
      </div>

      {/* Results Section */}
      {searchResponse && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
                <span
                  className={`w-2 h-2 rounded-full ${
                    searchResponse.total_results > 0
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-amber-400'
                  }`}
                />
                <span>Visual Similarity Search Verdict</span>
                <span className="text-[11px] font-mono text-neutral-500">
                  · {searchResponse.execution_time_ms}ms
                </span>
              </div>
              <p className="text-sm font-medium text-neutral-100">
                {searchResponse.total_results === 0
                  ? 'No Match Found.'
                  : searchResponse.answer_summary}
              </p>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
              <div className="text-right font-mono">
                <div className="text-xs text-neutral-400">Matches Ranked</div>
                <div className="text-sm font-bold text-emerald-400 tabular-nums">
                  {searchResponse.total_results} Occurrence
                  {searchResponse.total_results === 1 ? '' : 's'}
                </div>
              </div>
            </div>
          </div>

          {/* Empty / No Match Found State */}
          {searchResponse.total_results === 0 ? (
            <div className="py-16 text-center space-y-3 bg-neutral-900/30 border border-neutral-800 rounded-xl p-8">
              <AlertCircle className="w-9 h-9 text-amber-400 mx-auto" />
              <h3 className="text-base font-bold text-neutral-100">No Match Found.</h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                No visually similar objects were detected across the indexed CCTV video footage above the{' '}
                {(similarityThreshold * 100).toFixed(0)}% similarity threshold.
              </p>
            </div>
          ) : (
            /* Ranked Matching Occurrences Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResponse.results.map((result: SearchResultItem, rankIdx: number) => {
                const primaryBox =
                  result.bounding_boxes?.find((b) => b.is_match) || result.bounding_boxes?.[0];

                return (
                  <div
                    key={`${result.event_id}_${rankIdx}`}
                    className="group rounded-xl bg-neutral-900/50 border border-neutral-800 hover:border-emerald-700/70 overflow-hidden transition-all flex flex-col justify-between shadow-sm"
                  >
                    <div>
                      {/* Highlighted Thumbnail with Bounding Box around the matched object */}
                      <div
                        onClick={() => setSelectedEvidence(result)}
                        className="relative aspect-video bg-neutral-950 cursor-pointer overflow-hidden"
                      >
                        <img
                          src={result.thumbnail_url}
                          alt={result.camera_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Highlighted Bounding Box Overlay around Matched Object */}
                        {primaryBox && (
                          <div
                            className="absolute border-2 border-emerald-400 pointer-events-none z-10"
                            style={{
                              left: `${primaryBox.x * 100}%`,
                              top: `${primaryBox.y * 100}%`,
                              width: `${primaryBox.width * 100}%`,
                              height: `${primaryBox.height * 100}%`,
                              boxShadow: '0 0 16px rgba(16, 185, 129, 0.65)',
                            }}
                          >
                            <div className="absolute -top-5 left-0 bg-emerald-500 text-neutral-950 font-mono font-bold text-[9px] px-1.5 py-0.5 uppercase whitespace-nowrap shadow">
                              MATCH {(result.similarity_score * 100).toFixed(1)}%
                            </div>
                          </div>
                        )}

                        {/* Top Left Camera ID & Name OSD */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/85 px-2 py-0.5 rounded text-[11px] font-mono text-neutral-200 z-20">
                          <span className="font-bold text-emerald-400">{result.camera_id}</span>
                          <span className="text-neutral-500">·</span>
                          <span className="truncate max-w-[130px]">{result.camera_name}</span>
                        </div>

                        {/* Top Right Similarity Score (%) Badge */}
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
                          <span className="bg-emerald-950/95 border border-emerald-700 text-emerald-300 px-2 py-0.5 rounded text-[11px] font-mono font-bold tabular-nums">
                            {(result.similarity_score * 100).toFixed(1)}% Similarity
                          </span>
                        </div>

                        {/* Center Play Hover Icon */}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          <div className="w-12 h-12 rounded-full bg-neutral-900/90 border border-neutral-700 flex items-center justify-center text-white shadow-xl">
                            <Play className="w-5 h-5 ml-0.5" />
                          </div>
                        </div>

                        {/* Bottom Timestamp Bar */}
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] font-mono tabular-nums text-neutral-200 bg-black/85 px-2.5 py-1 rounded z-20">
                          <span>
                            {result.date} · {result.start_time}
                          </span>
                          <span className="text-emerald-400">
                            +{result.timestamp_offset_seconds}s
                          </span>
                        </div>
                      </div>

                      {/* Card Metadata Body */}
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-950/80 p-2.5 rounded-lg border border-neutral-800/80 font-mono">
                          <div>
                            <div className="text-[10px] text-neutral-500 uppercase">
                              Similarity Score
                            </div>
                            <div className="text-sm font-bold text-emerald-400 tabular-nums">
                              {(result.similarity_score * 100).toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-neutral-500 uppercase">
                              Detection Confidence
                            </div>
                            <div className="text-sm font-bold text-neutral-200 tabular-nums">
                              {(result.confidence * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-neutral-200 leading-relaxed line-clamp-2">
                          {result.description}
                        </p>

                        {result.matched_reasons && result.matched_reasons[0] && (
                          <div className="text-[10px] text-emerald-400/90 bg-emerald-950/40 border border-emerald-900/50 rounded px-2 py-1 font-mono">
                            {result.matched_reasons[0]}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Action: Play Video at Exact Timestamp */}
                    <div className="p-4 pt-0 border-t border-neutral-800/80 flex items-center justify-between gap-2 mt-2">
                      <div className="text-[11px] font-mono text-neutral-400 truncate">
                        {result.camera_name} ({result.camera_id})
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedEvidence(result)}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded transition-colors flex items-center gap-1.5 shrink-0"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Play Video ({result.start_time})</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Stored Image Search History Log */}
      {pastSearches.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-neutral-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-neutral-500" />
              <span>Recent Visual Similarity Searches</span>
            </h2>
            <span className="text-[11px] font-mono text-neutral-500">
              {pastSearches.length} stored session(s)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {pastSearches.slice(0, 4).map((sess) => (
              <button
                key={sess.id}
                type="button"
                onClick={() => handleLoadPastSession(sess.id)}
                className="p-3 rounded-lg bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 text-left transition-all flex items-center gap-3"
              >
                <img
                  src={sess.reference_image_url}
                  alt="Reference"
                  className="w-12 h-12 rounded object-cover bg-neutral-950 border border-neutral-800 shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="text-xs font-semibold text-neutral-200 uppercase font-mono truncate">
                    {sess.visual_features?.primary_class || 'Object'}
                  </div>
                  <div className="text-[11px] text-emerald-400 font-mono">
                    {sess.total_results} matches · Top {(sess.top_similarity_score * 100).toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono">
                    {new Date(sess.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
