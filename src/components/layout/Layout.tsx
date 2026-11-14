import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <div className="e-shell">
        <div className="halo-backdrop" aria-hidden="true" />
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main id="app-scroll" className="e-scroll">
          <Outlet />
        </main>
      </div>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}
