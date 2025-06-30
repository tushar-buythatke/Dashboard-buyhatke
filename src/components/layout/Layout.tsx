import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 transition-colors duration-200">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 w-full bg-slate-50 dark:bg-gray-900 transition-colors duration-200">
          <div className="w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}