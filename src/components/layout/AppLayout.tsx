import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useCCTV } from '../../context/CCTVContext';
import { DashboardPage } from '../../pages/DashboardPage';
import { SearchPage } from '../../pages/SearchPage';
import { CamerasPage } from '../../pages/CamerasPage';
import { CameraDashboardPage } from '../../pages/CameraDashboardPage';
import { UploadPage } from '../../pages/UploadPage';
import { HistoryPage } from '../../pages/HistoryPage';
import { SettingsPage } from '../../pages/SettingsPage';
import { EvidenceModal } from '../player/EvidenceModal';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { activeTab, notification } = useCCTV();

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'search':
        return <SearchPage />;
      case 'cameras':
        return <CamerasPage />;
      case 'camera-dashboard':
        return <CameraDashboardPage />;
      case 'upload':
        return <UploadPage />;
      case 'history':
        return <HistoryPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-neutral-800 selection:text-neutral-200">
      {/* Top Bar Contract (Wordmark, Nav links, Action/OSD) */}
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        {/* Enterprise Surveillance Sidebar */}
        <Sidebar />

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-8 bg-neutral-950">
          {renderActivePage()}
        </main>
      </div>

      {/* Global Interactive Evidence Modal */}
      <EvidenceModal />

      {/* Toast Notification Banner */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-700 shadow-2xl text-xs text-neutral-100 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}
    </div>
  );
};
