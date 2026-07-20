import { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, X, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adService, SiteDetails } from '@/services/adService';
import { motion, AnimatePresence } from 'framer-motion';
import { VelvetLoader } from '@/components/ui/velvet-loader';
import { fieldStyles } from '@/components/ui/select-field-styles';
import { brandLogoUrl } from '@/utils/adUtils';

// Logo <img> with a fallback chain: brand-logo service → the site's own image →
// a Globe icon. Each onError advances one stage via the data-stage attribute.
function SiteLogo({ name, fallback, size }: { name: string; fallback?: string; size: 'chip' | 'row' }) {
  const primary = brandLogoUrl(name);
  const first = primary || fallback || '';
  const imgClass = size === 'chip' ? 'h-3.5 w-3.5 rounded object-contain' : 'w-5 h-5 rounded object-contain';
  const globeClass = size === 'chip' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <>
      {first ? (
        <img
          src={first}
          alt={name}
          data-stage={primary ? 'brand' : 'orig'}
          className={imgClass}
          onError={(e) => {
            const img = e.currentTarget;
            if (img.dataset.stage === 'brand' && fallback) {
              img.dataset.stage = 'orig';
              img.src = fallback;
              return;
            }
            img.style.display = 'none';
            const globe = img.nextElementSibling as HTMLElement | null;
            if (globe) globe.style.display = 'block';
          }}
        />
      ) : null}
      <Globe className={cn(globeClass, first ? 'hidden' : 'block')} />
    </>
  );
}

interface SiteSelectProps {
  value: { [key: string]: number };
  onChange: (value: { [key: string]: number }) => void;
  placeholder?: string;
  className?: string;
}

export function SiteSelect({ value, onChange, placeholder = "Select sites...", className }: SiteSelectProps) {
  const S = fieldStyles('emerald');
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [siteDetails, setSiteDetails] = useState<SiteDetails>({});
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadSites = async () => {
      setLoading(true);
      try {
        const result = await adService.getSiteDetails();
        if (result.success && result.data) {
          setSiteDetails(result.data);
        }
      } catch (error) {
        console.error('Failed to load sites:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSites();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSites = Object.entries(siteDetails).filter(([, site]) =>
    site.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedItems = Object.keys(value);

  const handleAdd = (siteId: string) => {
    if (!value[siteId]) {
      onChange({ ...value, [siteId]: 1 });
    }
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleRemove = (siteId: string) => {
    const newValue = { ...value };
    delete newValue[siteId];
    onChange(newValue);
  };

  const getSiteName = (siteId: string) => {
    return siteDetails[siteId]?.name || `Site ${siteId}`;
  };

  const getSiteLogo = (siteId: string) => {
    return siteDetails[siteId]?.image;
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className={S.shell}>
        {selectedItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {selectedItems.map((siteId) => (
              <span key={siteId} className={S.chip}>
                <SiteLogo name={getSiteName(siteId)} fallback={getSiteLogo(siteId)} size="chip" />
                {getSiteName(siteId)} ({siteId})
                <button
                  type="button"
                  onClick={() => handleRemove(siteId)}
                  className="opacity-70 hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={selectedItems.length === 0 ? placeholder : "Add more sites..."}
            className={S.input}
          />
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-4 w-4 text-[var(--text-3)]" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className={S.menu}
          >
            {loading ? (
              <div className="p-6 flex items-center justify-center">
                <VelvetLoader size={22} label="Loading sites" />
              </div>
            ) : filteredSites.length > 0 ? (
              <div className="py-1.5 max-h-[300px] overflow-y-auto">
                {filteredSites.map(([siteId, site]) => (
                  <button
                    key={siteId}
                    type="button"
                    onClick={() => handleAdd(siteId)}
                    disabled={!!value[siteId]}
                    className={cn(S.row, value[siteId] ? S.rowSelected : S.rowHover)}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className={cn(
                        'flex items-center justify-center w-7 h-7 rounded-lg overflow-hidden shrink-0',
                        value[siteId] ? S.iconOn : S.iconOff
                      )}>
                        <SiteLogo name={site.name} fallback={site.image} size="row" />
                      </span>
                      <span className="flex flex-col min-w-0">
                        <span className={cn('font-medium', value[siteId] ? S.nameOn : 'text-[var(--text-1)]')}>
                          {site.name} ({siteId})
                        </span>
                        {site.domain && site.domain.length > 0 && (
                          <span className="text-[11px] text-[var(--text-3)] truncate max-w-[320px]">
                            {site.domain.slice(0, 2).join(', ')}
                            {site.domain.length > 2 && ` +${site.domain.length - 2} more`}
                          </span>
                        )}
                      </span>
                    </span>
                    {value[siteId] && <Check className={cn('h-4 w-4 shrink-0', S.check)} />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-[var(--text-3)]">
                <Globe className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <div className="text-[var(--text-2)] text-[13px] font-medium">
                  {searchTerm ? `No sites found for “${searchTerm}”` : 'No sites available'}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
