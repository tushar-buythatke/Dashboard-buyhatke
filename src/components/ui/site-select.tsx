import { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, X, Globe, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adService, SiteDetails } from '@/services/adService';
import { motion, AnimatePresence } from 'framer-motion';

interface SiteSelectProps {
  value: { [key: string]: number };
  onChange: (value: { [key: string]: number }) => void;
  placeholder?: string;
  className?: string;
}

export function SiteSelect({ value, onChange, placeholder = "Select sites...", className }: SiteSelectProps) {
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
      <motion.div 
        className="min-h-[48px] w-full rounded-xl border-2 border-gradient-to-r from-green-200 to-emerald-200 dark:from-green-700 dark:to-emerald-700 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 px-4 py-3 text-sm shadow-lg hover:shadow-xl transition-all duration-300 focus-within:ring-4 focus-within:ring-green-500/20 focus-within:border-green-500"
        whileHover={{ scale: 1.01 }}
        whileFocus={{ scale: 1.01 }}
      >
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedItems.map((siteId) => (
            <motion.span
              key={siteId}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              {getSiteLogo(siteId) ? (
                <img 
                  src={getSiteLogo(siteId)} 
                  alt={getSiteName(siteId)}
                  className="h-4 w-4 rounded object-contain bg-white/20"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const globe = e.currentTarget.nextElementSibling as HTMLElement;
                    if (globe) globe.style.display = 'block';
                  }}
                />
              ) : null}
              <Globe className={cn("h-4 w-4", getSiteLogo(siteId) ? "hidden" : "block")} />
              {getSiteName(siteId)} ({siteId})
              <button
                type="button"
                onClick={() => handleRemove(siteId)}
                className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.span>
          ))}
        </div>
        <div className="flex items-center">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={selectedItems.length === 0 ? placeholder : "Add more sites..."}
            className="flex-1 border-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-sm"
          />
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5 text-gray-400" />
          </motion.div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-[9999] w-full mt-2 bg-white dark:bg-white border border-gray-200 dark:border-gray-200 rounded-xl shadow-2xl max-h-96 overflow-hidden"
            style={{ 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)' 
            }}
          >
            {loading ? (
              <div className="p-6 text-center text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 animate-spin" />
                <span className="text-gray-800 dark:text-gray-200 font-medium">Loading sites...</span>
              </div>
            ) : filteredSites.length > 0 ? (
              <div className="py-2 max-h-80 overflow-y-auto">
                {filteredSites.map(([siteId, site], index) => (
                  <motion.button
                    key={siteId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    type="button"
                    onClick={() => handleAdd(siteId)}
                    disabled={!!value[siteId]}
                    className={cn(
                      "w-full text-left px-6 py-4 text-sm transition-all duration-200 flex items-center justify-between group",
                      value[siteId] 
                        ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-50 dark:to-emerald-50 border-l-4 border-green-500" 
                        : "hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-50 dark:hover:to-emerald-50"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 overflow-hidden",
                        value[siteId] 
                          ? "bg-green-500 text-white" 
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-green-100 group-hover:text-green-500"
                      )}>
                        {site.image ? (
                          <img 
                            src={site.image} 
                            alt={site.name}
                            className="w-10 h-10 rounded object-contain bg-white dark:bg-gray-600"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const globe = e.currentTarget.nextElementSibling as HTMLElement;
                              if (globe) globe.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <Globe className={cn("h-6 w-6", site.image ? "hidden" : "flex")} />
                      </div>
                      <div className="flex-1">
                        <div className={cn(
                          "font-semibold text-lg",
                          value[siteId] 
                            ? "text-green-700 dark:text-green-700" 
                            : "text-gray-900 dark:text-gray-900"
                        )}>
                          {site.name} ({siteId})
                        </div>
                        {site.domain && site.domain.length > 0 && (
                          <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                            {site.domain.slice(0, 2).join(', ')}
                            {site.domain.length > 2 && ` +${site.domain.length - 2} more`}
                          </div>
                        )}
                      </div>
                    </div>
                    {value[siteId] && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
                      >
                        <Check className="h-4 w-4 text-white" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <div className="text-gray-800 dark:text-gray-200 font-medium">
                  {searchTerm ? `No sites found for "${searchTerm}"` : 'No sites available'}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 