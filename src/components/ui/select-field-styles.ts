// Shared styling for the custom multi-select fields (Sites / Locations / Brands /
// Categories) so they read as ONE system while each keeping a subtle color accent.
// Tailwind needs literal class strings, so every accent is spelled out in full.

export type FieldAccent = 'violet' | 'sky' | 'amber' | 'emerald';

export interface FieldStyles {
  shell: string;      // outer input shell
  chip: string;       // selected-value pill
  input: string;      // inner text input
  menu: string;       // dropdown panel
  row: string;        // dropdown row base
  rowSelected: string;
  rowHover: string;
  iconOn: string;     // icon container when selected
  iconOff: string;    // icon container default
  nameOn: string;     // selected item label color
  check: string;      // check / accent icon color
}

const BASE_INPUT =
  'flex-1 min-w-[80px] border-0 bg-transparent text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none text-[13px]';
const BASE_ROW =
  'w-full text-left px-3 py-2.5 text-[13px] transition-colors duration-150 flex items-center justify-between group';
// A clearly visible panel in both themes — stronger border + real shadow.
const BASE_MENU =
  'absolute z-[9999] w-full mt-1.5 bg-[var(--bg-panel)] rounded-xl overflow-hidden border border-[var(--line-strong)] ' +
  'shadow-[0_16px_44px_-12px_rgba(15,12,40,0.28)] dark:shadow-[0_18px_48px_-12px_rgba(0,0,0,0.65)] ' +
  'ring-1 ring-black/[0.03] dark:ring-white/[0.05]';

const ACCENTS: Record<FieldAccent, Omit<FieldStyles, 'input' | 'row' | 'menu'>> = {
  violet: {
    shell:
      'min-h-[2.5rem] w-full rounded-[10px] border border-[var(--line-strong)] bg-[var(--bg-panel)] px-3 py-1.5 text-[13px] transition-[border-color,box-shadow] duration-200 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/20',
    chip: 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-500/15 dark:text-violet-200 dark:border-violet-500/30',
    rowSelected: 'bg-violet-50/80 dark:bg-violet-500/10',
    rowHover: 'hover:bg-violet-50/80 dark:hover:bg-violet-500/10',
    iconOn: 'bg-violet-500 text-white',
    iconOff: 'bg-violet-50 text-violet-500 dark:bg-violet-500/15 dark:text-violet-300',
    nameOn: 'text-violet-700 dark:text-violet-300',
    check: 'text-violet-500 dark:text-violet-300',
  },
  sky: {
    shell:
      'min-h-[2.5rem] w-full rounded-[10px] border border-[var(--line-strong)] bg-[var(--bg-panel)] px-3 py-1.5 text-[13px] transition-[border-color,box-shadow] duration-200 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-500/20',
    chip: 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-500/30',
    rowSelected: 'bg-sky-50/80 dark:bg-sky-500/10',
    rowHover: 'hover:bg-sky-50/80 dark:hover:bg-sky-500/10',
    iconOn: 'bg-sky-500 text-white',
    iconOff: 'bg-sky-50 text-sky-500 dark:bg-sky-500/15 dark:text-sky-300',
    nameOn: 'text-sky-700 dark:text-sky-300',
    check: 'text-sky-500 dark:text-sky-300',
  },
  amber: {
    shell:
      'min-h-[2.5rem] w-full rounded-[10px] border border-[var(--line-strong)] bg-[var(--bg-panel)] px-3 py-1.5 text-[13px] transition-[border-color,box-shadow] duration-200 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-500/20',
    chip: 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30',
    rowSelected: 'bg-amber-50/80 dark:bg-amber-500/10',
    rowHover: 'hover:bg-amber-50/80 dark:hover:bg-amber-500/10',
    iconOn: 'bg-amber-500 text-white',
    iconOff: 'bg-amber-50 text-amber-500 dark:bg-amber-500/15 dark:text-amber-300',
    nameOn: 'text-amber-700 dark:text-amber-300',
    check: 'text-amber-500 dark:text-amber-300',
  },
  emerald: {
    shell:
      'min-h-[2.5rem] w-full rounded-[10px] border border-[var(--line-strong)] bg-[var(--bg-panel)] px-3 py-1.5 text-[13px] transition-[border-color,box-shadow] duration-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20',
    chip: 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/30',
    rowSelected: 'bg-emerald-50/80 dark:bg-emerald-500/10',
    rowHover: 'hover:bg-emerald-50/80 dark:hover:bg-emerald-500/10',
    iconOn: 'bg-emerald-500 text-white',
    iconOff: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-300',
    nameOn: 'text-emerald-700 dark:text-emerald-300',
    check: 'text-emerald-500 dark:text-emerald-300',
  },
};

export function fieldStyles(accent: FieldAccent): FieldStyles {
  return { ...ACCENTS[accent], input: BASE_INPUT, row: BASE_ROW, menu: BASE_MENU };
}
