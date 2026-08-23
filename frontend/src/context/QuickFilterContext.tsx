import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { SearchQueryElement } from '../../../backend/src/utils/search';

interface QuickFilterContextValue {
  onFilterChange: (filter: SearchQueryElement | null) => void;
  setOnFilterChange: (fn: (filter: SearchQueryElement | null) => void) => void;
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  condition: 'STARTS_WITH' | 'CONTAINS_SEQUENCE' | 'EQ';
  setCondition: (value: 'STARTS_WITH' | 'CONTAINS_SEQUENCE' | 'EQ') => void;
  activeElementId: number | null;
  setActiveElementId: (value: number | null) => void;
  activePath: number[] | null;
  setActivePath: (value: number[] | null) => void;
  expandedComponentIds: number[];
  toggleComponentExpanded: (id: number) => void;
  expandedElementIds: number[];
  toggleElementExpanded: (id: number) => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

const QuickFilterContext = createContext<QuickFilterContextValue>({
  onFilterChange: () => {},
  setOnFilterChange: () => {},
  enabled: true,
  setEnabled: () => {},
  condition: 'STARTS_WITH',
  setCondition: () => {},
  activeElementId: null,
  setActiveElementId: () => {},
  activePath: null,
  setActivePath: () => {},
  expandedComponentIds: [],
  toggleComponentExpanded: () => {},
  expandedElementIds: [],
  toggleElementExpanded: () => {},
  refreshKey: 0,
  triggerRefresh: () => {},
});

export const QuickFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [handler, setHandler] = useState<(filter: SearchQueryElement | null) => void>(() => () => {});
  const [enabled, setEnabled] = useState(true);
  const [condition, setCondition] = useState<'STARTS_WITH' | 'CONTAINS_SEQUENCE' | 'EQ'>('STARTS_WITH');
  const [activeElementId, setActiveElementId] = useState<number | null>(null);
  const [activePath, setActivePath] = useState<number[] | null>(null);

  const [expandedComponentIds, setExpandedComponentIds] = useState<number[]>([]);
  const [expandedElementIds, setExpandedElementIds] = useState<number[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const setOnFilterChange = useCallback((fn: (filter: SearchQueryElement | null) => void) => {
    setHandler(() => fn);
  }, []);

  const toggleComponentExpanded = useCallback((id: number) => {
    setExpandedComponentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const toggleElementExpanded = useCallback((id: number) => {
    setExpandedElementIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  // Keep a ref to the latest handler so the location effect can invoke it.
  const handlerRef = React.useRef(handler);
  useEffect(() => { handlerRef.current = handler; }, [handler]);

  // Leaving the archive section invalidates the quick signature filter —
  // otherwise returning to /archive silently re-applies a stale filter.
  const location = useLocation();
  const wasInArchive = React.useRef(location.pathname.startsWith('/archive'));
  useEffect(() => {
    const inArchive = location.pathname.startsWith('/archive');
    if (wasInArchive.current && !inArchive) {
      setActiveElementId(null);
      setActivePath(null);
      setEnabled(true);
      setCondition('STARTS_WITH');
      handlerRef.current?.(null);
    }
    wasInArchive.current = inArchive;
  }, [location.pathname]);

  return (
    <QuickFilterContext.Provider value={{
      onFilterChange: handler,
      setOnFilterChange,
      enabled, setEnabled,
      condition, setCondition,
      activeElementId, setActiveElementId,
      activePath, setActivePath,
      expandedComponentIds, toggleComponentExpanded,
      expandedElementIds, toggleElementExpanded,
      refreshKey, triggerRefresh,
    }}>
      {children}
    </QuickFilterContext.Provider>
  );
};

export const useQuickFilterContext = () => useContext(QuickFilterContext);
