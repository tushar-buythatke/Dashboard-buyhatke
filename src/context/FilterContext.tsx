import { createContext, useContext, useState, useReducer, ReactNode } from 'react';
import { FilterState } from '@/types';

interface FilterContextType {
  filters: FilterState;
  updateFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

const initialState: FilterState = {
  dateRange: {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  },
  campaigns: [],
  platforms: [],
  gender: [],
  ageGroups: []
};

type FilterAction = 
  | { type: 'UPDATE_FILTERS'; payload: Partial<FilterState> }
  | { type: 'RESET_FILTERS' };

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'UPDATE_FILTERS':
      return { ...state, ...action.payload };
    case 'RESET_FILTERS':
      return initialState;
    default:
      return state;
  }
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, dispatch] = useReducer(filterReducer, initialState);

  const updateFilters = (newFilters: Partial<FilterState>) => {
    dispatch({ type: 'UPDATE_FILTERS', payload: newFilters });
  };

  const resetFilters = () => {
    dispatch({ type: 'RESET_FILTERS' });
  };

  return (
    <FilterContext.Provider value={{ filters, updateFilters, resetFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}