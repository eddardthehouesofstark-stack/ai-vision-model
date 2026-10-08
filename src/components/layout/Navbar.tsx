import React, { useState, useEffect } from 'react';
import { useCCTV } from '../../context/CCTVContext';
import { ActiveTab } from '../../types';

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab, settings } = useCCTV();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const navLinks: { id: ActiveTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'search', label: 'Video Search' },
    { id: 'camera-dashboard', label: 'Camera Dashboard' },
    { id: 'upload', label: 'Multi-Upload' },
    { id: 'cameras', label: 'Channels' },
    { id: 'history', label: 'History' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="h-14 border-b border-neutral-800 bg-neutral-950 px-6 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* Zone 1: Brand Wordmark (Single text element) */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveTab('dashboard')}
          className="text-base font-semibold tracking-tight text-neutral-100 hover:text-white transition-colors"
        >
          ArgusEye Surveillance
        </button>
      </div>

      {/* Zone 2: Clean Text Nav Links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-neutral-400">
        {navLinks.map((link) => (
          <button
            key={link.id}
            onClick={() => setActiveTab(link.id)}
            className={`transition-colors whitespace-nowrap py-1 ${
              activeTab === link.id
                ? 'text-neutral-100 font-semibold border-b border-neutral-200'
                : 'hover:text-neutral-200'
            }`}
          >
            {link.label}
          </button>
        ))}
      </nav>

      {/* Zone 3: Primary Actions & Live Timecode OSD */}
      <div className="flex items-center gap-4 text-xs">
        <span className="font-mono tabular-nums text-neutral-400 hidden sm:inline">
          {currentTime || '2026-10-08 09:56:00 UTC'}
        </span>
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{settings?.backend_status === 'online' ? 'Engine Ready' : 'Online'}</span>
        </div>
      </div>
    </header>
  );
};
