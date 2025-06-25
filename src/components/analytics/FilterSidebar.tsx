import React from 'react';
import { Filter, X, Calendar, Users, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useFilters } from '@/context/FilterContext';
import { mockCampaigns, platforms } from '@/data/mockData';

const genderOptions = ['Male', 'Female'];
const ageGroups = ['18-24', '25-34', '35-44', '45-54', '55+'];

export function FilterSidebar() {
  const { filters, updateFilters, resetFilters } = useFilters();

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
      <div className="backdrop-blur-sm bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/30 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center text-slate-700">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            <Filter className="w-4 h-4 mr-2 text-blue-600" />
            Filters
          </h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetFilters}
            className="hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Date Range */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 border border-emerald-200 rounded-xl shadow-sm transition-all duration-200">
          <span className="flex items-center font-medium text-slate-700">
            <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
            <Calendar className="w-4 h-4 mr-2 text-emerald-600" />
            Date Range
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 p-4 mt-2 bg-white/50 backdrop-blur-sm border border-emerald-100 rounded-xl shadow-sm">
          <div>
            <Label htmlFor="date-from" className="text-sm font-medium text-slate-600 mb-1 block">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block mr-2"></div>
              From
            </Label>
            <Input
              id="date-from"
              type="date"
              value={filters.dateRange.from}
              onChange={(e) => updateFilters({
                dateRange: { ...filters.dateRange, from: e.target.value }
              })}
              className="text-sm border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400"
            />
          </div>
          <div>
            <Label htmlFor="date-to" className="text-sm font-medium text-slate-600 mb-1 block">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block mr-2"></div>
              To
            </Label>
            <Input
              id="date-to"
              type="date"
              value={filters.dateRange.to}
              onChange={(e) => updateFilters({
                dateRange: { ...filters.dateRange, to: e.target.value }
              })}
              className="text-sm border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Campaigns */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border border-blue-200 rounded-xl shadow-sm transition-all duration-200">
          <span className="flex items-center font-medium text-slate-700">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            <Monitor className="w-4 h-4 mr-2 text-blue-600" />
            Campaigns
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 p-4 mt-2 bg-white/50 backdrop-blur-sm border border-blue-100 rounded-xl shadow-sm">
          {mockCampaigns.map((campaign: any) => (
            <div
              key={campaign.id}
              className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
              onClick={() => handleFilterChange('campaigns', campaign.id, !filters.campaigns.includes(campaign.id))}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                filters.campaigns.includes(campaign.id)
                  ? 'bg-blue-500 border-blue-500'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }`}>
                {filters.campaigns.includes(campaign.id) && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-700 flex-1">{campaign.brandName}</span>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Platforms */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border border-purple-200 rounded-xl shadow-sm transition-all duration-200">
          <span className="flex items-center font-medium text-slate-700">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
            <Monitor className="w-4 h-4 mr-2 text-purple-600" />
            Platforms
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 p-4 mt-2 bg-white/50 backdrop-blur-sm border border-purple-100 rounded-xl shadow-sm">
          {platforms.map((platform) => (
            <div
              key={platform}
              className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
              onClick={() => handleFilterChange('platforms', platform, !filters.platforms.includes(platform))}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                filters.platforms.includes(platform)
                  ? 'bg-blue-500 border-blue-500'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }`}>
                {filters.platforms.includes(platform) && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-700 flex-1">{platform}</span>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Gender */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gradient-to-r from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 border border-indigo-200 rounded-xl shadow-sm transition-all duration-200">
          <span className="flex items-center font-medium text-slate-700">
            <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
            <Users className="w-4 h-4 mr-2 text-indigo-600" />
            Gender
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 p-4 mt-2 bg-white/50 backdrop-blur-sm border border-indigo-100 rounded-xl shadow-sm">
          {genderOptions.map((gender) => (
            <div
              key={gender}
              className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
              onClick={() => handleFilterChange('gender', gender, !filters.gender.includes(gender))}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                filters.gender.includes(gender)
                  ? 'bg-blue-500 border-blue-500'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }`}>
                {filters.gender.includes(gender) && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-700 flex-1">{gender}</span>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Age Groups */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gradient-to-r from-rose-50 to-rose-100 hover:from-rose-100 hover:to-rose-200 border border-rose-200 rounded-xl shadow-sm transition-all duration-200">
          <span className="flex items-center font-medium text-slate-700">
            <div className="w-2 h-2 bg-rose-500 rounded-full mr-2"></div>
            <Users className="w-4 h-4 mr-2 text-rose-600" />
            Age Groups
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 p-4 mt-2 bg-white/50 backdrop-blur-sm border border-rose-100 rounded-xl shadow-sm">
          {ageGroups.map((ageGroup) => (
            <div
              key={ageGroup}
              className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
              onClick={() => handleFilterChange('ageGroups', ageGroup, !filters.ageGroups.includes(ageGroup))}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                filters.ageGroups.includes(ageGroup)
                  ? 'bg-blue-500 border-blue-500'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }`}>
                {filters.ageGroups.includes(ageGroup) && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-700 flex-1">{ageGroup}</span>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}