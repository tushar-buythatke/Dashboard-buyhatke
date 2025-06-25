import React from 'react';

export function Header() {
  return (
    <header className="bg-red border-b border-slate-200 px-6 py-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-slate-900">AdCampaign Pro</h1>
        </div>
      </div>
    </header>
  );
}