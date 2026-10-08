import React from 'react';
import {
  LayoutDashboard,
  Search,
  Video,
  UploadCloud,
  History,
  Sliders,
  ShieldCheck,
  Disc,
} from 'lucide-react';
import { useCCTV } from '../../context/CCTVContext';
import { ActiveTab } from '../../types';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, cameras } = useCCTV();

  const navItems: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'search', label: 'Search Footage', icon: Search },
    { id: 'cameras', label: 'Cameras', icon: Video },
    { id: 'upload', label: 'Upload Video', icon: UploadCloud },
    { id: 'history', label: 'Search History', icon: History },
    { id: 'settings', label: 'System & DB', icon: Sliders },
  ];

  const onlineCount = cameras.filter((c) => c.status === 'online').length;

  return (
    <aside className="w-64 border-r border-neutral-800 bg-neutral-950 flex flex-col justify-between shrink-0 select-none">
      <div className="p-4 space-y-6">
        {/* Navigation list */}
        <div className="space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase text-neutral-500">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-neutral-900 text-neutral-100 font-semibold border border-neutral-800'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-neutral-100' : 'text-neutral-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Live Camera Matrix Quick Watch */}
        <div className="space-y-2 pt-2 border-t border-neutral-900">
          <div className="px-3 flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase text-neutral-500">
            <span>Cameras</span>
            <span className="font-mono tabular-nums text-neutral-400">
              {onlineCount}/{cameras.length} Active
            </span>
          </div>

          <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
            {cameras.map((cam) => (
              <button
                key={cam.id}
                onClick={() => {
                  setActiveTab('cameras');
                }}
                className="w-full text-left px-3 py-1.5 rounded hover:bg-neutral-900/70 transition-colors flex items-center justify-between text-xs text-neutral-300 group"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      cam.status === 'online'
                        ? 'bg-emerald-500'
                        : cam.status === 'maintenance'
                        ? 'bg-amber-500'
                        : 'bg-neutral-600'
                    }`}
                  />
                  <span className="truncate group-hover:text-neutral-100 text-[12px]">{cam.name}</span>
                </div>
                <span className="font-mono tabular-nums text-[11px] text-neutral-500 shrink-0">
                  {cam.camera_id}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer System Status Information */}
      <div className="p-4 border-t border-neutral-800/80 bg-neutral-950">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <div className="flex-1 truncate">
            <div className="text-[12px] font-medium text-neutral-200">Supabase pgvector</div>
            <div className="text-[11px] text-neutral-500 truncate">Vision index active</div>
          </div>
          <Disc className="w-3.5 h-3.5 text-neutral-500 animate-spin" />
        </div>
      </div>
    </aside>
  );
};
