import React from 'react';
import { Filter, X, Calendar, Users, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </h3>
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
      </div>

      {/* Date Range */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-purple-50 hover:bg-slate-50 rounded">
          <span className="flex items-center font-medium">
            <Calendar className="w-4 h-4 mr-2" />
            Date Range
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 p-2">
          <div>
            <Label htmlFor="date-from" className="text-xs">From</Label>
            <Input
              id="date-from"
              type="date"
              value={filters.dateRange.from}
              onChange={(e) => updateFilters({
                dateRange: { ...filters.dateRange, from: e.target.value }
              })}
              className="text-xs"
            />
          </div>
          <div>
            <Label htmlFor="date-to" className="text-xs">To</Label>
            <Input
              id="date-to"
              type="date"
              value={filters.dateRange.to}
              onChange={(e) => updateFilters({
                dateRange: { ...filters.dateRange, to: e.target.value }
              })}
              className="text-xs"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Campaigns */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-purple-50 hover:bg-slate-50 rounded">
          <span className="flex items-center font-medium">
            <Monitor className="w-4 h-4 mr-2" />
            Campaigns
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 p-2">
          {mockCampaigns.map((campaign) => (
            <div key={campaign.id} className="flex items-center space-x-2">
              <Checkbox
                id={`campaign-${campaign.id}`}
                checked={filters.campaigns.includes(campaign.id)}
                onCheckedChange={(checked) => 
                  handleFilterChange('campaigns', campaign.id, checked as boolean)
                }
              />
              <Label htmlFor={`campaign-${campaign.id}`} className="text-xs">
                {campaign.brandName}
              </Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Platforms */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-purple-50 hover:bg-slate-50 rounded">
          <span className="flex items-center font-medium">
            <Monitor className="w-4 h-4 mr-2" />
            Platforms
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 p-2">
          {platforms.map((platform) => (
            <div key={platform} className="flex items-center space-x-2">
              <Checkbox
                id={`platform-${platform}`}
                checked={filters.platforms.includes(platform)}
                onCheckedChange={(checked) => 
                  handleFilterChange('platforms', platform, checked as boolean)
                }
              />
              <Label htmlFor={`platform-${platform}`} className="text-xs">
                {platform}
              </Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Gender */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-purple-50 hover:bg-slate-50 rounded">
          <span className="flex items-center font-medium">
            <Users className="w-4 h-4 mr-2" />
            Gender
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 p-2">
          {genderOptions.map((gender) => (
            <div key={gender} className="flex items-center space-x-2">
              <Checkbox
                id={`gender-${gender}`}
                checked={filters.gender.includes(gender)}
                onCheckedChange={(checked) => 
                  handleFilterChange('gender', gender, checked as boolean)
                }
              />
              <Label htmlFor={`gender-${gender}`} className="text-xs">
                {gender}
              </Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Age Groups */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-purple-50 hover:bg-slate-50 rounded">
          <span className="flex items-center font-medium">
            <Users className="w-4 h-4 mr-2" />
            Age Groups
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 p-2">
          {ageGroups.map((ageGroup) => (
            <div key={ageGroup} className="flex items-center space-x-2">
              <Checkbox
                id={`age-${ageGroup}`}
                checked={filters.ageGroups.includes(ageGroup)}
                onCheckedChange={(checked) => 
                  handleFilterChange('ageGroups', ageGroup, checked as boolean)
                }
              />
              <Label htmlFor={`age-${ageGroup}`} className="text-xs">
                {ageGroup}
              </Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}