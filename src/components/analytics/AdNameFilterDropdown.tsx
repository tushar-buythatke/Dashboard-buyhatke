import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Check, Tag, Target, Search, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  placeholder = 'Select ad names…',
  label = 'Ad Names'
}: AdNameFilterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'startsWith' | 'exact'>('startsWith');
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const groupedByLabel = options.reduce((acc, option) => {
    if (!acc[option.label]) acc[option.label] = [];
    acc[option.label].push(option);
    return acc;
  }, {} as Record<string, AdOption[]>);

  const uniqueLabels = Object.keys(groupedByLabel);
  const filteredLabels = uniqueLabels.filter(label =>
    label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStartsWithOption = (label: string) => {
    if (selectedStartsWithValues.includes(label)) {
      onStartsWithChange(selectedStartsWithValues.filter(v => v !== label));
    } else {
      onStartsWithChange([...selectedStartsWithValues, label]);
    }
  };

  const handleToggleExactOption = (name: string) => {
    if (selectedExactValues.includes(name)) {
      onExactChange(selectedExactValues.filter(v => v !== name));
    } else {
      onExactChange([...selectedExactValues, name]);
    }
  };

  const handleClearAll = () => {
    if (activeTab === 'startsWith') onStartsWithChange([]);
    else onExactChange([]);
  };

  const exactLabels = selectedExactValues.map(name => ({
    name,
    displayName: options.find(opt => opt.name === name)?.name || name,
    type: 'exact' as const
  }));

  const startsWithLabels = selectedStartsWithValues.map(label => ({
    label,
    displayName: label,
    type: 'startsWith' as const,
    count: groupedByLabel[label]?.length || 0
  }));

  const allSelectedCount = exactLabels.length + startsWithLabels.length;

  const updateMenuPosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setSearchTerm('');
  }, [isOpen]);

  return (
    <>
      {label && (
        <label className="block text-[11px] font-medium text-[var(--text-2)] mb-1.5">
          {label}
        </label>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="velvet-focus w-full min-h-[34px] py-1.5 px-3 flex items-center justify-between gap-2 rounded-lg border border-slate-200/80 dark:border-[var(--line)] bg-white/70 dark:bg-[var(--bg-panel-2)] text-left text-[13px] text-[var(--text-1)] hover:border-[var(--line-violet)] transition-all duration-200"
      >
        <div className="flex-1 flex flex-wrap gap-1 min-w-0">
          {allSelectedCount === 0 ? (
            <span className="text-[var(--text-3)] truncate">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1 max-w-full">
              {[...startsWithLabels, ...exactLabels].slice(0, 2).map((item, index) => (
                <span
                  key={index}
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium border ${
                    item.type === 'exact'
                      ? 'bg-[var(--bg-tint)] border-[var(--line-violet)] text-[var(--indigo-500)]'
                      : 'bg-[var(--bg-tint)] border-[var(--line-violet)] text-[var(--indigo-500)]'
                  }`}
                >
                  <span className="opacity-70">{item.type === 'exact' ? '=' : '~'}</span>
                  <span className="max-w-[140px] truncate">{item.displayName}</span>
                  {item.type === 'startsWith' && item.count > 1 && (
                    <span className="opacity-60">({item.count})</span>
                  )}
                </span>
              ))}
              {allSelectedCount > 2 && (
                <span className="inline-flex items-center rounded-md border border-[var(--line)] bg-[var(--bg-panel)] px-1.5 py-0.5 text-[10.5px] font-medium text-[var(--text-2)]">
                  +{allSelectedCount - 2}
                </span>
              )}
            </div>
          )}
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-[var(--text-3)] flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && menuPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}
          className="fixed z-[9999] velvet-panel velvet-micro-shadow rounded-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'startsWith' | 'exact')} className="w-full">
            <div className="border-b border-[var(--line)]">
              <TabsList className="w-full h-9 p-0.5 bg-[var(--bg-panel-2)]">
                <TabsTrigger value="startsWith" className="flex-1 h-8 text-[12px] font-medium data-[state=active]:bg-[var(--bg-panel)] data-[state=active]:text-[var(--indigo-500)] data-[state=active]:shadow-sm rounded-md">
                  <Tag className="h-3 w-3 mr-1" /> Starts With
                </TabsTrigger>
                <TabsTrigger value="exact" className="flex-1 h-8 text-[12px] font-medium data-[state=active]:bg-[var(--bg-panel)] data-[state=active]:text-[var(--indigo-500)] data-[state=active]:shadow-sm rounded-md">
                  <Target className="h-3 w-3 mr-1" /> Exact
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Search input */}
            <div className="p-2 border-b border-[var(--line)]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-3)] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search ad names…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  className="w-full pl-8 pr-8 py-1.5 text-[13px] rounded-md border border-slate-200/80 dark:border-[var(--line)] bg-white/80 dark:bg-[var(--bg-panel-2)] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus:outline-none transition-all duration-200"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-1)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {(activeTab === 'startsWith' && selectedStartsWithValues.length > 0) ||
            (activeTab === 'exact' && selectedExactValues.length > 0) ? (
              <div className="px-2 py-1.5 border-b border-[var(--line)] bg-[var(--bg-panel-2)]">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-medium text-[var(--text-3)] hover:text-[var(--neg)] inline-flex items-center gap-1 transition-colors"
                >
                  <X className="h-3 w-3" strokeWidth={2.5} />
                  Clear all ({activeTab === 'startsWith' ? selectedStartsWithValues.length : selectedExactValues.length})
                </button>
              </div>
            ) : null}

            <TabsContent value="startsWith" className="m-0">
              <div className="max-h-[280px] overflow-y-auto scrollbar-thin">
                {filteredLabels.length === 0 ? (
                  <div className="px-3 py-6 text-[12px] text-[var(--text-3)] text-center">
                    <Sparkles className="h-4 w-4 mx-auto mb-1.5 text-[var(--text-3)]" />
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
                          flex items-center gap-2 px-2.5 py-1.5 cursor-pointer transition-colors text-[13px]
                          ${isSelected
                            ? 'bg-[var(--bg-tint)] text-[var(--indigo-500)]'
                            : 'hover:bg-[var(--bg-panel-2)] text-[var(--text-1)]'
                          }
                        `}
                      >
                        <div className={`
                          w-3.5 h-3.5 border rounded flex items-center justify-center flex-shrink-0
                          ${isSelected
                            ? 'bg-[var(--violet-500)] border-[var(--violet-500)]'
                            : 'border-[var(--line)]'
                          }
                        `}>
                          {isSelected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate block">{label}</span>
                          {variants.length > 1 && (
                            <span className="text-[10.5px] text-[var(--text-3)]">
                              {variants.length} variants
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="exact" className="m-0">
              <div className="max-h-[280px] overflow-y-auto scrollbar-thin">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-6 text-[12px] text-[var(--text-3)] text-center">
                    <Sparkles className="h-4 w-4 mx-auto mb-1.5 text-[var(--text-3)]" />
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
                          flex items-center gap-2 px-2.5 py-1.5 cursor-pointer transition-colors text-[13px]
                          ${isSelected
                            ? 'bg-[var(--bg-tint)] text-[var(--indigo-500)]'
                            : 'hover:bg-[var(--bg-panel-2)] text-[var(--text-1)]'
                          }
                        `}
                      >
                        <div className={`
                          w-3.5 h-3.5 border rounded-full flex items-center justify-center flex-shrink-0
                          ${isSelected
                            ? 'bg-[var(--violet-500)] border-[var(--violet-500)]'
                            : 'border-[var(--line)]'
                          }
                        `}>
                          {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium truncate">{option.name}</span>
                          <span className="text-[10.5px] text-[var(--text-3)] truncate">Label: {option.label}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>,
        document.body
      )}
    </>
  );
};
