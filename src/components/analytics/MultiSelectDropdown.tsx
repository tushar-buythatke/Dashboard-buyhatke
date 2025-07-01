import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Option {
  value: string | number;
  label: string;
}

interface MultiSelectDropdownProps {
  options: Option[];
  selectedValues: (string | number)[];
  onChange: (values: (string | number)[]) => void;
  placeholder?: string;
  label?: string;
  maxSelections?: number;
}

export const MultiSelectDropdown = ({ 
  options, 
  selectedValues, 
  onChange, 
  placeholder = 'Select options...',
  label,
  maxSelections
}: MultiSelectDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleOption = (value: string | number) => {
    const isSelected = selectedValues.includes(value);
    
    if (isSelected) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      if (!maxSelections || selectedValues.length < maxSelections) {
        onChange([...selectedValues, value]);
      }
    }
  };

  const handleRemoveSelection = (value: string | number) => {
    onChange(selectedValues.filter(v => v !== value));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const getSelectedLabels = () => {
    return selectedValues.map(value => 
      options.find(option => option.value === value)?.label || value
    );
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full justify-between h-auto min-h-[2.5rem] p-3 text-left"
        >
          <div className="flex-1 flex flex-wrap gap-1">
            {selectedValues.length === 0 ? (
              <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
            ) : (
              <div className="flex flex-wrap gap-1 max-w-full">
                {getSelectedLabels().slice(0, 2).map((label, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                  >
                    {label}
                  </Badge>
                ))}
                {selectedValues.length > 2 && (
                  <Badge variant="outline" className="text-xs px-2 py-1">
                    +{selectedValues.length - 2} more
                  </Badge>
                )}
              </div>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-hidden">
            {/* Search input */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <input
                type="text"
                placeholder="Search options..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action buttons */}
            {selectedValues.length > 0 && (
              <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear All ({selectedValues.length})
                </Button>
              </div>
            )}

            {/* Options list */}
            <div className="max-h-40 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  const isDisabled = maxSelections && selectedValues.length >= maxSelections && !isSelected;
                  
                  return (
                    <div
                      key={option.value}
                      onClick={() => !isDisabled && handleToggleOption(option.value)}
                      className={`
                        flex items-center px-3 py-2 text-sm cursor-pointer transition-colors
                        ${isSelected 
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                        }
                        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <div className="flex items-center space-x-2 flex-1">
                        <div className={`
                          w-4 h-4 border-2 rounded flex items-center justify-center
                          ${isSelected 
                            ? 'bg-blue-600 border-blue-600' 
                            : 'border-gray-300 dark:border-gray-600'
                          }
                        `}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className="truncate">{option.label}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {maxSelections && (
              <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedValues.length} of {maxSelections} selected
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 