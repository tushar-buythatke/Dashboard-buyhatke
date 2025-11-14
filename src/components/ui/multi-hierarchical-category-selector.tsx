import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, X, Tag, Loader2, Plus, Check, FolderTree, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adService } from '@/services/adService';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CategoryPath, CategoryLevel, CategorySelection } from '@/types';

interface MultiHierarchicalCategorySelectorProps {
  value: CategoryPath;
  onChange: (value: CategoryPath) => void;
  placeholder?: string;
  className?: string;
}

export function MultiHierarchicalCategorySelector({
  value,
  onChange,
  placeholder = "Select categories...",
  className
}: MultiHierarchicalCategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentCategories, setCurrentCategories] = useState<CategoryLevel[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<CategoryLevel[]>([]);
  const [topLevelCategories, setTopLevelCategories] = useState<CategoryLevel[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTopLevelCategories();
  }, []);

  const loadTopLevelCategories = async () => {
    setLoading(true);
    try {
      const result = await adService.getCategoryDetails2();
      if (result.success && result.data) {
        setTopLevelCategories(result.data);
        setCurrentCategories(result.data);
      }
    } catch (error) {
      console.error('Failed to load top-level categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubcategories = async (category: CategoryLevel) => {
    setLoading(true);
    try {
      const result = await adService.getCategoryDetails2(category.catId);
      if (result.success && result.data) {
        if (result.data.length === 0) {
          // No subcategories - this is a leaf node
          setCurrentCategories([]);
        } else {
          setCurrentCategories(result.data);
        }
        setBreadcrumb([...breadcrumb, category]);
      }
    } catch (error) {
      console.error('Failed to load subcategories:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateBack = async () => {
    if (breadcrumb.length === 0) return;

    const newBreadcrumb = [...breadcrumb];
    newBreadcrumb.pop();
    setBreadcrumb(newBreadcrumb);

    if (newBreadcrumb.length === 0) {
      setCurrentCategories(topLevelCategories);
    } else {
      const parent = newBreadcrumb[newBreadcrumb.length - 1];
      setLoading(true);
      try {
        const result = await adService.getCategoryDetails2(parent.catId);
        if (result.success && result.data) {
          setCurrentCategories(result.data);
        }
      } catch (error) {
        console.error('Failed to load parent categories:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const selectCategory = (category: CategoryLevel) => {
    const fullPath = [...breadcrumb, category];
    
    // Check if already selected
    const alreadySelected = value.selections.some(
      sel => sel.selected.catId === category.catId
    );

    if (alreadySelected) return;

    const newSelection: CategorySelection = {
      path: fullPath,
      selected: category
    };

    onChange({
      selections: [...value.selections, newSelection]
    });
  };

  const removeSelection = (catId: number) => {
    onChange({
      selections: value.selections.filter(sel => sel.selected.catId !== catId)
    });
  };

  const isSelected = (catId: number) => {
    return value.selections.some(sel => sel.selected.catId === catId);
  };

  const startOver = () => {
    setBreadcrumb([]);
    setCurrentCategories(topLevelCategories);
    loadTopLevelCategories();
    setIsOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasSelections = value.selections.length > 0;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Selected Categories Display */}
      {hasSelections && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3"
        >
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {value.selections.map((selection, index) => (
                <motion.div
                  key={selection.selected.catId}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative"
                >
                  <Badge
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white pr-8 py-2 text-sm font-medium shadow-md hover:shadow-lg transition-all cursor-default"
                  >
                    <div className="flex items-center gap-1.5">
                      <FolderTree className="h-3.5 w-3.5" />
                      <span className="max-w-[200px] truncate">
                        {selection.path.map(cat => cat.catName).join(' → ')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSelection(selection.selected.catId)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Selector Button */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full rounded-xl border-2 px-4 py-3 text-sm shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-between",
          isOpen
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/50"
            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-400"
        )}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center gap-2">
          <Plus className={cn("h-5 w-5 transition-transform", isOpen && "rotate-45")} />
          <span className="text-gray-700 dark:text-gray-300 font-medium">
            {hasSelections ? `${value.selections.length} selected` : placeholder}
          </span>
        </div>
        <Sparkles className={cn("h-5 w-5", isOpen ? "text-blue-500" : "text-gray-400")} />
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-[9999] w-full mt-2 bg-white dark:bg-gray-800 border-2 border-blue-500 dark:border-blue-600 rounded-xl shadow-2xl overflow-hidden"
            style={{ boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.5)' }}
          >
            {/* Breadcrumb Navigation */}
            {breadcrumb.length > 0 && (
              <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-b border-blue-200 dark:border-blue-700">
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={navigateBack}
                    className="h-7 px-2 hover:bg-blue-100 dark:hover:bg-blue-900"
                  >
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  </Button>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-blue-600 dark:text-blue-400 font-medium">Root</span>
                    {breadcrumb.map((cat, index) => (
                      <React.Fragment key={cat.catId}>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                        <span className={cn(
                          "font-medium",
                          index === breadcrumb.length - 1
                            ? "text-blue-800 dark:text-blue-200"
                            : "text-blue-600 dark:text-blue-400"
                        )}>
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
                  <span className="text-gray-600 dark:text-gray-300">Loading...</span>
                </div>
              ) : currentCategories.length > 0 ? (
                <div className="py-2">
                  {currentCategories.map((category, index) => {
                    const selected = isSelected(category.catId);
                    return (
                      <motion.div
                        key={category.catId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 transition-all duration-200 group",
                          selected
                            ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950"
                            : "hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950 dark:hover:to-purple-950"
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200",
                            selected
                              ? "bg-green-500 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-blue-100 group-hover:text-blue-500 dark:group-hover:bg-blue-900 dark:group-hover:text-blue-300"
                          )}>
                            {selected ? <Check className="h-5 w-5" /> : <Tag className="h-5 w-5" />}
                          </div>
                          <span className={cn(
                            "text-base font-medium",
                            selected
                              ? "text-green-700 dark:text-green-300"
                              : "text-gray-900 dark:text-gray-100"
                          )}>
                            {category.catName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {!selected && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => selectCategory(category)}
                              className="h-8 px-3 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Select
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => loadSubcategories(category)}
                            className="h-8 px-2 hover:bg-purple-100 dark:hover:bg-purple-900"
                          >
                            <ChevronRight className="h-5 w-5 text-purple-500" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : breadcrumb.length > 0 ? (
                <div className="p-8 text-center">
                  <Tag className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <div className="text-gray-800 dark:text-gray-200 font-medium mb-2">
                    No more subcategories
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    You've reached the end of this branch
                  </p>
                  <Button
                    type="button"
                    onClick={navigateBack}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
                    Go Back
                  </Button>
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

            {/* Footer Actions */}
            <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={startOver}
                className="text-xs"
              >
                Reset & Start Over
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Done ({value.selections.length})
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
