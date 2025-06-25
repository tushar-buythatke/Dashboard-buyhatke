import React from 'react';

export function Header() {
  return (
    <header className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 border-b border-white/20 px-8 py-6 w-full shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-6">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-lg">
            <span className="text-2xl font-bold text-white">A</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            AdCampaign Pro
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-white/10 rounded-full animate-pulse"></div>
          <div className="w-8 h-8 bg-white/10 rounded-full animate-pulse animation-delay-200"></div>
          <div className="w-8 h-8 bg-white/10 rounded-full animate-pulse animation-delay-400"></div>
        </div>
      </div>
    </header>
  );
}