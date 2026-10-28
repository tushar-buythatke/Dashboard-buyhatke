import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, X, Tag, Plus, Check, FolderTree, Search, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adService } from '@/services/adService';
import { motion, AnimatePresence } from 'framer-motion';
import { VelvetLoader } from '@/components/ui/velvet-loader';
import { fieldStyles } from '@/components/ui/select-field-styles';
import { CategoryPath, CategoryLevel, CategorySelection, CategorySearchResult } from '@/types';

interface MultiHierarchicalCategorySelectorProps {
  value: CategoryPath;
  onChange: (value: CategoryPath) => void;
  placeholder?: string;
  className?: string;
}

const SEARCH_MIN_LENGTH = 2;

// 1234 -> "1.2k", 1500000 -> "1.5M"
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

function ProductCount({ count }: { count?: number }) {
  if (count === undefined) return null;
  return (
    <span
      title={`${count.toLocaleString()} products`}
      className="shrink-0 inline-flex items-center h-5 px-1.5 rounded text-[10.5px] font-medium tabular-nums bg-[var(--bg-tint)] text-[var(--text-3)]"
    >
      {formatCount(count)}
    </span>
  );
}

function CatId({ id }: { id: number }) {
  return (
    <span className="shrink-0 text-[10.5px] font-mono tabular-nums text-[var(--text-3)]">#{id}</span>
  );
}

const withIds = (cats: CategoryLevel[]) => cats.map(m => `${m.catName} #${m.catId}`).join(', ');

