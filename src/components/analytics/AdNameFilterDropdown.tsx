import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check, Tag, Target, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';

interface AdOption {
  name: string;
  label: string;
}

interface AdNameFilterDropdownProps {
  options: AdOption[];
  selectedExactValues: string[];
  selectedStartsWithValues: string[];
  onExactChange: (values: string[]) => void;
  onStartsWithChange: (values: string[]) => void;
  placeholder?: string;
  label?: string;
}

export const AdNameFilterDropdown = ({ 
  options, 
  selectedExactValues,
  selectedStartsWithValues,
  onExactChange,
  onStartsWithChange,
  placeholder = 'Select ad names...',
  label = 'Ad Names'
}: AdNameFilterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'startsWith' | 'exact'>('startsWith');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Group options by label
  const groupedByLabel = options.reduce((acc, option) => {
    if (!acc[option.label]) {
      acc[option.label] = [];
    }
    acc[option.label].push(option);
    return acc;
  }, {} as Record<string, AdOption[]>);

  // Get unique labels for "Starts With" tab
  const uniqueLabels = Object.keys(groupedByLabel);

  // Filter options based on search term
  const filteredLabels = uniqueLabels.filter(label => 
    label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredOptions = options.filter(option => 
    option.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStartsWithOption = (label: string) => {
    const isSelected = selectedStartsWithValues.includes(label);
    
    if (isSelected) {
      onStartsWithChange(selectedStartsWithValues.filter(v => v !== label));
    } else {
      onStartsWithChange([...selectedStartsWithValues, label]);
    }
  };

  const handleToggleExactOption = (name: string) => {
    const isSelected = selectedExactValues.includes(name);
    
    if (isSelected) {
      onExactChange(selectedExactValues.filter(v => v !== name));
    } else {
      onExactChange([...selectedExactValues, name]);
    }
  };

  const handleClearAll = () => {
    if (activeTab === 'startsWith') {
      onStartsWithChange([]);
    } else {
      onExactChange([]);
    }
  };

  const getSelectedLabels = () => {
    const exactLabels = selectedExactValues.map(name => {
      const option = options.find(opt => opt.name === name);
      return {
        name,
        displayName: option?.name || name,
        type: 'exact' as const
      };
    });
    
    const startsWithLabels = selectedStartsWithValues.map(label => {
      return {
        label,
        displayName: label,
        type: 'startsWith' as const,
        count: groupedByLabel[label]?.length || 0
      };
    });
    
    return { exactLabels, startsWithLabels };
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

  // Get all selected values for display
  const { exactLabels, startsWithLabels } = getSelectedLabels();
  const allSelectedCount = exactLabels.length + startsWithLabels.length;

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
          className="w-full justify-between h-auto min-h-[2.5rem] p-3 text-left bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300"
        >
          <div className="flex-1 flex flex-wrap gap-1">
            {allSelectedCount === 0 ? (
              <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
            ) : (
              <div className="flex flex-wrap gap-1 max-w-full">
                {[...startsWithLabels, ...exactLabels].slice(0, 2).map((item, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className={`text-xs px-2 py-1 ${
                      item.type === 'exact' 
                        ? 'bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900 dark:to-indigo-900 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800' 
                        : 'bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    {item.type === 'exact' ? '=' : '~'} {item.displayName}
                    {item.type === 'startsWith' && item.count > 1 && (
                      <span className="ml-1 opacity-70">({item.count})</span>
                    )}
                  </Badge>
                ))}
                {allSelectedCount > 2 && (
                  <Badge variant="outline" className="text-xs px-2 py-1 bg-gray-50 dark:bg-gray-700">
                    +{allSelectedCount - 2} more
                  </Badge>
                )}
              </div>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </Button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-[400px] overflow-hidden"
            >
              {/* Tabs for filter mode */}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'startsWith' | 'exact')} className="w-full">
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <TabsList className="w-full bg-gray-50 dark:bg-gray-700">
                    <TabsTrigger value="startsWith" className="flex-1 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-50 data-[state=active]:to-cyan-50 dark:data-[state=active]:from-blue-900/30 dark:data-[state=active]:to-cyan-900/30">
                      <Tag className="h-3 w-3 mr-1 text-blue-500" /> Starts With
                    </TabsTrigger>
                    <TabsTrigger value="exact" className="flex-1 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-50 data-[state=active]:to-indigo-50 dark:data-[state=active]:from-purple-900/30 dark:data-[state=active]:to-indigo-900/30">
                      <Target className="h-3 w-3 mr-1 text-purple-500" /> Exact Match
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Search input */}
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search ad names..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                {(activeTab === 'startsWith' && selectedStartsWithValues.length > 0) || 
                 (activeTab === 'exact' && selectedExactValues.length > 0) ? (
                  <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAll}
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear All ({activeTab === 'startsWith' ? selectedStartsWithValues.length : selectedExactValues.length})
                    </Button>
                  </div>
                ) : null}

                <TabsContent value="startsWith" className="m-0">
                  <div className="max-h-60 overflow-y-auto">
                    {filteredLabels.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                        <Sparkles className="h-5 w-5 mx-auto mb-2 text-gray-400" />
                        No ad labels found
                      </div>
                    ) : (
                      filteredLabels.map((label) => {
                        const isSelected = selectedStartsWithValues.includes(label);
                        const variants = groupedByLabel[label] || [];
                        
                        return (
                          <div
                            key={label}
                            onClick={() => handleToggleStartsWithOption(label)}
                            className={`
                              flex items-center px-4 py-3 cursor-pointer transition-all duration-200
                              ${isSelected 
                                ? 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 text-blue-700 dark:text-blue-300 border-l-4 border-blue-500' 
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-transparent'
                              }
                            `}
                          >
                            <div className="flex items-center space-x-3 flex-1">
                              <div className={`
                                w-5 h-5 border-2 rounded-md flex items-center justify-center transition-all duration-200
                                ${isSelected 
                                  ? 'bg-blue-500 border-blue-500 shadow-md shadow-blue-200 dark:shadow-blue-900/30' 
                                  : 'border-gray-300 dark:border-gray-600'
                                }
                              `}>
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                              <div className="flex-1">
                                <span className="font-medium">{label}</span>
                                {variants.length > 1 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {variants.slice(0, 3).map((variant, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs py-0 px-1.5 bg-gray-50 dark:bg-gray-700">
                                        {variant.name}
                                      </Badge>
                                    ))}
                                    {variants.length > 3 && (
                                      <Badge variant="outline" className="text-xs py-0 px-1.5 bg-gray-50 dark:bg-gray-700">
                                        +{variants.length - 3} more
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {variants.length > 1 && (
                                <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                                  {variants.length} variants
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="exact" className="m-0">
                  <div className="max-h-60 overflow-y-auto">
                    {filteredOptions.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                        <Sparkles className="h-5 w-5 mx-auto mb-2 text-gray-400" />
                        No ad names found
                      </div>
                    ) : (
                      filteredOptions.map((option) => {
                        const isSelected = selectedExactValues.includes(option.name);
                        
                        return (
                          <div
                            key={option.name}
                            onClick={() => handleToggleExactOption(option.name)}
                            className={`
                              flex items-center px-4 py-3 cursor-pointer transition-all duration-200
                              ${isSelected 
                                ? 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 text-purple-700 dark:text-purple-300 border-l-4 border-purple-500' 
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-transparent'
                              }
                            `}
                          >
                            <div className="flex items-center space-x-3 flex-1">
                              <div className={`
                                w-5 h-5 border-2 rounded-full flex items-center justify-center transition-all duration-200
                                ${isSelected 
                                  ? 'bg-purple-500 border-purple-500 shadow-md shadow-purple-200 dark:shadow-purple-900/30' 
                                  : 'border-gray-300 dark:border-gray-600'
                                }
                              `}>
                                {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium">{option.name}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Label: {option.label}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}; 