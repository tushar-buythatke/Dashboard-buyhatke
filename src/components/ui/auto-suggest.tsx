import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, X, MapPin, Tag, Sparkles, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adService, LocationDetails, CategoryDetails } from '@/services/adService';
import { motion, AnimatePresence } from 'framer-motion';

interface LocationSuggestProps {
  value: { [key: string]: number };
  onChange: (value: { [key: string]: number }) => void;
  placeholder?: string;
  className?: string;
}

export function LocationAutoSuggest({ value, onChange, placeholder = "Search locations...", className }: LocationSuggestProps) {
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

  const filteredSuggestions = Object.entries(suggestions).filter(([locationName]) =>
    locationName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedItems = Object.keys(value);

  const handleAdd = (locationName: string) => {
    if (!value[locationName]) {
      onChange({ ...value, [locationName]: 1 });
    }
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
      <motion.div 
        className="min-h-[48px] w-full rounded-xl border-2 border-gradient-to-r from-purple-200 to-pink-200 dark:from-purple-700 dark:to-pink-700 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 px-4 py-3 text-sm shadow-lg hover:shadow-xl transition-all duration-300 focus-within:ring-4 focus-within:ring-purple-500/20 focus-within:border-purple-500"
        whileHover={{ scale: 1.01 }}
        whileFocus={{ scale: 1.01 }}
      >
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedItems.map((location) => (
            <motion.span
              key={location}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              <MapPin className="h-3 w-3" />
              {location} ({suggestions[location] || '0'})
              <button
                type="button"
                onClick={() => handleRemove(location)}
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
            placeholder={selectedItems.length === 0 ? placeholder : "Add more locations..."}
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
            className="absolute z-[1] w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl max-h-[400px] "
            style={{ 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)' 
            }}
          >
            {loading ? (
              <div className="p-6 text-center text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 animate-spin" />
                <span className="text-gray-800 dark:text-gray-200 font-medium">Loading locations...</span>
              </div>
            ) : filteredSuggestions.length > 0 ? (
              <div className="py-2 max-h-[350px] overflow-y-auto">
                {filteredSuggestions.map(([locationName, count], index) => (
                  <motion.button
                    key={locationName}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    type="button"
                    onClick={() => handleAdd(locationName)}
                    disabled={!!value[locationName]}
                    className={cn(
                      "w-full text-left px-6 py-4 text-sm transition-all duration-200 flex items-center justify-between group",
                      value[locationName] 
                        ? "bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/50 dark:to-pink-900/50 border-l-4 border-purple-500" 
                        : "hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30"
                    )}
                  >
                    <span className="flex items-center gap-4">
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200",
                        value[locationName] 
                          ? "bg-purple-500 text-white" 
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-purple-100 group-hover:text-purple-500 dark:group-hover:bg-purple-800 dark:group-hover:text-purple-300"
                      )}>
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <div className={cn(
                          "font-semibold text-lg",
                          value[locationName] 
                            ? "text-purple-700 dark:text-purple-300" 
                            : "text-gray-900 dark:text-gray-100"
                        )}>{locationName}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {count} active users
                        </div>
                      </div>
                    </span>
                    {value[locationName] && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"
                      >
                        <Check className="h-5 w-5 text-white" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <div className="text-gray-800 dark:text-gray-200 font-medium">
                  {searchTerm ? `No locations found for "${searchTerm}"` : 'No locations available'}
                </div>
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
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<CategoryDetails>({});
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const searchCategories = async (term: string) => {
      if (!term || term.length < 1) {
        setSuggestions({});
        return;
      }

      setLoading(true);
      try {
        const result = await adService.getCategoryDetails(term);
        if (result.success && result.data) {
          setSuggestions(result.data);
        }
      } catch (error) {
        console.error('Failed to search categories:', error);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      searchCategories(searchTerm);
    }, 300);

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
      onChange({ ...value, [categoryName]: 1 });
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
      <motion.div 
        className="min-h-[48px] w-full rounded-xl border-2 border-gradient-to-r from-blue-200 to-cyan-200 dark:from-blue-700 dark:to-cyan-700 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 px-4 py-3 text-sm shadow-lg hover:shadow-xl transition-all duration-300 focus-within:ring-4 focus-within:ring-blue-500/20 focus-within:border-blue-500"
        whileHover={{ scale: 1.01 }}
        whileFocus={{ scale: 1.01 }}
      >
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedItems.map((category) => (
            <motion.span
              key={category}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-md hover:shadow-lg transition-all duration-200"
              title={suggestions[category] || ''}
            >
              <Tag className="h-3 w-3" />
              {category}
              <button
                type="button"
                onClick={() => handleRemove(category)}
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
            placeholder={selectedItems.length === 0 ? placeholder : "Add more categories..."}
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
            className="absolute z-[9999] w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl max-h-[400px] overflow-hidden"
            style={{ 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)' 
            }}
          >
            {loading ? (
              <div className="p-6 text-center text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 animate-spin" />
                <span className="text-gray-800 dark:text-gray-200 font-medium">Searching categories...</span>
              </div>
            ) : Object.keys(suggestions).length > 0 ? (
              <div className="py-2 max-h-[350px] overflow-y-auto">
                {Object.entries(suggestions).map(([categoryName, categoryPath], index) => (
                  <motion.button
                    key={categoryName}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    type="button"
                    onClick={() => handleAdd(categoryName)}
                    disabled={!!value[categoryName]}
                    className={cn(
                      "w-full text-left px-6 py-4 text-sm transition-all duration-200 group",
                      value[categoryName] 
                        ? "bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/50 dark:to-cyan-900/50 border-l-4 border-blue-500" 
                        : "hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 dark:hover:from-blue-900/30 dark:hover:to-cyan-900/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 mt-1",
                          value[categoryName] 
                            ? "bg-blue-500 text-white" 
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-blue-100 group-hover:text-blue-500 dark:group-hover:bg-blue-800 dark:group-hover:text-blue-300"
                        )}>
                          <Tag className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className={cn(
                            "font-semibold text-lg",
                            value[categoryName] 
                              ? "text-blue-700 dark:text-blue-300" 
                              : "text-gray-900 dark:text-gray-100"
                          )}>{categoryName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md mt-1">
                            {categoryPath}
                          </div>
                        </div>
                      </div>
                      {value[categoryName] && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                        >
                          <Check className="h-5 w-5 text-white" />
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : searchTerm && !loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <div className="text-gray-800 dark:text-gray-200 font-medium">
                  No categories found for "{searchTerm}"
                </div>
              </div>
            ) : !searchTerm ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <div className="text-gray-800 dark:text-gray-200 font-medium">
                  Start typing to search categories...
                </div>
              </div>
            ) : null}
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
      <motion.div 
        className="min-h-[48px] w-full rounded-xl border-2 border-gradient-to-r from-orange-200 to-red-200 dark:from-orange-700 dark:to-red-700 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 px-4 py-3 text-sm shadow-lg hover:shadow-xl transition-all duration-300 focus-within:ring-4 focus-within:ring-orange-500/20 focus-within:border-orange-500"
        whileHover={{ scale: 1.01 }}
        whileFocus={{ scale: 1.01 }}
      >
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedBrands.map((brand) => (
            <motion.span
              key={brand}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Package className="h-5 w-5" />
              {brand}
              <button
                type="button"
                onClick={() => handleRemove(brand)}
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
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onBlur={handleInputBlur}
            placeholder={selectedBrands.length === 0 ? placeholder : "Add more brands..."}
            className="flex-1 border-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-sm"
          />
          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-xs">Press Enter or comma to add</span>
            <Package className="h-5 w-5" />
          </div>
        </div>
      </motion.div>
      
      {inputValue && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-50 left-4 top-full mt-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded text-xs"
        >
          Will be saved as: <strong>{capitalizeBrand(inputValue)}</strong>
        </motion.div>
      )}
    </div>
  );
} 