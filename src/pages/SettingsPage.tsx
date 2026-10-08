import React, { useState } from 'react';
import {
  Database,
  Server,
  HardDrive,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { useCCTV } from '../context/CCTVContext';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const { settings, refreshSettings, showNotification } = useCCTV();

  const [testingSupabase, setTestingSupabase] = useState<boolean>(false);
  const [osdEnabled, setOsdEnabled] = useState<boolean>(settings?.osd_overlay_enabled ?? true);
  const [defaultThreshold, setDefaultThreshold] = useState<number>(
    settings?.default_confidence_threshold ?? 0.60
  );

  const handleTestConnection = async () => {
    setTestingSupabase(true);
    try {
      await api.checkHealth();
      showNotification('Supabase PostgreSQL and pgvector verified successfully.');
    } catch (e) {
      showNotification('Connection check failed.');
    } finally {
      setTestingSupabase(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      await api.updateSettings({
        osd_overlay_enabled: osdEnabled,
        default_confidence_threshold: defaultThreshold,
      });
      await refreshSettings();
      showNotification('Surveillance system preferences saved.');
    } catch (err) {
      showNotification('Failed to save preferences.');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-neutral-100 tracking-tight">System Infrastructure & Settings</h1>
        <p className="text-xs text-neutral-400 mt-1">
          Supabase database configurations, pgvector extension, FFmpeg ingestion engine
        </p>
      </div>

      {/* Supabase Integration Card */}
      <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">Supabase Database & pgvector</h2>
              <p className="text-xs text-neutral-400">PostgreSQL with vector similarity indexing</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-400">Connected</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
          <div className="space-y-1">
            <label className="text-neutral-500">Supabase Project Endpoint</label>
            <div className="font-mono text-neutral-200 bg-neutral-950 px-3 py-2 rounded border border-neutral-800 truncate">
              {settings?.supabase_url || 'https://arguseye-cluster.supabase.co'}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-neutral-500">Vector Search Extension</label>
            <div className="flex items-center justify-between font-mono text-neutral-200 bg-neutral-950 px-3 py-2 rounded border border-neutral-800">
              <span>pgvector (512-dim cosine)</span>
              <span className="text-emerald-400 text-[11px] font-sans">Active</span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleTestConnection}
            disabled={testingSupabase}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingSupabase ? 'animate-spin' : ''}`} />
            <span>Test Database Ping</span>
          </button>
        </div>
      </div>

      {/* Backend & Video Processing Health Card */}
      <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-300">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">Video Pipeline & Engine</h2>
              <p className="text-xs text-neutral-400">FFmpeg stream demuxing & keyframe extractor</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-400">Ready</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="space-y-1 bg-neutral-950 p-3 rounded border border-neutral-800">
            <span className="text-neutral-500">FFmpeg Ingestion</span>
            <div className="font-mono text-neutral-200 pt-1">
              {settings?.ffmpeg_version || 'FFmpeg 6.1.1-static'}
            </div>
            <div className="text-[11px] text-neutral-500">H.264/H.265 Hardware Accel</div>
          </div>

          <div className="space-y-1 bg-neutral-950 p-3 rounded border border-neutral-800">
            <span className="text-neutral-500">Storage Consumption</span>
            <div className="font-mono text-neutral-200 pt-1">
              {((settings?.storage_usage_bytes || 879709000) / (1024 * 1024 * 1024)).toFixed(2)} GB / 100 GB
            </div>
            <div className="text-[11px] text-neutral-500">Supabase Storage Volume</div>
          </div>

          <div className="space-y-1 bg-neutral-950 p-3 rounded border border-neutral-800">
            <span className="text-neutral-500">Vision Index Precision</span>
            <div className="font-mono text-neutral-200 pt-1">1 Frame / Second</div>
            <div className="text-[11px] text-neutral-500">CLIP ViT-B/32 Standard</div>
          </div>
        </div>
      </div>

      {/* Surveillance Preferences Card */}
      <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-300">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">Surveillance Player Preferences</h2>
            <p className="text-xs text-neutral-400">Display overlays, timestamps, and confidence defaults</p>
          </div>
        </div>

        <div className="space-y-4 pt-2 text-xs">
          <div className="flex items-center justify-between p-3 rounded bg-neutral-950 border border-neutral-800">
            <div>
              <div className="font-medium text-neutral-200">OSD Timestamp & Channel Overlays</div>
              <div className="text-[11px] text-neutral-500">
                Display live military timestamp and camera callout on video playback
              </div>
            </div>
            <input
              type="checkbox"
              checked={osdEnabled}
              onChange={(e) => setOsdEnabled(e.target.checked)}
              className="w-4 h-4 accent-neutral-200 rounded cursor-pointer"
            />
          </div>

          <div className="p-3 rounded bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-neutral-200">Default Search Confidence Threshold</div>
                <div className="text-[11px] text-neutral-500">
                  Filter out low-scoring visual matches automatically
                </div>
              </div>
              <span className="font-mono tabular-nums text-neutral-200 font-semibold">
                {(defaultThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.4"
              max="0.9"
              step="0.05"
              value={defaultThreshold}
              onChange={(e) => setDefaultThreshold(parseFloat(e.target.value))}
              className="w-full accent-neutral-200"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSavePreferences}
            className="px-4 py-2 bg-neutral-100 hover:bg-white text-neutral-950 font-semibold text-xs rounded transition-colors"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
