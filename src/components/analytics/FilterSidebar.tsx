import { Filter, X, Calendar, Users, Monitor, Tag, Check } from 'lucide-react';
import { useFilters } from '@/context/FilterContext';
import { useEffect, useState } from 'react';
import { analyticsService } from '@/services/analyticsService';
import { adService } from '@/services/adService';
import { isV2Active } from '@/utils/v2Normalizer';
import { PLATFORM_OPTIONS } from '@/utils/platform';

const genderOptions = ['Male', 'Female'];
const ageGroups = ["13-18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+", "NA"];
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
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span className="text-sm text-[var(--h-ink-2)] truncate">{label}</span>
    </label>
  );
}

export function FilterSidebar() {
  const { filters, updateFilters, resetFilters } = useFilters();
  const [adNameOptions, setAdNameOptions] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    async function fetchCampaigns() {
      const res = await analyticsService.getCampaigns();
      if (res.success && res.data) setCampaigns(res.data);
    }
    fetchCampaigns();
  }, []);

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
            const res = await adService.getAdLabels(isV2Active() ? campId : Number(campId));
            if (res.success && res.data) {
              res.data.forEach((adInfo: { name: string; label: string }) => {
                namesSet.add(adInfo.name);
              });
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="halo-heading flex items-center gap-2" style={{ fontSize: 16 }}>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5">
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

            <div className="flex items-center gap-2 text-sm text-[var(--h-ink-2)]">
              <span className="halo-eyebrow" style={{ letterSpacing: '0.02em' }}>From</span>
              <input
                type="date"
                value={filters.dateRange.from}
                onChange={(e) => updateFilters({ dateRange: { ...filters.dateRange, from: e.target.value } })}
                className="halo-field"
                style={{ height: '2rem', padding: '0 0.5rem' }}
              />
              <span className="halo-eyebrow" style={{ letterSpacing: '0.02em' }}>To</span>
              <input
                type="date"
                value={filters.dateRange.to}
                onChange={(e) => updateFilters({ dateRange: { ...filters.dateRange, to: e.target.value } })}
                className="halo-field"
                style={{ height: '2rem', padding: '0 0.5rem' }}
              />
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

        {/* Ad Names — applied filters as removable pill chips */}
        {adNameOptions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[var(--h-violet)]" strokeWidth={1.75} />
              <h4 className="halo-label">Ad names</h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {adNameOptions.map((n) => {
                const active = filters.adNames.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      updateFilters({
                        adNames: active
                          ? filters.adNames.filter((v: string) => v !== n)
                          : [...filters.adNames, n],
                      })
                    }
                    className={`halo-badge inline-flex items-center gap-1 transition-colors ${
                      active ? 'halo-badge-iris' : 'hover:bg-[var(--h-tint)] hover:text-[var(--h-iris-600)]'
                    }`}
                  >
                    {n}
                    {active && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          updateFilters({ adNames: filters.adNames.filter((v: string) => v !== n) });
                        }}
                        className="opacity-70 hover:opacity-100"
                      >
                        <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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

        {/* Age Groups */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--h-coral)]" strokeWidth={1.75} />
            <h4 className="halo-label">Age groups</h4>
          </div>

          <div className="space-y-1">
            {ageGroups.map((ageGroup) => (
              <CheckboxRow
                key={ageGroup}
                label={ageGroup}
                checked={filters.ageGroups.includes(ageGroup)}
                onChange={(checked) => handleFilterChange('ageGroups', ageGroup, checked)}
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
          <button
            className="btn-halo-outline btn-halo-sm"
            onClick={() => updateFilters({ gender: ['Male', 'Female'] })}
          >
            All genders
          </button>
        </div>
      </div>
    </div>
  );
}
