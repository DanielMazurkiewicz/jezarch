import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { compareSignatureComponentsBy } from '@/lib/signatureComponentSort';
import { compareSignatureElementsBy } from '@/lib/signatureElementSort';
import {
    AppConfigKeys,
    DEFAULT_COMPONENT_SORT_MODE,
    DEFAULT_ELEMENT_SORT_MODE,
    isComponentSortMode,
    isElementSortMode,
    type ComponentSortMode,
    type ElementSortMode,
} from '../../../backend/src/functionalities/config/models';
import type { SignatureComponent } from '../../../backend/src/functionalities/signature/component/models';
import type { SignatureElement } from '../../../backend/src/functionalities/signature/element/models';

interface SignatureSortContextValue {
  componentMode: ComponentSortMode;
  componentReversed: boolean;
  elementMode: ElementSortMode;
  elementReversed: boolean;
  /** Ready-made comparators for the mode/reversal an admin selected. */
  sortComponents: (a: SignatureComponent, b: SignatureComponent) => number;
  sortElements: (a: SignatureElement, b: SignatureElement) => number;
  /** Re-reads the setting; called after the admin saves it. */
  refresh: () => Promise<void>;
}

const SignatureSortContext = createContext<SignatureSortContextValue>({
  // Fail to the historical ordering: without the provider (or before/despite a
  // failed fetch) the pickers behave exactly as they did before this setting
  // existed, rather than falling back to some arbitrary order.
  componentMode: DEFAULT_COMPONENT_SORT_MODE,
  componentReversed: false,
  elementMode: DEFAULT_ELEMENT_SORT_MODE,
  elementReversed: false,
  sortComponents: compareSignatureComponentsBy(DEFAULT_COMPONENT_SORT_MODE, false),
  sortElements: compareSignatureElementsBy(DEFAULT_ELEMENT_SORT_MODE, false),
  refresh: async () => {},
});

const SORT_KEYS = [
  AppConfigKeys.COMPONENT_SORT_MODE,
  AppConfigKeys.COMPONENT_SORT_REVERSED,
  AppConfigKeys.ELEMENT_SORT_MODE,
  AppConfigKeys.ELEMENT_SORT_REVERSED,
] as const satisfies readonly AppConfigKeys[];

export const SignatureSortProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [componentMode, setComponentMode] = useState<ComponentSortMode>(DEFAULT_COMPONENT_SORT_MODE);
  const [componentReversed, setComponentReversed] = useState(false);
  const [elementMode, setElementMode] = useState<ElementSortMode>(DEFAULT_ELEMENT_SORT_MODE);
  const [elementReversed, setElementReversed] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) {
      setComponentMode(DEFAULT_COMPONENT_SORT_MODE);
      setComponentReversed(false);
      setElementMode(DEFAULT_ELEMENT_SORT_MODE);
      setElementReversed(false);
      return;
    }
    // One key failing must not discard the others, so each is read separately
    // and anything unusable falls back to the default.
    const results = await Promise.all(
      SORT_KEYS.map(async key => {
        try {
          const response = await api.getConfig(key, token);
          return { key, value: response[key], ok: true as const };
        } catch (err) {
          console.error(`Failed to load signature sorting setting "${key}":`, err);
          return { key, value: null, ok: false as const };
        }
      }),
    );
    for (const { key, value, ok } of results) {
      if (!ok) continue;
      switch (key) {
        case AppConfigKeys.COMPONENT_SORT_MODE:
          if (isComponentSortMode(value)) setComponentMode(value);
          break;
        case AppConfigKeys.ELEMENT_SORT_MODE:
          if (isElementSortMode(value)) setElementMode(value);
          break;
        case AppConfigKeys.COMPONENT_SORT_REVERSED:
          setComponentReversed(value === true);
          break;
        case AppConfigKeys.ELEMENT_SORT_REVERSED:
          setElementReversed(value === true);
          break;
      }
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<SignatureSortContextValue>(() => ({
    componentMode,
    componentReversed,
    elementMode,
    elementReversed,
    sortComponents: compareSignatureComponentsBy(componentMode, componentReversed),
    sortElements: compareSignatureElementsBy(elementMode, elementReversed),
    refresh,
  }), [componentMode, componentReversed, elementMode, elementReversed, refresh]);

  return <SignatureSortContext.Provider value={value}>{children}</SignatureSortContext.Provider>;
};

export const useSignatureSort = () => useContext(SignatureSortContext);
