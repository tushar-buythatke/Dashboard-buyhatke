import React from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, Lamp as Campaign, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Campaigns', href: '/campaigns', icon: Campaign },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp },
];

export function Sidebar() {
  return (
    <div className="w-64 h-screen bg-white border-r border-slate-200 flex-shrink-0">
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-purple-50 text-purple-700 border-r-2 border-purple-700'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  )
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}