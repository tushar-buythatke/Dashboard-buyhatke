import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';


export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative min-h-screen w-full">
      <div className="halo-backdrop" aria-hidden="true" />
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div
        className="relative z-[1] flex min-h-screen"
        style={{ paddingTop: 'var(--h-header-h)' }}
      >
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="w-full min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
