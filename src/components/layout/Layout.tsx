import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { VelvetShell } from './velvet-shell';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-canvas min-h-screen w-full" style={{ minHeight: '100vh', minWidth: '100vw' }}>
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div
        className="flex min-h-screen"
        style={{ paddingTop: 'var(--header-h)', position: 'relative', zIndex: 1 }}
      >
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="min-h-screen w-full flex-1 min-w-0">
          <VelvetShell className="min-h-[calc(100vh-var(--header-h))] w-full">
            <Outlet />
          </VelvetShell>
        </main>
      </div>
    </div>
  );
}
