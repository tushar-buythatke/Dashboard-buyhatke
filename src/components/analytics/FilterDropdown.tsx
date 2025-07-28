import { Filter, X, Calendar, Users, Monitor, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useFilters } from '@/context/FilterContext';
import { useEffect, useState } from 'react';
import { analyticsService } from '@/services/analyticsService';

const genderOptions = ['Male', 'Female'];
const platforms = ["Web", "Mobile", "Extension"];

export function FilterDropdown() {
  const { filters, updateFilters, resetFilters } = useFilters();
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    async function fetchCampaigns() {
      const res = await analyticsService.getCampaigns();
      if (res.success && res.data) setCampaigns(res.data);
    }
    fetchCampaigns();
  }, []);

  const handleFilterChange = (filterType: keyof typeof filters, value: string, checked: boolean) => {
    const currentValues = filters[filterType] as string[];
    const newValues = checked 
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);
    
    updateFilters({ [filterType]: newValues });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center justify-center space-x-2 h-9 sm:h-8"
        >
          <Filter className="h-4 w-4" />
          <span className="text-sm">Filters</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-96 max-h-96 overflow-y-auto p-4"
        sideOffset={8}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Filter className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
              Apply Filters
            </h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetFilters}
              className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Date Range */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="font-medium text-gray-900 dark:text-white">Date Range</h4>
              </div>
              
              <div className="space-y-3">
                {/* Period Type Toggle */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  {['Daily', 'Weekly', 'Monthly'].map((period) => (
                    <button
                      key={period}
                      className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
                        filters.periodType === period.toLowerCase()
                          ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                      onClick={() => updateFilters({ periodType: period.toLowerCase() })}
                    >
                      {period}
                    </button>
                  ))}
                </div>

                {/* Date Range Dropdown */}
                <select
                  value={`${filters.dateRange.from}-${filters.dateRange.to}`}
                  onChange={(e) => {
                    const [from, to] = e.target.value.split('-');
                    updateFilters({ dateRange: { from, to } });
                  }}
                  className="w-full text-sm h-8 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md px-2"
                >
                  <option value={`${new Date().toISOString().split('T')[0]}-${new Date().toISOString().split('T')[0]}`}>
                    Today
                  </option>
                  <option value={`${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]}-${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`}>
                    Yesterday
                  </option>
                  <option value={`${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}-${new Date().toISOString().split('T')[0]}`}>
                    Last 7 Days
                  </option>
                  <option value={`${new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}-${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`}>
                    Previous 7 Days
                  </option>
                  <option value={`${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}-${new Date().toISOString().split('T')[0]}`}>
                    Last 30 Days
                  </option>
                  <option value={`${new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}-${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`}>
                    Previous 30 Days
                  </option>
                  <option value={`${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}-${new Date().toISOString().split('T')[0]}`}>
                    Last 90 Days
                  </option>
                </select>

                {/* Selected Date Range Display */}
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded border">
                  {new Date(filters.dateRange.from).toLocaleDateString()} - {new Date(filters.dateRange.to).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Campaigns */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Monitor className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="font-medium text-gray-900 dark:text-white">Campaigns</h4>
              </div>
              
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {campaigns.slice(0, 4).map((campaign: any) => (
                  <label
                    key={campaign.campaignId}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.campaigns.includes(campaign.campaignId.toString())}
                      onChange={(e) => handleFilterChange('campaigns', campaign.campaignId.toString(), e.target.checked)}
                      className="w-4 h-4 text-purple-600 bg-white dark:bg-white border-gray-300 dark:border-gray-400 rounded focus:ring-purple-500 focus:ring-2"
                      style={{
                        accentColor: '#9333ea'
                      }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {campaign.brandName}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Platforms */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Monitor className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h4 className="font-medium text-gray-900 dark:text-white">Platforms</h4>
              </div>
              
              <div className="space-y-2">
                {platforms.map((platform) => (
                  <label
                    key={platform}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.platforms.includes(platform)}
                      onChange={(e) => handleFilterChange('platforms', platform, e.target.checked)}
                      className="w-4 h-4 text-purple-600 bg-white dark:bg-white border-gray-300 dark:border-gray-400 rounded focus:ring-purple-500 focus:ring-2"
                      style={{
                        accentColor: '#9333ea'
                      }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {platform}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-medium text-gray-900 dark:text-white">Gender</h4>
              </div>
              
              <div className="space-y-2">
                {genderOptions.map((gender) => (
                  <label
                    key={gender}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.gender.includes(gender)}
                      onChange={(e) => handleFilterChange('gender', gender, e.target.checked)}
                      className="w-4 h-4 text-purple-600 bg-white dark:bg-white border-gray-300 dark:border-gray-400 rounded focus:ring-purple-500 focus:ring-2"
                      style={{
                        accentColor: '#9333ea'
                      }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {gender}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <h4 className="font-medium text-gray-900 dark:text-white">Quick Filters</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 text-xs hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-purple-900/20 dark:hover:border-purple-600 dark:hover:text-purple-300"
                onClick={() => updateFilters({ 
                  dateRange: { 
                    from: new Date().toISOString().split('T')[0],
                    to: new Date().toISOString().split('T')[0]
                  },
                  periodType: 'daily'
                })}
              >
                Today
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 text-xs hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-purple-900/20 dark:hover:border-purple-600 dark:hover:text-purple-300"
                onClick={() => updateFilters({ 
                  dateRange: { 
                    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    to: new Date().toISOString().split('T')[0]
                  },
                  periodType: 'weekly'
                })}
              >
                This Week
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 text-xs hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-purple-900/20 dark:hover:border-purple-600 dark:hover:text-purple-300"
                onClick={() => updateFilters({ 
                  dateRange: { 
                    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    to: new Date().toISOString().split('T')[0]
                  },
                  periodType: 'monthly'
                })}
              >
                This Month
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 text-xs hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-purple-900/20 dark:hover:border-purple-600 dark:hover:text-purple-300"
                onClick={() => updateFilters({ platforms: ['Mobile'] })}
              >
                Mobile Only
              </Button>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 