import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { AppConfigKeys, type UiElementId } from '../../../backend/src/functionalities/config/models';
import { parseHiddenList } from '@/lib/uiVisibility';

interface UiVisibilityContextValue {
  /** Ids of the UI elements an admin chose to hide. */
  hiddenElements: ReadonlySet<UiElementId>;
  isHidden: (id: UiElementId) => boolean;
  isVisible: (id: UiElementId) => boolean;
  /** Re-reads the setting; called after the admin saves it. */
  refresh: () => Promise<void>;
}

const UiVisibilityContext = createContext<UiVisibilityContextValue>({
  // Fail open: without the provider (or before/despite a failed fetch) every
  // control stays visible. Hiding is cosmetic, so an unreadable setting must
  // never remove functionality.
  hiddenElements: new Set<UiElementId>(),
  isHidden: () => false,
  isVisible: () => true,
  refresh: async () => {},
});

export const UiVisibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [hiddenElements, setHiddenElements] = useState<ReadonlySet<UiElementId>>(
    () => new Set<UiElementId>(),
  );

  const refresh = useCallback(async () => {
    if (!token) {
      setHiddenElements(new Set<UiElementId>());
      return;
    }
    try {
      const response = await api.getConfig(AppConfigKeys.HIDDEN_UI_ELEMENTS, token);
      setHiddenElements(new Set(parseHiddenList(response[AppConfigKeys.HIDDEN_UI_ELEMENTS])));
    } catch (err) {
      // Keep whatever we had; on a cold start that means "nothing hidden".
      console.error('Failed to load hidden UI elements setting:', err);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<UiVisibilityContextValue>(() => ({
    hiddenElements,
    isHidden: (id: UiElementId) => hiddenElements.has(id),
    isVisible: (id: UiElementId) => !hiddenElements.has(id),
    refresh,
  }), [hiddenElements, refresh]);

  return <UiVisibilityContext.Provider value={value}>{children}</UiVisibilityContext.Provider>;
};

export const useUiVisibility = () => useContext(UiVisibilityContext);
