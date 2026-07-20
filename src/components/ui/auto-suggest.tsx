import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, X, MapPin, Tag, Package, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adService, CategoryDetails, LocationDetails } from '@/services/adService';
import { motion, AnimatePresence } from 'framer-motion';
import { VelvetLoader } from '@/components/ui/velvet-loader';
import { fieldStyles } from '@/components/ui/select-field-styles';
import { brandLogoUrl } from '@/utils/adUtils';

// Brand logo <img> from the shared brand-logo service, falling back to a Package
// icon if the lookup misses. Used in the Brand Targets chips.
function BrandLogo({ name }: { name: string }) {
  const src = brandLogoUrl(name);
  return (
    <>
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-3.5 w-3.5 rounded object-contain shrink-0"
          onError={(e) => {
            const img = e.currentTarget;
            img.style.display = 'none';
            const icon = img.nextElementSibling as HTMLElement | null;
            if (icon) icon.style.display = 'block';
          }}
        />
      ) : null}
      <Package className={cn('h-3 w-3 shrink-0', src ? 'hidden' : 'block')} />
    </>
  );
}

interface LocationSuggestProps {
  value: { [key: string]: number };
  onChange: (value: { [key: string]: number }) => void;
  placeholder?: string;
  className?: string;
}

export function LocationAutoSuggest({ value, onChange, placeholder = "Search locations...", className }: LocationSuggestProps) {
  const S = fieldStyles('violet');
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<LocationDetails>({});
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadLocations = async () => {
      setLoading(true);
      try {
        const result = await adService.getLocationDetails();
        if (result.success && result.data) {
          setSuggestions(result.data);
        }
      } catch (error) {
        console.error('Failed to load locations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLocations();
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

  const normalizedSearchTerm = searchTerm.trim();
  const filteredSuggestions = Object.entries(suggestions).filter(([locationName]) =>
    locationName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canAddCustom =
    normalizedSearchTerm &&
    !value[normalizedSearchTerm] &&
    !filteredSuggestions.some(
      ([locationName]) => locationName.toLowerCase() === normalizedSearchTerm.toLowerCase()
    );

  const selectedItems = Object.keys(value);

  const handleAdd = (locationName: string) => {
    if (!value[locationName]) {
      onChange({ ...value, [locationName]: suggestions[locationName] || 1 });
    }
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleAddCustom = (rawLocationName: string) => {
    const locationName = rawLocationName.trim();
    if (!locationName || value[locationName]) return;
    onChange({ ...value, [locationName]: suggestions[locationName] || 1 });
    setSearchTerm('');
    setIsOpen(false);
  };

  const addFromTerm = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    // If the search term matches a single suggestion exactly, prefer that suggestion.
    const exactMatch = filteredSuggestions.find(
      ([locationName]) => locationName.toLowerCase() === trimmed.toLowerCase()
    );
    if (exactMatch) {
      handleAdd(exactMatch[0]);
    } else {
      handleAddCustom(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addFromTerm(searchTerm);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!pasted || !pasted.includes(',') && !pasted.includes('\n') && !pasted.includes('\t')) {
      return;
    }
    e.preventDefault();
    const tokens = pasted.split(/[,\n\t]+/).map(t => t.trim()).filter(Boolean);
    const nextValue = { ...value };
    for (const token of tokens) {
      if (!nextValue[token]) {
        nextValue[token] = suggestions[token] || 1;
      }
    }
    onChange(nextValue);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleRemove = (locationName: string) => {
    const newValue = { ...value };
    delete newValue[locationName];
    onChange(newValue);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className={S.shell}>
        {selectedItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {selectedItems.map((location) => (
              <span key={location} className={S.chip}>
                <MapPin className="h-3 w-3" />
                {location}{suggestions[location] ? ` (${suggestions[location]})` : ' (custom)'}
                <button
                  type="button"
                  onClick={() => handleRemove(location)}
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
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={selectedItems.length === 0 ? placeholder : "Add more locations..."}
            className={S.input}
          />
          <span className="text-[10.5px] text-[var(--text-3)] hidden sm:inline whitespace-nowrap">Enter or comma to add</span>
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
                <VelvetLoader size={22} label="Loading locations" />
              </div>
            ) : filteredSuggestions.length > 0 || canAddCustom ? (
              <div className="py-1.5 max-h-[300px] overflow-y-auto">
                {canAddCustom && (
                  <button
                    type="button"
                    onClick={() => handleAddCustom(normalizedSearchTerm)}
                    className={cn(S.row, S.rowHover, 'border-b border-[var(--line-strong)]')}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={cn('flex items-center justify-center w-7 h-7 rounded-lg', S.iconOff)}>
                        <Plus className="h-4 w-4" />
                      </span>
                      <span className="font-medium text-[var(--text-1)]">Add “{normalizedSearchTerm}”</span>
                    </span>
                    <span className="text-[11px] text-[var(--text-3)]">custom</span>
                  </button>
                )}
                {filteredSuggestions.map(([locationName, count]) => (
                  <button
                    key={locationName}
                    type="button"
                    onClick={() => handleAdd(locationName)}
                    disabled={!!value[locationName]}
                    className={cn(S.row, value[locationName] ? S.rowSelected : S.rowHover)}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={cn('flex items-center justify-center w-7 h-7 rounded-lg', value[locationName] ? S.iconOn : S.iconOff)}>
                        <MapPin className="h-4 w-4" />
                      </span>
                      <span className="flex flex-col">
                        <span className={cn('font-medium', value[locationName] ? S.nameOn : 'text-[var(--text-1)]')}>{locationName}</span>
                        <span className="text-[11px] text-[var(--text-3)]">{count} active users</span>
                      </span>
                    </span>
                    {value[locationName] && <Check className={cn('h-4 w-4', S.check)} />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-[var(--text-3)]">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <div className="text-[var(--text-2)] text-[13px] font-medium">
                  {searchTerm ? `No locations found for “${searchTerm}”` : 'No locations available'}
                </div>
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => handleAddCustom(normalizedSearchTerm)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-[12px] font-medium transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add “{normalizedSearchTerm}”
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CategorySuggestProps {
  value: { [key: string]: number };
  onChange: (value: { [key: string]: number }) => void;
  placeholder?: string;
  className?: string;
}

export function CategoryAutoSuggest({ value, onChange, placeholder = "Search categories...", className }: CategorySuggestProps) {
  const S = fieldStyles('sky');
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<CategoryDetails>({});
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  // Load initial categories
  useEffect(() => {
    const loadInitialCategories = async () => {
      try {
        const result = await adService.getCategoryDetails('');
        if (result.success && result.data) {
          setSuggestions(result.data);
        }
      } catch (error) {
        console.error('Failed to load initial categories:', error);
      }
    };

    loadInitialCategories();
  }, []);

  // Handle search with debounce
  useEffect(() => {
    const searchCategories = async () => {
      if (!searchTerm || searchTerm.length < 2) {
        // Load initial categories if search is cleared
        try {
          const result = await adService.getCategoryDetails('');
          if (result.success && result.data) {
            setSuggestions(result.data);
          }
        } catch (error) {
          console.error('Failed to load categories:', error);
        }
        return;
      }

      setLoading(true);
      try {
        const result = await adService.getCategoryDetails(searchTerm);
        if (result.success && result.data) {
          setSuggestions(result.data);
        }
      } catch (error) {
        console.error('Failed to search categories:', error);
      } finally {
        setLoading(false);
      }
    };

    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Set new timeout for debounce
    searchTimeout.current = setTimeout(searchCategories, 300);

    // Cleanup
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedItems = Object.keys(value);

  const handleAdd = (categoryName: string) => {
    if (!value[categoryName]) {
      onChange({ ...value, [categoryName]: suggestions[categoryName]?.catId || 1 });
    }
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleRemove = (categoryName: string) => {
    const newValue = { ...value };
    delete newValue[categoryName];
    onChange(newValue);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className={S.shell}>
        {selectedItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {selectedItems.map((category) => (
              <span key={category} className={S.chip} title={suggestions[category]?.path || ''}>
                <Tag className="h-3 w-3" />
                {category}
                <button
                  type="button"
                  onClick={() => handleRemove(category)}
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
            placeholder={selectedItems.length === 0 ? placeholder : "Add more categories..."}
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
                <VelvetLoader size={22} label="Searching categories" />
              </div>
            ) : Object.keys(suggestions).length > 0 ? (
              <div className="py-1.5 max-h-[300px] overflow-y-auto">
                {Object.entries(suggestions).map(([categoryName, details]) => (
                  <button
                    key={categoryName}
                    type="button"
                    onClick={() => handleAdd(categoryName)}
                    disabled={!!value[categoryName]}
                    className={cn(S.row, value[categoryName] ? S.rowSelected : S.rowHover)}
                  >
                    <span className="flex items-start gap-2.5 min-w-0">
                      <span className={cn('flex items-center justify-center w-7 h-7 rounded-lg mt-0.5 shrink-0', value[categoryName] ? S.iconOn : S.iconOff)}>
                        <Tag className="h-4 w-4" />
                      </span>
                      <span className="flex flex-col min-w-0">
                        <span className={cn('font-medium', value[categoryName] ? S.nameOn : 'text-[var(--text-1)]')}>{categoryName}</span>
                        <span className="text-[11px] text-[var(--text-3)] truncate max-w-[320px]">{details.path}</span>
                        <span className="text-[10.5px] text-[var(--text-3)] opacity-70">ID: {details.catId}</span>
                      </span>
                    </span>
                    {value[categoryName] && <Check className={cn('h-4 w-4 shrink-0', S.check)} />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-[var(--text-3)]">
                <Tag className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <div className="text-[var(--text-2)] text-[13px] font-medium">
                  {searchTerm ? `No categories found for “${searchTerm}”` : 'Start typing to search categories…'}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface BrandInputProps {
  value: { [key: string]: number };
  onChange: (value: { [key: string]: number }) => void;
  placeholder?: string;
  className?: string;
}

export function BrandInput({ value, onChange, placeholder = "Type brand names...", className }: BrandInputProps) {
  const S = fieldStyles('amber');
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedBrands = Object.keys(value);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addBrand();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const addBrand = () => {
    const brandName = inputValue.trim();
    if (brandName && !value[capitalizeBrand(brandName)]) {
      const capitalizedBrand = capitalizeBrand(brandName);
      onChange({ ...value, [capitalizedBrand]: 1 });
      setInputValue('');
    }
  };

  const capitalizeBrand = (brand: string) => {
    return brand
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleRemove = (brandName: string) => {
    const newValue = { ...value };
    delete newValue[brandName];
    onChange(newValue);
  };

  const handleInputBlur = () => {
    if (inputValue.trim()) {
      addBrand();
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className={S.shell}>
        {selectedBrands.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {selectedBrands.map((brand) => (
              <span key={brand} className={S.chip}>
                <BrandLogo name={brand} />
                {brand}
                <button
                  type="button"
                  onClick={() => handleRemove(brand)}
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
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onBlur={handleInputBlur}
            placeholder={selectedBrands.length === 0 ? placeholder : "Add more brands..."}
            className={S.input}
          />
          <span className="text-[10.5px] text-[var(--text-3)] hidden sm:inline whitespace-nowrap">Enter or comma to add</span>
          <Package className="h-4 w-4 text-[var(--text-3)]" />
        </div>
      </div>

      {inputValue && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-50 left-3 top-full mt-1 bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30 px-2 py-1 rounded-md text-[11px]"
        >
          Saved as: <strong>{capitalizeBrand(inputValue)}</strong>
        </motion.div>
      )}
    </div>
  );
}
