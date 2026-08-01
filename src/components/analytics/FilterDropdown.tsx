import { Filter, X, Calendar, Users, Monitor, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useFilters } from '@/context/FilterContext';
import { useEffect, useState } from 'react';
import { analyticsService } from '@/services/analyticsService';
import { PLATFORM_OPTIONS } from '@/utils/platform';

const genderOptions = ['Male', 'Female'];
const platforms = PLATFORM_OPTIONS.map(p => p.label);

function CheckboxRow({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-[var(--h-tint)] transition-colors">
      <span
        className="flex h-4 w-4 items-center justify-center rounded flex-shrink-0 transition-colors"
        style={{
          background: checked ? 'var(--h-iris-500)' : 'transparent',
          border: checked ? 'none' : '1px solid var(--h-line-2)',
        }}
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
      >
        {checked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <span className="text-sm text-[var(--h-ink-2)] truncate">{label}</span>
    </label>
  );
}

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

  const activeCount =
    filters.campaigns.length + filters.platforms.length + filters.gender.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-[999px] border-0 bg-[var(--h-surface)] shadow-[var(--h-sh-1)] hover:shadow-[var(--h-sh-2)] flex items-center justify-center gap-2 h-9 sm:h-8"
        >
          <Filter className="h-4 w-4 text-[var(--h-iris-600)]" strokeWidth={1.75} />
          <span className="text-sm">Filters</span>
          {activeCount > 0 && <span className="halo-badge halo-badge-iris">{activeCount}</span>}
          <ChevronDown className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="halo-card w-96 max-h-96 overflow-y-auto p-4 border-0"
        style={{ boxShadow: 'var(--h-sh-3)' }}
        sideOffset={8}
      >
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="halo-heading flex items-center gap-2" style={{ fontSize: 15 }}>
              <span className="halo-chip">
                <Filter className="w-4 h-4" strokeWidth={1.75} />
              </span>
              Apply filters
            </h3>
            <button
              onClick={resetFilters}
              className="btn-halo-ghost btn-halo-sm hover:text-[var(--h-coral)] hover:bg-[var(--h-neg-soft)]"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.75} />
              Clear all
            </button>
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-2 gap-5">
            {/* Date Range */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--h-mint)]" strokeWidth={1.75} />
                <h4 className="halo-label">Date range</h4>
              </div>

              <div className="space-y-3">
                {/* Period Type Toggle */}
                <div className="halo-segment w-full">
                  {['Daily', 'Weekly', 'Monthly'].map((period) => (
                    <button
                      key={period}
                      className={`halo-segment-item flex-1 ${filters.periodType === period.toLowerCase() ? 'is-active' : ''}`}
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
                  className="halo-field w-full"
                  style={{ height: '2rem' }}
                >
                  <option value={`${new Date().toISOString().split('T')[0]}-${new Date().toISOString().split('T')[0]}`}>
                    Today
                  </option>
                  <option value={`${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]}-${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`}>
                    Yesterday
                  </option>
                  <option value={`${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}-${new Date().toISOString().split('T')[0]}`}>
                    Last 7 days
                  </option>
                  <option value={`${new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}-${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`}>
                    Previous 7 days
                  </option>
                  <option value={`${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}-${new Date().toISOString().split('T')[0]}`}>
                    Last 30 days
                  </option>
                  <option value={`${new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}-${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`}>
                    Previous 30 days
                  </option>
                  <option value={`${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}-${new Date().toISOString().split('T')[0]}`}>
                    Last 90 days
                  </option>
                </select>

                {/* Selected Date Range Display */}
                <div className="halo-inset text-xs text-[var(--h-ink-2)] px-2 py-1">
                  {new Date(filters.dateRange.from).toLocaleDateString()} - {new Date(filters.dateRange.to).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Campaigns */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[var(--h-info)]" strokeWidth={1.75} />
                <h4 className="halo-label">Campaigns</h4>
              </div>

              <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
                {campaigns.slice(0, 4).map((campaign: any) => (
                  <CheckboxRow
                    key={campaign.campaignId}
                    label={campaign.brandName}
                    checked={filters.campaigns.includes(campaign.campaignId.toString())}
                    onChange={(checked) => handleFilterChange('campaigns', campaign.campaignId.toString(), checked)}
                  />
                ))}
              </div>
            </div>

            {/* Platforms */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[var(--h-iris-500)]" strokeWidth={1.75} />
                <h4 className="halo-label">Platforms</h4>
              </div>

              <div className="space-y-1">
                {platforms.map((platform) => (
                  <CheckboxRow
                    key={platform}
                    label={platform}
                    checked={filters.platforms.includes(platform)}
                    onChange={(checked) => handleFilterChange('platforms', platform, checked)}
                  />
                ))}
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--h-iris-500)]" strokeWidth={1.75} />
                <h4 className="halo-label">Gender</h4>
              </div>

              <div className="space-y-1">
                {genderOptions.map((gender) => (
                  <CheckboxRow
                    key={gender}
                    label={gender}
                    checked={filters.gender.includes(gender)}
                    onChange={(checked) => handleFilterChange('gender', gender, checked)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="pt-4 border-t border-[var(--h-line)]">
            <div className="flex items-center gap-2 mb-3">
              <span className="halo-dot text-[var(--h-iris-500)]" />
              <h4 className="halo-label">Quick filters</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-halo-outline btn-halo-sm"
                onClick={() => updateFilters({
                  dateRange: {
                    from: new Date().toISOString().split('T')[0],
                    to: new Date().toISOString().split('T')[0]
                  },
                  periodType: 'daily'
                })}
              >
                Today
              </button>
              <button
                className="btn-halo-outline btn-halo-sm"
                onClick={() => updateFilters({
                  dateRange: {
                    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    to: new Date().toISOString().split('T')[0]
                  },
                  periodType: 'weekly'
                })}
              >
                This week
              </button>
              <button
                className="btn-halo-outline btn-halo-sm"
                onClick={() => updateFilters({
                  dateRange: {
                    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    to: new Date().toISOString().split('T')[0]
                  },
                  periodType: 'monthly'
                })}
              >
                This month
              </button>
              <button
                className="btn-halo-outline btn-halo-sm"
                onClick={() => updateFilters({ platforms: ['Mobile'] })}
              >
                Mobile only
              </button>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
