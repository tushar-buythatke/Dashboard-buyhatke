import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, ArrowLeft, X, Tag, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adService } from '@/services/adService';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface CategoryNode {
  catId: number;
  catName: string;
}

interface CategoryPath {
  l0: CategoryNode[];
  ln: CategoryNode[];
}

interface HierarchicalCategorySelectorProps {
  value: CategoryPath;
  onChange: (value: CategoryPath) => void;
  placeholder?: string;
  className?: string;
}

export function HierarchicalCategorySelector({
  value,
  onChange,
  placeholder = "Select categories...",
  className
}: HierarchicalCategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentCategories, setCurrentCategories] = useState<CategoryNode[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<CategoryNode[]>([]);
  const [topLevelCategories, setTopLevelCategories] = useState<CategoryNode[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load initial top-level categories when component mounts
  useEffect(() => {
    loadTopLevelCategories();
  }, []);

  // Load top-level suggested categories (no catId)
  const loadTopLevelCategories = async () => {
    setLoading(true);
    try {
      const result = await adService.getCategoryDetails2();
      if (result.success && result.data) {
        // Convert {catId: catName} to array of CategoryNode
        const categories = Object.entries(result.data).map(([catId, catName]) => ({
          catId: Number(catId),
          catName
        }));
        setTopLevelCategories(categories);
        setCurrentCategories(categories);
      }
    } catch (error) {
      console.error('Failed to load top-level categories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load subcategories when a category is selected
  const loadSubcategories = async (category: CategoryNode) => {
    setLoading(true);
    try {
      const result = await adService.getCategoryDetails2(category.catId);
      if (result.success && result.data) {
        // Convert {catId: catName} to array of CategoryNode
        const categories = Object.entries(result.data).map(([catId, catName]) => ({
          catId: Number(catId),
          catName
        }));
        
        if (categories.length === 0) {
          // No more subcategories, this is the final level
          confirmSelection(category);
        } else {
          // Show subcategories
          setCurrentCategories(categories);
          setBreadcrumb([...breadcrumb, category]);
        }
      }
    } catch (error) {
      console.error('Failed to load subcategories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Navigate back in breadcrumb
  const navigateBack = async () => {
    if (breadcrumb.length === 0) {
      return;
    }

    const newBreadcrumb = [...breadcrumb];
    newBreadcrumb.pop();
    setBreadcrumb(newBreadcrumb);

    if (newBreadcrumb.length === 0) {
      // Back to top level
      setCurrentCategories(topLevelCategories);
    } else {
      // Load parent's categories
      const parent = newBreadcrumb[newBreadcrumb.length - 1];
      setLoading(true);
      try {
        const result = await adService.getCategoryDetails2(parent.catId);
        if (result.success && result.data) {
          // Convert {catId: catName} to array of CategoryNode
          const categories = Object.entries(result.data).map(([catId, catName]) => ({
            catId: Number(catId),
            catName
          }));
          setCurrentCategories(categories);
        }
      } catch (error) {
        console.error('Failed to load parent categories:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Confirm final category selection
  const confirmSelection = (finalCategory: CategoryNode) => {
    const l0 = breadcrumb.length > 0 ? [breadcrumb[0]] : [finalCategory];
    const ln = [finalCategory];

    onChange({
      l0,
      ln
    });

    // Reset state
    setBreadcrumb([]);
    setCurrentCategories(topLevelCategories);
    setIsOpen(false);
  };

  // Clear selection
  const clearSelection = () => {
    onChange({
      l0: [],
      ln: []
    });
    setBreadcrumb([]);
    setCurrentCategories(topLevelCategories);
  };

  // Start over (change category)
  const startOver = () => {
    setBreadcrumb([]);
    setCurrentCategories(topLevelCategories);
    loadTopLevelCategories();
    setIsOpen(true);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasSelection = value.ln.length > 0;
  const displayPath = hasSelection 
    ? [...value.l0, ...value.ln].filter((cat, index, arr) => 
        arr.findIndex(c => c.catId === cat.catId) === index
      ).map(cat => cat.catName).join(' → ')
    : '';

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <motion.div 
        className="min-h-[48px] w-full rounded-xl border-2 border-gradient-to-r from-blue-200 to-cyan-200 dark:from-blue-700 dark:to-cyan-700 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 px-4 py-3 text-sm shadow-lg hover:shadow-xl transition-all duration-300 focus-within:ring-4 focus-within:ring-blue-500/20 focus-within:border-blue-500 cursor-pointer"
        whileHover={{ scale: 1.01 }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {hasSelection ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 overflow-hidden">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              <span className="text-gray-900 dark:text-white font-medium truncate">
                {displayPath}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  startOver();
                }}
                className="h-7 text-xs"
              >
                Change
              </Button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelection();
                }}
                className="hover:bg-red-100 dark:hover:bg-red-900 rounded-full p-1 transition-colors"
              >
                <X className="h-4 w-4 text-red-500" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-5 w-5 text-gray-400" />
            </motion.div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-[9999] w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl overflow-hidden"
            style={{ 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)' 
            }}
          >
            {/* Breadcrumb Navigation */}
            {breadcrumb.length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-700">
                <div className="flex items-center gap-2 text-sm">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={navigateBack}
                    className="h-7 px-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-blue-600 dark:text-blue-400 font-medium">Categories</span>
                    {breadcrumb.map((cat, index) => (
                      <React.Fragment key={cat.catId}>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                        <span className="text-blue-800 dark:text-blue-200 font-medium">
                          {cat.catName}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Category List */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="p-8 flex items-center justify-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <span className="text-gray-600 dark:text-gray-300">Loading categories...</span>
                </div>
              ) : currentCategories.length > 0 ? (
                <div className="py-2">
                  {currentCategories.map((category, index) => (
                    <motion.button
                      key={category.catId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      type="button"
                      onClick={() => loadSubcategories(category)}
                      className="w-full text-left px-6 py-4 text-sm transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 dark:hover:from-blue-900/30 dark:hover:to-cyan-900/30 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-blue-100 group-hover:text-blue-500 dark:group-hover:bg-blue-800 dark:group-hover:text-blue-300 transition-all duration-200">
                            <Tag className="h-5 w-5" />
                          </div>
                          <span className="text-gray-900 dark:text-gray-100 font-medium text-base">
                            {category.catName}
                          </span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <div className="text-gray-800 dark:text-gray-200 font-medium">
                    No categories available
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