// Variants (singular/plural, & / and) the API merges in on save.
function MergedHint({ mapped }: { mapped?: CategoryLevel[] }) {
  if (!mapped || mapped.length === 0) return null;
  return (
    <span
      title={`Also targets: ${withIds(mapped)}`}
      className="inline-flex items-center gap-1 text-[11px] text-[var(--text-3)] truncate"
    >
      <Layers className="h-3 w-3 shrink-0" />
      <span className="truncate">+ {withIds(mapped)}</span>
    </span>
  );
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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<CategorySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const isSearchMode = searchTerm.trim().length >= SEARCH_MIN_LENGTH;

  useEffect(() => {
    loadTopLevelCategories();
  }, []);

  // Debounced search; the newest term wins.
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    const term = searchTerm.trim();
    if (term.length < SEARCH_MIN_LENGTH) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    searchTimeout.current = setTimeout(async () => {
      const result = await adService.searchCategories(term);
      if (cancelled) return;
      setSearchResults(result.success ? result.data : []);
      setSearching(false);
    }, 300);
    return () => {
      cancelled = true;
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchTerm]);

  const loadTopLevelCategories = async () => {
    setLoading(true);
    try {
      const result = await adService.getCategoryOptions();
      if (result.success) {
        setTopLevelCategories(result.data);
        setCurrentCategories(result.data);
      }
    } catch (error) {
      console.error('Failed to load top-level categories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Opens `category` with `trail` (the categories above it) as the breadcrumb.
  const openCategory = async (category: CategoryLevel, trail: CategoryLevel[]) => {
    setLoading(true);
    try {
      const result = await adService.getCategoryOptions(category.catId);
      if (result.success) {
        // An empty list means a leaf node
        setCurrentCategories(result.data);
        setBreadcrumb([...trail, category]);
      }
    } catch (error) {
      console.error('Failed to load subcategories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubcategories = (category: CategoryLevel) => openCategory(category, breadcrumb);

  // From a search hit: jump into the tree at that category.
  const openSearchResult = (hit: CategorySearchResult) => {
    setSearchTerm('');
    openCategory(hit, hit.path.slice(0, -1));
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
        const result = await adService.getCategoryOptions(parent.catId);
        if (result.success) {
          setCurrentCategories(result.data);
        }
      } catch (error) {
        console.error('Failed to load parent categories:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Selected directly, or merged in through a selected category's variants.
  const isSelected = (catId: number) => {
    return value.selections.some(
      sel => sel.selected.catId === catId || (sel.selected.mapped || []).some(m => m.catId === catId)
    );
  };

  // `path` is the full breadcrumb, ending with the category being selected.
  const addSelection = (path: CategoryLevel[]) => {
    const category = path[path.length - 1];
    if (!category || isSelected(category.catId)) return;

    const newSelection: CategorySelection = {
      path,
      selected: category
    };

    onChange({
      selections: [...value.selections, newSelection]
    });
  };

  const selectCategory = (category: CategoryLevel) => addSelection([...breadcrumb, category]);

  const removeSelection = (catId: number) => {
    onChange({
      selections: value.selections.filter(sel => sel.selected.catId !== catId)
    });
  };

  const startOver = () => {
    setSearchTerm('');
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
  const currentLevel = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1] : null;

  const selectButton = (onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[12px] font-medium bg-[var(--bg-tint)] text-[var(--indigo-500)] border border-[var(--line-violet)] hover:bg-[var(--bg-panel)] transition-colors"
    >
      <Plus className="h-3.5 w-3.5" />
      Select
    </button>
  );

  const drillButton = (onClick: () => void, title: string) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex items-center justify-center h-7 w-7 rounded-md text-[var(--text-3)] hover:text-[var(--indigo-500)] hover:bg-[var(--bg-panel)] transition-colors"
    >
      <ChevronRight className="h-4 w-4" />
    </button>
  );

  const rowIcon = (selected: boolean) => (
    <span className={cn(
      "flex items-center justify-center w-7 h-7 rounded-lg shrink-0",
      selected
        ? "bg-[var(--indigo-500)] text-white"
        : "bg-[var(--bg-tint)] text-[var(--text-3)] group-hover:text-[var(--indigo-500)]"
    )}>
      {selected ? <Check className="h-4 w-4" /> : <Tag className="h-4 w-4" />}
    </span>
  );

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
              {value.selections.map((selection) => {
                const mapped = selection.selected.mapped || [];
                return (
                  <motion.span
                    key={selection.selected.catId}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={cn(S.chip, 'pl-2 pr-1')}
                    title={mapped.length ? `Also targets: ${withIds(mapped)}` : undefined}
                  >
                    <FolderTree className="h-3 w-3 shrink-0" />
                    <span className="max-w-[200px] truncate">
                      {selection.path.map(cat => cat.catName).join(' → ')}
                    </span>
                    <span className="font-mono tabular-nums opacity-70">#{selection.selected.catId}</span>
                    {mapped.length > 0 && (
                      <span className="inline-flex items-center gap-0.5 opacity-80">
                        <Layers className="h-3 w-3" />+{mapped.length}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeSelection(selection.selected.catId)}
                      className="opacity-70 hover:opacity-100 rounded p-0.5 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </motion.span>
                );
              })}
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
            {/* Search */}
            <div className="px-3 py-2 border-b border-[var(--line)]">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 shrink-0 text-[var(--text-3)]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search a category at any level..."
                  className={S.input}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="inline-flex items-center justify-center h-6 w-6 rounded-md text-[var(--text-3)] hover:text-[var(--indigo-500)] hover:bg-[var(--bg-tint)] transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Breadcrumb Navigation */}
            {!isSearchMode && currentLevel && (
              <div className="px-3 py-2 bg-[var(--bg-tint)] border-b border-[var(--line)]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[12px] flex-wrap min-w-0">
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
                  {/* Stop here: select the level currently open */}
                  {isSelected(currentLevel.catId) ? (
                    <span className="shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[12px] font-medium text-[var(--indigo-500)]">
                      <Check className="h-3.5 w-3.5" />
                      Selected
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addSelection(breadcrumb)}
                      title={`Target "${currentLevel.catName}" and everything under it`}
                      className="shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[12px] font-medium bg-[var(--indigo-500)] text-white hover:opacity-90 transition-opacity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Select this level
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Category List */}
            <div className="max-h-[400px] overflow-y-auto">
              {isSearchMode ? (
                searching ? (
                  <div className="p-8 flex items-center justify-center">
                    <VelvetLoader size={22} label="Searching" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="py-2">
                    {searchResults.map((hit) => {
                      const selected = isSelected(hit.catId);
                      const ancestors = hit.path.slice(0, -1);
                      return (
                        <div
                          key={hit.catId}
                          className={cn(
                            "flex items-center justify-between px-3 py-2 transition-colors duration-150 group",
                            selected ? "bg-[var(--bg-tint)]" : "hover:bg-[var(--bg-tint)]"
                          )}
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            {rowIcon(selected)}
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={cn(
                                  "text-[13px] font-medium truncate",
                                  selected ? "text-[var(--indigo-500)]" : "text-[var(--text-1)]"
                                )}>
                                  {hit.catName}
                                </span>
                                <CatId id={hit.catId} />
                                <ProductCount count={hit.productCount} />
                              </div>
                              {ancestors.length > 0 && (
                                <span className="text-[11px] text-[var(--text-3)] truncate">
                                  {ancestors.map(a => a.catName).join(' → ')}
                                </span>
                              )}
                              <MergedHint mapped={hit.mapped} />
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {!selected && selectButton(() => addSelection(hit.path))}
                            {drillButton(() => openSearchResult(hit), 'Open in the tree')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Search className="h-8 w-8 mx-auto mb-2 text-[var(--text-3)] opacity-40" />
                    <div className="text-[var(--text-2)] text-[13px] font-medium">
                      No categories match "{searchTerm.trim()}"
                    </div>
                  </div>
                )
              ) : loading ? (
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
                          {rowIcon(selected)}
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={cn(
                                "text-[13px] font-medium truncate",
                                selected ? "text-[var(--indigo-500)]" : "text-[var(--text-1)]"
                              )}>
                                {category.catName}
                              </span>
                              <CatId id={category.catId} />
                              <ProductCount count={category.productCount} />
                            </div>
                            <MergedHint mapped={category.mapped} />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {!selected && selectButton(() => selectCategory(category))}
                          {drillButton(() => loadSubcategories(category), 'Open subcategories')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : currentLevel ? (
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
