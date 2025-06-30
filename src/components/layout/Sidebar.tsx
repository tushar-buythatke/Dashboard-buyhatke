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
    <div className="w-64 h-screen bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700 flex-shrink-0 transition-colors duration-200">
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200',
                    isActive
                      ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-r-2 border-purple-700 dark:border-purple-400'
                      : 'text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 hover:text-slate-900 dark:hover:text-gray-100'
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