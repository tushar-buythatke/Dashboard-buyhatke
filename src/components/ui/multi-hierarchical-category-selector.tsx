import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, X, Tag, Plus, Check, FolderTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adService } from '@/services/adService';
import { motion, AnimatePresence } from 'framer-motion';
import { VelvetLoader } from '@/components/ui/velvet-loader';
import { fieldStyles } from '@/components/ui/select-field-styles';
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
  const S = fieldStyles('sky');
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
        // Convert {catId: catName} to array of CategoryLevel
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

  const loadSubcategories = async (category: CategoryLevel) => {
    setLoading(true);
    try {
      const result = await adService.getCategoryDetails2(category.catId);
      if (result.success && result.data) {
        // Convert {catId: catName} to array of CategoryLevel
        const categories = Object.entries(result.data).map(([catId, catName]) => ({
          catId: Number(catId),
          catName
        }));
        
        if (categories.length === 0) {
          // No subcategories - this is a leaf node
          setCurrentCategories([]);
        } else {
          setCurrentCategories(categories);
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
          // Convert {catId: catName} to array of CategoryLevel
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
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-3)]">
              Selected ({value.selections.length})
            </span>
            <button
              type="button"
              onClick={() => onChange({ selections: [] })}
              className="inline-flex items-center gap-1 h-6 px-2 text-[11px] rounded-md text-[var(--text-3)] hover:text-red-500 hover:bg-[var(--bg-tint)] transition-colors"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <AnimatePresence>
              {value.selections.map((selection) => (
                <motion.span
                  key={selection.selected.catId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={cn(S.chip, 'pl-2 pr-1')}
                >
                  <FolderTree className="h-3 w-3 shrink-0" />
                  <span className="max-w-[200px] truncate">
                    {selection.path.map(cat => cat.catName).join(' → ')}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSelection(selection.selected.catId)}
                    className="opacity-70 hover:opacity-100 rounded p-0.5 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Selector Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full min-h-[2.5rem] rounded-[10px] border bg-[var(--bg-panel)] px-3 py-1.5 text-[13px] transition-[border-color,box-shadow] duration-200 flex items-center justify-between",
          isOpen
            ? "border-sky-400 ring-2 ring-sky-500/20"
            : "border-[var(--line-strong)] hover:border-sky-300"
        )}
      >
        <span className="flex items-center gap-2">
          <Plus className={cn("h-4 w-4 text-[var(--text-3)] transition-transform", isOpen && "rotate-45 text-sky-500")} />
          <span className={cn("font-medium", hasSelections ? "text-[var(--text-1)]" : "text-[var(--text-3)]")}>
            {hasSelections ? `${value.selections.length} selected` : placeholder}
          </span>
        </span>
        <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen ? "rotate-90 text-sky-500" : "text-[var(--text-3)]")} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[9999] w-full mt-1.5 bg-[var(--bg-panel)] border border-[var(--line)] rounded-xl shadow-[var(--shadow-3)] overflow-hidden"
          >
            {/* Breadcrumb Navigation */}
            {breadcrumb.length > 0 && (
              <div className="px-3 py-2 bg-[var(--bg-tint)] border-b border-[var(--line)]">
                <div className="flex items-center gap-1.5 text-[12px] flex-wrap">
                  <button
                    type="button"
                    onClick={navigateBack}
                    className="inline-flex items-center justify-center h-6 w-6 rounded-md text-[var(--text-3)] hover:text-[var(--indigo-500)] hover:bg-[var(--bg-panel)] transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  </button>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[var(--text-3)] font-medium">Root</span>
                    {breadcrumb.map((cat, index) => (
                      <React.Fragment key={cat.catId}>
                        <ChevronRight className="h-3.5 w-3.5 text-[var(--text-3)]" />
                        <span className={cn(
                          "font-medium",
                          index === breadcrumb.length - 1
                            ? "text-[var(--indigo-500)]"
                            : "text-[var(--text-3)]"
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
                <div className="p-8 flex items-center justify-center">
                  <VelvetLoader size={22} label="Loading" />
                </div>
              ) : currentCategories.length > 0 ? (
                <div className="py-2">
                  {currentCategories.map((category) => {
                    const selected = isSelected(category.catId);
                    return (
                      <div
                        key={category.catId}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 transition-colors duration-150 group",
                          selected ? "bg-[var(--bg-tint)]" : "hover:bg-[var(--bg-tint)]"
                        )}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span className={cn(
                            "flex items-center justify-center w-7 h-7 rounded-lg shrink-0",
                            selected
                              ? "bg-[var(--indigo-500)] text-white"
                              : "bg-[var(--bg-tint)] text-[var(--text-3)] group-hover:text-[var(--indigo-500)]"
                          )}>
                            {selected ? <Check className="h-4 w-4" /> : <Tag className="h-4 w-4" />}
                          </span>
                          <span className={cn(
                            "text-[13px] font-medium truncate",
                            selected ? "text-[var(--indigo-500)]" : "text-[var(--text-1)]"
                          )}>
                            {category.catName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {!selected && (
                            <button
                              type="button"
                              onClick={() => selectCategory(category)}
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[12px] font-medium bg-[var(--bg-tint)] text-[var(--indigo-500)] border border-[var(--line-violet)] hover:bg-[var(--bg-panel)] transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Select
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => loadSubcategories(category)}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-[var(--text-3)] hover:text-[var(--indigo-500)] hover:bg-[var(--bg-panel)] transition-colors"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : breadcrumb.length > 0 ? (
                <div className="p-6 text-center">
                  <Tag className="h-8 w-8 mx-auto mb-2 text-[var(--indigo-500)] opacity-60" />
                  <div className="text-[var(--text-2)] text-[13px] font-medium mb-1">
                    No more subcategories
                  </div>
                  <p className="text-[12px] text-[var(--text-3)] mb-3">
                    You've reached the end of this branch
                  </p>
                  <button
                    type="button"
                    onClick={navigateBack}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-[12px] font-medium border border-[var(--line)] text-[var(--text-2)] hover:bg-[var(--bg-tint)] hover:text-[var(--indigo-500)] transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 rotate-180" />
                    Go back
                  </button>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <Tag className="h-8 w-8 mx-auto mb-2 text-[var(--text-3)] opacity-40" />
                  <div className="text-[var(--text-2)] text-[13px] font-medium">
                    No categories available
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-3 py-2 bg-[var(--bg-tint)] border-t border-[var(--line)] flex items-center justify-between">
              <button
                type="button"
                onClick={startOver}
                className="h-7 px-2 rounded-md text-[12px] text-[var(--text-3)] hover:text-[var(--indigo-500)] hover:bg-[var(--bg-panel)] transition-colors"
              >
                Reset &amp; start over
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-7 px-3 rounded-md text-[12px] font-medium bg-[var(--indigo-500)] text-white hover:opacity-90 transition-opacity"
              >
                Done ({value.selections.length})
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
