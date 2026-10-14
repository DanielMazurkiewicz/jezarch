import {
  UI_ELEMENT_IDS,
  isUiElementId,
  type UiElementId,
} from '../../../backend/src/functionalities/config/models';
import type { AppTranslationKey } from '@/translations/models';

/**
 * Presentation metadata for every hideable UI element: which settings section
 * it belongs to and how it is labelled. Ids are typed as `UiElementId`, so a
 * typo here is a compile error rather than a checkbox that never appears.
 *
 * Labels intentionally reuse the same translation keys the elements use in
 * place, so the admin setting always reads exactly like the UI it controls.
 */
export interface UiElementMeta {
  id: UiElementId;
  labelKey: AppTranslationKey;
}

export interface UiElementGroup {
  /** Translation key for the group heading. */
  titleKey: AppTranslationKey;
  items: UiElementMeta[];
}

export const UI_ELEMENT_GROUPS: readonly UiElementGroup[] = [
  {
    titleKey: 'uiVisibilityGroupSignatures',
    items: [
      { id: 'signatures.newComponentButton', labelKey: 'newComponentButton' },
      { id: 'signatures.newTreeButton', labelKey: 'newTreeButton' },
    ],
  },
  {
    titleKey: 'uiVisibilityGroupArchiveTabs',
    items: [
      { id: 'archive.tab.units', labelKey: 'archiveTabUnits' },
      { id: 'archive.tab.unitsAndMainDocs', labelKey: 'archiveTabUnitsAndMainDocs' },
      { id: 'archive.tab.mainDocs', labelKey: 'archiveTabMainDocs' },
      { id: 'archive.tab.everything', labelKey: 'archiveTabEverything' },
    ],
  },
];

/** Every registered element id, flattened. Mirrors the backend registry. */
export const REGISTERED_UI_ELEMENT_IDS: readonly UiElementId[] =
  UI_ELEMENT_GROUPS.flatMap(group => group.items.map(item => item.id));

/**
 * Defensive parse of the value coming from the API. Anything unexpected is
 * dropped rather than surfaced: hiding UI is cosmetic, so a bad response must
 * never crash a page or hide controls the admin did not choose to hide.
 */
export function parseHiddenList(value: unknown): UiElementId[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isUiElementId);
}

export function toggleHiddenElement(
  hidden: readonly UiElementId[],
  id: UiElementId,
): UiElementId[] {
  return hidden.includes(id) ? hidden.filter(x => x !== id) : [...hidden, id];
}
