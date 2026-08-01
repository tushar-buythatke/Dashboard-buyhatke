import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Accent = 'iris' | 'coral' | 'mint' | 'pink' | 'blue';

interface AccentContextType {
  accent: Accent;
  setAccent: (accent: Accent) => void;
}

const AccentContext = createContext<AccentContextType | undefined>(undefined);
const STORAGE_KEY = 'accent';

export function AccentProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccent] = useState<Accent>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Accent | null;
    return saved === 'coral' || saved === 'mint' || saved === 'pink' || saved === 'blue' ? saved : 'iris';
  });

  useEffect(() => {
    const root = document.documentElement;
    // Piggyback on the same instant-switch class ThemeContext uses, so an
    // accent change doesn't trigger the same staggered color-transition wave.
    root.classList.add('theme-switching');

    if (accent === 'iris') {
      root.removeAttribute('data-accent');
    } else {
      root.setAttribute('data-accent', accent);
    }
    localStorage.setItem(STORAGE_KEY, accent);

    const id = requestAnimationFrame(() => root.classList.remove('theme-switching'));
    return () => cancelAnimationFrame(id);
  }, [accent]);

  const value = useMemo(() => ({ accent, setAccent }), [accent]);

  return <AccentContext.Provider value={value}>{children}</AccentContext.Provider>;
}

export function useAccent() {
  const context = useContext(AccentContext);
  if (context === undefined) {
    throw new Error('useAccent must be used within an AccentProvider');
  }
  return context;
}
