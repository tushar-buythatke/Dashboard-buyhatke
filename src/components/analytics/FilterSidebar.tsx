import { Filter, X, Calendar, Users, Monitor, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFilters } from '@/context/FilterContext';
import { mockCampaigns, platforms } from '@/data/mockData';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import { MultiSelectDropdown } from '@/components/analytics/MultiSelectDropdown';
import { adService } from '@/services/adService';
import { useState, useEffect } from 'react';

const genderOptions = ['Male', 'Female'];
const ageGroups = ['18-24', '25-34', '35-44', '45-54', '55+'];

export function FilterSidebar() {
  const { filters, updateFilters, resetFilters } = useFilters();
  const [adNameOptions, setAdNameOptions] = useState<string[]>([]);

  useEffect(() => {
    const loadAdNames = async () => {
      if (filters.campaigns.length === 0) {
        setAdNameOptions([]);
        return;
      }
      try {
        const namesSet = new Set<string>();
        await Promise.all(
          filters.campaigns.map(async (campId) => {
            const res = await adService.getAdNames(Number(campId));
            if (res.success && res.data) {
              res.data.forEach((name) => namesSet.add(name));
            }
          })
        );
        setAdNameOptions(Array.from(namesSet));
      } catch (err) {
        console.error('Failed to fetch ad names', err);
      }
    };
    loadAdNames();
  }, [filters.campaigns]);

  const handleFilterChange = (filterType: keyof typeof filters, value: string, checked: boolean) => {
    const currentValues = filters[filterType] as string[];
    const newValues = checked 
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);
    
    updateFilters({ [filterType]: newValues });
  };

  return (
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
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
            <DateRangePicker />
          </div>
        </div>

        {/* Campaigns */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Monitor className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="font-medium text-gray-900 dark:text-white">Campaigns</h4>
          </div>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {mockCampaigns.slice(0, 4).map((campaign: any) => (
              <label
                key={campaign.id}
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded transition-colors"
              >
                <input
                  type="checkbox"
                  checked={filters.campaigns.includes(campaign.id)}
                  onChange={(e) => handleFilterChange('campaigns', campaign.id, e.target.checked)}
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

        {/* Ad Names */}
        {adNameOptions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
              <h4 className="font-medium text-gray-900 dark:text-white">Ad Names</h4>
            </div>
            <MultiSelectDropdown
              options={adNameOptions.map((n) => ({ value: n, label: n }))}
              selectedValues={filters.adNames}
              onChange={(vals) => updateFilters({ adNames: vals as string[] })}
              placeholder="Select ad names..."
              maxSelections={10}
            />
          </div>
        )}

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

        {/* Age Groups */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <h4 className="font-medium text-gray-900 dark:text-white">Age Groups</h4>
          </div>
          
          <div className="space-y-2">
            {ageGroups.map((ageGroup) => (
              <label
                key={ageGroup}
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded transition-colors"
              >
                <input
                  type="checkbox"
                  checked={filters.ageGroups.includes(ageGroup)}
                  onChange={(e) => handleFilterChange('ageGroups', ageGroup, e.target.checked)}
                  className="w-4 h-4 text-purple-600 bg-white dark:bg-white border-gray-300 dark:border-gray-400 rounded focus:ring-purple-500 focus:ring-2"
                  style={{
                    accentColor: '#9333ea'
                  }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {ageGroup}
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
          <Button 
            variant="outline" 
            size="sm"
            className="h-8 text-xs hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-purple-900/20 dark:hover:border-purple-600 dark:hover:text-purple-300"
            onClick={() => updateFilters({ gender: ['Male', 'Female'] })}
          >
            All Genders
          </Button>
        </div>
      </div>
    </div>
  );
}