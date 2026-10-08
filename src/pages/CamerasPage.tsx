import React, { useState } from 'react';
import {
  Plus,
  Video,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  ExternalLink,
  Search,
  X,
} from 'lucide-react';
import { useCCTV } from '../context/CCTVContext';
import { Camera, CameraStatus } from '../types';
import { api } from '../services/api';

export const CamerasPage: React.FC = () => {
  const { cameras, refreshCameras, showNotification, videos, events, setSelectedEvidence, setActiveTab } =
    useCCTV();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedCameraDetails, setSelectedCameraDetails] = useState<Camera | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [formData, setFormData] = useState({
    camera_id: '',
    name: '',
    location: '',
    resolution: '1080p (1920x1080)',
    fps: 30,
    rtsp_url: '',
    status: 'online' as CameraStatus,
  });

  const handleOpenAdd = () => {
    setEditingCamera(null);
    setFormData({
      camera_id: `CAM-0${cameras.length + 1}`,
      name: '',
      location: '',
      resolution: '1080p (1920x1080)',
      fps: 30,
      rtsp_url: `rtsp://192.168.10.${10 + cameras.length}:554/live`,
      status: 'online',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cam: Camera) => {
    setEditingCamera(cam);
    setFormData({
      camera_id: cam.camera_id,
      name: cam.name,
      location: cam.location,
      resolution: cam.resolution,
      fps: cam.fps,
      rtsp_url: cam.rtsp_url || '',
      status: cam.status,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (cam: Camera) => {
    if (confirm(`Are you sure you want to delete camera ${cam.camera_id} (${cam.name})?`)) {
      try {
        await api.deleteCamera(cam.id);
        await refreshCameras();
        showNotification(`Camera ${cam.camera_id} deleted.`);
        if (selectedCameraDetails?.id === cam.id) {
          setSelectedCameraDetails(null);
        }
      } catch (err) {
        showNotification('Failed to delete camera.');
      }
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCamera) {
        await api.updateCamera(editingCamera.id, formData);
        showNotification(`Camera ${formData.camera_id} updated.`);
      } else {
        await api.createCamera(formData);
        showNotification(`Camera ${formData.camera_id} registered successfully.`);
      }
      await refreshCameras();
      setIsModalOpen(false);
    } catch (err) {
      showNotification('Error saving camera.');
    }
  };

  const filteredCameras = cameras.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesSearch =
      c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.camera_id.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.location.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-100 tracking-tight">Camera Channel Management</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Configure registered RTSP streams, channel resolutions, and surveillance points
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('camera-dashboard')}
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5"
          >
            <Video className="w-3.5 h-3.5 text-emerald-400" />
            <span>Open Camera Dashboard</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-neutral-100 hover:bg-white text-neutral-950 font-medium text-xs rounded-md transition-colors flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register New Camera</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-neutral-900/60 border border-neutral-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter by name, ID or location..."
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-700"
          />
        </div>

        {/* Interactive Segmented Filter Control */}
        <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-lg border border-neutral-800">
          {[
            { id: 'all', label: 'All Channels' },
            { id: 'online', label: 'Online' },
            { id: 'offline', label: 'Offline' },
            { id: 'maintenance', label: 'Maintenance' },
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

      {/* Cameras Table */}
      <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/40">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-950/70 text-neutral-400">
              <th className="py-3 px-4 font-semibold">Camera ID</th>
              <th className="py-3 px-4 font-semibold">Name & Location</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold">Stream Resolution</th>
              <th className="py-3 px-4 font-semibold">Indexed Events</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/80">
            {filteredCameras.map((cam) => (
              <tr key={cam.id} className="hover:bg-neutral-900/60 transition-colors">
                <td className="py-3.5 px-4 font-mono font-semibold text-neutral-200">
                  {cam.camera_id}
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-medium text-neutral-100">{cam.name}</div>
                  <div className="text-[11px] text-neutral-400">{cam.location}</div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        cam.status === 'online'
                          ? 'bg-emerald-500'
                          : cam.status === 'maintenance'
                          ? 'bg-amber-500'
                          : 'bg-neutral-600'
                      }`}
                    />
                    <span className="capitalize text-neutral-300">{cam.status}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono tabular-nums text-neutral-300">
                  {cam.resolution} @ {cam.fps}fps
                </td>
                <td className="py-3.5 px-4 font-mono tabular-nums text-neutral-300">
                  {cam.event_count} events
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedCameraDetails(cam)}
                      className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                      title="Inspect Camera Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(cam)}
                      className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                      title="Edit Camera"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cam)}
                      className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-red-400 transition-colors"
                      title="Delete Camera"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Camera Details Drawer / Card */}
      {selectedCameraDetails && (
        <div className="p-6 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-200">
                {selectedCameraDetails.camera_id}
              </span>
              <h2 className="text-sm font-semibold text-neutral-100">
                {selectedCameraDetails.name} · Diagnostic Details
              </h2>
            </div>
            <button
              onClick={() => setSelectedCameraDetails(null)}
              className="text-neutral-400 hover:text-white p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            {/* Live Camera Video Stream Preview */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-neutral-800">
              {selectedCameraDetails.video_url ? (
                <video
                  src={selectedCameraDetails.video_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={selectedCameraDetails.thumbnail_url}
                  alt={selectedCameraDetails.name}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-neutral-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 font-semibold">LIVE</span>
                <span>{selectedCameraDetails.camera_id}</span>
              </div>
              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono tabular-nums text-neutral-300">
                {selectedCameraDetails.resolution} · {selectedCameraDetails.fps} FPS
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="text-neutral-500">Channel Location</div>
                <div className="text-neutral-200 font-medium">{selectedCameraDetails.location}</div>
              </div>

              <div>
                <div className="text-neutral-500">RTSP Stream URI</div>
                <div className="font-mono text-[11px] text-neutral-300 truncate bg-neutral-950 p-2 rounded border border-neutral-800 mt-0.5">
                  {selectedCameraDetails.rtsp_url || 'rtsp://internal-surveillance-gateway:554/live'}
                </div>
              </div>

              <div>
                <div className="text-neutral-500">Hardware Connection Status</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-neutral-200 font-medium capitalize">
                    {selectedCameraDetails.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs flex flex-col justify-between">
              <div>
                <div className="text-neutral-500">Indexed Analytics</div>
                <div className="text-neutral-200 mt-0.5">
                  {selectedCameraDetails.video_count} clips recorded · {selectedCameraDetails.event_count} AI events cataloged
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-800/80">
                <button
                  onClick={() => {
                    setSelectedEvidence({
                      id: `live_${selectedCameraDetails.camera_id}`,
                      camera_id: selectedCameraDetails.camera_id,
                      camera_name: selectedCameraDetails.name,
                      video_id: 'live_stream',
                      date: '2026-10-08',
                      start_time: '09:00:00',
                      end_time: '10:00:00',
                      timestamp_offset_seconds: 0,
                      description: `Live video stream for ${selectedCameraDetails.name} (${selectedCameraDetails.location})`,
                      detected_objects: ['security', 'stream'],
                      confidence: 1.0,
                      thumbnail_url: selectedCameraDetails.thumbnail_url || '',
                      video_url: selectedCameraDetails.video_url || '/videos/cctv_gate_night.mp4',
                      bounding_boxes: [],
                    });
                  }}
                  className="w-full py-2 bg-neutral-100 hover:bg-white text-neutral-950 font-semibold text-xs rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Launch Live Video Inspection Console</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Camera Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
              <h2 className="text-sm font-semibold text-neutral-100">
                {editingCamera ? 'Edit Surveillance Camera' : 'Register New Surveillance Camera'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-neutral-300 font-medium">Camera ID</label>
                  <input
                    type="text"
                    required
                    value={formData.camera_id}
                    onChange={(e) => setFormData({ ...formData, camera_id: e.target.value })}
                    placeholder="e.g. CAM-06"
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-100 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-neutral-300 font-medium">Camera Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as CameraStatus })
                    }
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-100"
                  >
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-neutral-300 font-medium">Display Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. East Boundary Fence"
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-neutral-300 font-medium">Location</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Sector 4 External Perimeter"
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-neutral-300 font-medium">Resolution</label>
                  <select
                    value={formData.resolution}
                    onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-100 font-mono"
                  >
                    <option value="1080p (1920x1080)">1080p (1920x1080)</option>
                    <option value="4K (3840x2160)">4K (3840x2160)</option>
                    <option value="720p (1280x720)">720p (1280x720)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-neutral-300 font-medium">Frame Rate (FPS)</label>
                  <input
                    type="number"
                    value={formData.fps}
                    onChange={(e) => setFormData({ ...formData, fps: parseInt(e.target.value) || 30 })}
                    min="10"
                    max="60"
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-100 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-neutral-300 font-medium">RTSP / Stream URL</label>
                <input
                  type="text"
                  value={formData.rtsp_url}
                  onChange={(e) => setFormData({ ...formData, rtsp_url: e.target.value })}
                  placeholder="rtsp://192.168.1.100:554/live"
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-100 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded text-neutral-400 hover:text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-100 hover:bg-white text-neutral-950 font-semibold rounded"
                >
                  {editingCamera ? 'Save Changes' : 'Register Camera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
