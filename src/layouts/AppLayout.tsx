import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/ui/Sidebar';
import { MobileTopBar } from '../components/ui/MobileTopBar';
import { MobileBottomNav } from '../components/ui/MobileBottomNav';
import { LibrarySetupScreen } from '../components/setup/LibrarySetupScreen';
import { useLibrarySetup } from '../hooks/useLibrarySetup';
import { useState } from 'react';

export const AppLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const {
    checking,
    needsSetup,
    saving,
    error,
    chooseFolder,
  } = useLibrarySetup();

  if (checking) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <p className="text-gray-500">Cargando BookHive...</p>
      </div>
    );
  }

  if (needsSetup) {
    return (
      <LibrarySetupScreen
        onChooseFolder={chooseFolder}
        saving={saving}
        error={error}
      />
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-app-bg text-gray-900">
      {/* Mobile Top Bar */}
      <MobileTopBar onMenuClick={() => setIsSidebarOpen(true)} />

      {/* Desktop Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden w-full pt-0 md:pt-0 pb-20">
        <div className="flex-1 overflow-y-auto pb-28 md:pb-6 px-4 md:px-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};