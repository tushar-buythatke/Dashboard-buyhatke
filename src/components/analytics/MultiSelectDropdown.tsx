import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Check, Search } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
  image?: string;
}

interface MultiSelectDropdownProps {
  options: Option[];
  selectedValues: (string | number)[];
  onChange: (values: (string | number)[]) => void;
  placeholder?: string;
  label?: string;
  maxSelections?: number;
  disabled?: boolean;
}

export const MultiSelectDropdown = ({
  options,
  selectedValues,
  onChange,
  placeholder = 'Select options…',
  label,
  maxSelections,
  disabled = false
}: MultiSelectDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleClearAll = () => onChange([]);

  const getSelectedLabels = () =>
    selectedValues.map(value =>
      options.find(option => option.value === value)?.label || value
    );

  // Position the floating menu under the trigger
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
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) return;
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
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="velvet-focus w-full min-h-[34px] py-1.5 px-3 flex items-center justify-between gap-2 rounded-lg border border-slate-200/80 dark:border-[var(--line)] bg-white/70 dark:bg-[var(--bg-panel-2)] text-left text-[13px] text-[var(--text-1)] hover:border-[var(--line-violet)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex-1 flex flex-wrap gap-1 min-w-0">
          {selectedValues.length === 0 ? (
            <span className="text-[var(--text-3)] truncate">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1 max-w-full">
              {getSelectedLabels().slice(0, 2).map((lbl, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-tint)] border border-[var(--line-violet)] px-1.5 py-0.5 text-[10.5px] font-medium text-[var(--indigo-500)]"
                >
                  <span className="max-w-[120px] truncate">{lbl}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveSelection(selectedValues[index]);
                    }}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                  </button>
                </span>
              ))}
              {selectedValues.length > 2 && (
                <span className="inline-flex items-center rounded-md border border-[var(--line)] bg-[var(--bg-panel)] px-1.5 py-0.5 text-[10.5px] font-medium text-[var(--text-2)]">
                  +{selectedValues.length - 2}
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
          {/* Search input */}
          <div className="p-2 border-b border-[var(--line)]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-3)] pointer-events-none" />
              <input
                type="text"
                placeholder="Search…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 text-[13px] rounded-md border border-slate-200/80 dark:border-[var(--line)] bg-white/80 dark:bg-[var(--bg-panel-2)] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus:outline-none transition-all duration-200"
              />
            </div>
          </div>

          {/* Action buttons */}
          {selectedValues.length > 0 && (
            <div className="px-2 py-1.5 border-b border-[var(--line)] bg-[var(--bg-panel-2)]">
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] font-medium text-[var(--text-3)] hover:text-[var(--neg)] inline-flex items-center gap-1 transition-colors"
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
                Clear all ({selectedValues.length})
              </button>
            </div>
          )}

          {/* Options list */}
          <div className="max-h-[280px] overflow-y-auto scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-[12px] text-[var(--text-3)] text-center">
                No matches
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
                      flex items-center gap-2 px-2.5 py-1.5 cursor-pointer transition-colors text-[13px]
                      ${isSelected
                        ? 'bg-[var(--bg-tint)] text-[var(--indigo-500)]'
                        : 'hover:bg-[var(--bg-panel-2)] text-[var(--text-1)]'
                      }
                      ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}
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
                    {option.image && (
                      <img src={option.image} alt={option.label} className="h-4 w-4 rounded-sm flex-shrink-0" />
                    )}
                    <span className="truncate flex-1">{option.label}</span>
                  </div>
                );
              })
            )}
          </div>

          {maxSelections && (
            <div className="px-2.5 py-1.5 border-t border-[var(--line)] bg-[var(--bg-panel-2)] text-[10.5px] text-[var(--text-3)]">
              {selectedValues.length} of {maxSelections} selected
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
};
