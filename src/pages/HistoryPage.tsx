import React from 'react';
import {
  History,
  Trash2,
  Search,
  ArrowRight,
  Clock,
  Video,
  CheckCircle2,
  RotateCw,
} from 'lucide-react';
import { useCCTV } from '../context/CCTVContext';
import { api } from '../services/api';

export const HistoryPage: React.FC = () => {
  const {
    searchHistory,
    refreshHistory,
    triggerSearch,
    setActiveTab,
    showNotification,
  } = useCCTV();

  const handleClearHistory = async () => {
    if (confirm('Clear all search history logs?')) {
      try {
        await api.clearSearchHistory();
        await refreshHistory();
        showNotification('Search history logs cleared.');
      } catch (err) {
        showNotification('Failed to clear search history.');
      }
    }
  };

  const handleRerun = (query: string, cameraFilter: string | null) => {
    triggerSearch(query, cameraFilter || undefined);
    setActiveTab('search');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-100 tracking-tight">Surveillance Query Audit Trail</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Historical log of natural language CCTV video searches and forensic investigations
          </p>
        </div>

        {searchHistory.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-red-400 border border-neutral-800 text-xs rounded transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History Log</span>
          </button>
        )}
      </div>

      {/* History Table */}
      {searchHistory.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-neutral-900/20 border border-neutral-800 rounded-xl p-8">
          <History className="w-8 h-8 text-neutral-500 mx-auto" />
          <h3 className="text-sm font-semibold text-neutral-200">No previous searches recorded</h3>
          <p className="text-xs text-neutral-400">
            Queries launched from the Video Search bar will be tracked here.
          </p>
        </div>
      ) : (
        <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/40">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950/70 text-neutral-400">
                <th className="py-3 px-4 font-semibold">Natural Language Query</th>
                <th className="py-3 px-4 font-semibold">Camera Filter</th>
                <th className="py-3 px-4 font-semibold">Results Found</th>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {searchHistory.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-900/60 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-neutral-100 max-w-md">
                    "{item.query}"
                  </td>
                  <td className="py-3.5 px-4 font-mono text-neutral-300">
                    {item.camera_filter || (
                      <span className="text-neutral-500 font-sans">All Channels</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono tabular-nums text-neutral-200">
                    {item.results_count} incidents
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] tabular-nums text-neutral-400">
                    {new Date(item.created_at).toLocaleTimeString()} ·{' '}
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-emerald-400 text-[11px] font-medium inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{item.status}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleRerun(item.query, item.camera_filter)}
                      className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-colors text-[11px] font-medium inline-flex items-center gap-1"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>Re-run</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
