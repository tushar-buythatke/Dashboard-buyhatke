import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-gray-900 transition-colors duration-200" style={{ minHeight: '100vh', minWidth: '100vw', position: 'relative' }}>
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      {/* Add top padding to account for fixed header */}
      <div className="flex pt-20 min-h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 w-full bg-slate-50 dark:bg-gray-900 transition-colors duration-200 min-h-screen">
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-gray-900/50 dark:bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <div className="w-full lg:ml-0 min-h-screen">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}